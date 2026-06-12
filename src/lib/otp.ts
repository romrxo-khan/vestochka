/**
 * Одноразовые коды (OTP) для регистрации/входа по email или телефону.
 *
 * Хранилище — in-memory с TTL, закэшировано на globalThis (переживает hot-reload в dev
 * и живёт в одном процессе `next start`). Храним ХЭШ кода, не сам код. Лимит попыток и
 * кулдаун на повторную отправку — защита от подбора и спама.
 *
 * Для нескольких инстансов сайта позже заменим Map на общий стор (Redis/таблицу) — интерфейс
 * (issueCode/verifyCode) останется тем же.
 */
import crypto from 'node:crypto'

const TTL_MS = 10 * 60_000 // код живёт 10 минут
const RESEND_COOLDOWN_MS = 60_000 // не чаще раза в минуту
const MAX_ATTEMPTS = 5
const SECRET = process.env.OTP_SECRET ?? 'dev-otp-secret-change-me'

interface Entry {
  hash: string
  expiresAt: number
  attempts: number
  lastSentAt: number
}

const store: Map<string, Entry> =
  (globalThis as unknown as { __otpStore?: Map<string, Entry> }).__otpStore ??
  ((globalThis as unknown as { __otpStore?: Map<string, Entry> }).__otpStore = new Map())

function hashCode(contact: string, code: string): string {
  return crypto.createHmac('sha256', SECRET).update(`${contact}:${code}`).digest('hex')
}

/** Нормализует контакт, чтобы ключ был стабильным. */
export function normalizeContact(channel: 'email' | 'phone', raw: string): string {
  if (channel === 'email') return raw.trim().toLowerCase()
  // телефон → E.164 РФ. Приводим частые формы ввода к +7XXXXXXXXXX:
  let d = raw.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1) // 8XXXXXXXXXX → 7XXXXXXXXXX
  if (d.length === 10 && d.startsWith('9')) d = '7' + d // 9XXXXXXXXX (без кода страны) → 7…
  return '+' + d
}

/**
 * Телефон принимаем ТОЛЬКО российский мобильный: +7 9XX XXX-XX-XX.
 * Это и аудитория сервиса, и защита от SMS-pumping на дорогие зарубежные номера.
 * `+79` отсекает заодно Казахстан (+77), который тоже в зоне +7.
 * Иностранные пользователи регистрируются по email.
 */
export function isValidContact(channel: 'email' | 'phone', value: string): boolean {
  if (channel === 'email') return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
  return /^\+79\d{9}$/.test(value)
}

export type IssueResult =
  | { ok: true; code: string }
  | { ok: false; reason: 'cooldown'; retryAfterSec: number }

/** Выдаёт новый код (или отказывает, если кулдаун). Код возвращается, чтобы отправить его. */
export function issueCode(contact: string): IssueResult {
  const now = Date.now()
  const existing = store.get(contact)
  if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    return {
      ok: false,
      reason: 'cooldown',
      retryAfterSec: Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000),
    }
  }
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  store.set(contact, { hash: hashCode(contact, code), expiresAt: now + TTL_MS, attempts: 0, lastSentAt: now })
  return { ok: true, code }
}

export type VerifyResult = { ok: true } | { ok: false; reason: 'expired' | 'mismatch' | 'too_many' }

export function verifyCode(contact: string, code: string): VerifyResult {
  const e = store.get(contact)
  if (!e || Date.now() > e.expiresAt) {
    store.delete(contact)
    return { ok: false, reason: 'expired' }
  }
  if (e.attempts >= MAX_ATTEMPTS) {
    store.delete(contact)
    return { ok: false, reason: 'too_many' }
  }
  e.attempts++
  if (hashCode(contact, code) !== e.hash) return { ok: false, reason: 'mismatch' }
  store.delete(contact) // одноразовый
  return { ok: true }
}
