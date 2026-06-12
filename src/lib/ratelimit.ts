/**
 * Антиспам/антискрутка для отправки кодов. Каждый SMS стоит денег, поэтому защита
 * многослойная — не только кулдаун на номер:
 *
 *   1) на КОНТАКТ: кулдаун (в otp.ts) + суточный лимит отправок;
 *   2) на IP: почасовой и суточный лимит — ловит перебор разных номеров с одного источника;
 *   3) ГЛОБАЛЬНЫЙ суточный потолок на канал (SMS/email) — жёсткий предохранитель трат:
 *      сколько бы ни ломились, больше N кодов в сутки система не отправит (fail-closed).
 *
 * Хранилище — in-memory, fixed-window, закэшировано на globalThis (один процесс `next start`).
 * Для нескольких инстансов позже заменить на Redis — интерфейс останется тем же.
 * ⚠️ Лимиты сбрасываются при редеплое; редеплой атакующий вызвать не может, для MVP ок.
 */

interface Window {
  count: number
  resetAt: number
}

const buckets: Map<string, Window> =
  (globalThis as unknown as { __rlBuckets?: Map<string, Window> }).__rlBuckets ??
  ((globalThis as unknown as { __rlBuckets?: Map<string, Window> }).__rlBuckets = new Map())

function n(name: string, def: number): number {
  const v = Number(process.env[name])
  return Number.isFinite(v) && v > 0 ? v : def
}

const LIMITS = {
  ipPerHour: n('RL_IP_PER_HOUR', 5),
  ipPerDay: n('RL_IP_PER_DAY', 30),
  contactPerDay: n('RL_CONTACT_PER_DAY', 5),
  smsGlobalPerDay: n('RL_SMS_GLOBAL_PER_DAY', 300), // жёсткий потолок трат на SMS/сутки
  emailGlobalPerDay: n('RL_EMAIL_GLOBAL_PER_DAY', 1000),
}

const HOUR = 3_600_000
const DAY = 86_400_000

/** Заглядывает в окно, не увеличивая счётчик. */
function peek(key: string, limit: number): { ok: boolean; retryAfterSec: number } {
  const b = buckets.get(key)
  const now = Date.now()
  if (!b || now >= b.resetAt) return { ok: true, retryAfterSec: 0 }
  if (b.count < limit) return { ok: true, retryAfterSec: 0 }
  return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
}

/** Увеличивает счётчик окна. */
function bump(key: string, windowMs: number): void {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now >= b.resetAt) buckets.set(key, { count: 1, resetAt: now + windowMs })
  else b.count++
}

export type GuardResult = { ok: true } | { ok: false; retryAfterSec: number }

/**
 * Проверяет ВСЕ лимиты перед отправкой и, если всё ок, списывает счётчики.
 * Возвращает первый сработавший лимит (без раскрытия какой именно — наружу только retryAfterSec).
 */
export function guardSendCode(params: {
  ip: string
  contact: string
  channel: 'email' | 'phone'
}): GuardResult {
  const { ip, contact, channel } = params
  const globalKey = channel === 'phone' ? 'global:sms' : 'global:email'
  const globalLimit = channel === 'phone' ? LIMITS.smsGlobalPerDay : LIMITS.emailGlobalPerDay

  const checks: Array<{ key: string; limit: number; window: number }> = [
    { key: `ipH:${ip}`, limit: LIMITS.ipPerHour, window: HOUR },
    { key: `ipD:${ip}`, limit: LIMITS.ipPerDay, window: DAY },
    { key: `c:${contact}`, limit: LIMITS.contactPerDay, window: DAY },
    { key: globalKey, limit: globalLimit, window: DAY },
  ]

  // 1) Сначала только проверяем — чтобы не списать один счётчик, когда падает другой.
  for (const c of checks) {
    const r = peek(c.key, c.limit)
    if (!r.ok) {
      if (c.key === globalKey) {
        console.error(`[ratelimit] ГЛОБАЛЬНЫЙ потолок ${globalKey} достигнут — отправка кодов остановлена`)
      }
      return { ok: false, retryAfterSec: r.retryAfterSec }
    }
  }
  // 2) Всё ок — списываем все окна.
  for (const c of checks) bump(c.key, c.window)
  return { ok: true }
}

/** Достаёт IP клиента за Cloudflare/Traefik (иначе всё схлопнется в один ключ). */
export function clientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
