import { NextRequest, NextResponse } from 'next/server'
import { issueCode, cooldownLeft, isValidContact, normalizeContact } from '@/lib/otp'
import { sendVerificationEmail } from '@/lib/email'
import { sendPhoneCode } from '@/lib/sms'
import { guardSendCode, clientIp } from '@/lib/ratelimit'
import { verifyTurnstile } from '@/lib/turnstile'
import { REG_COOKIE, signSession, verifySession } from '@/lib/reg-session'

export const runtime = 'nodejs'

/**
 * POST { channel, contact, via?, captchaToken? } → отправляет код.
 *
 * Две ветки, выбор по наличию валидной reg-сессии (куки) на этот контакт:
 *  • СВЕЖАЯ выдача (сессии нет): капча + кулдаун(60с). Телефон → всегда Telegram; via=sms тут
 *    игнорируется, чтобы эндпоинт не стал оракулом регистрации. Ставим reg-куку.
 *  • ПОВТОР (сессия есть — «Отправить заново»/«Получить по SMS»): без капчи, кулдаун повтора
 *    (15с, первый повтор сразу). Новый код, доставка выбранным каналом (tg/sms/email).
 *
 * Каждый успешный ответ — одинаковой формы {ok:true}, без раскрытия деталей доставки.
 */
export async function POST(req: NextRequest) {
  let body: { channel?: string; contact?: string; via?: string; captchaToken?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  const channel = body.channel === 'phone' ? 'phone' : body.channel === 'email' ? 'email' : null
  if (!channel || !body.contact) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
  }

  const contact = normalizeContact(channel, body.contact)
  if (!isValidContact(channel, contact)) {
    const error = channel === 'phone' ? 'phone_not_ru' : 'invalid_contact'
    return NextResponse.json({ ok: false, error }, { status: 400 })
  }

  const ip = clientIp(req)
  const isResend = verifySession(req.cookies.get(REG_COOKIE)?.value, contact)

  // Канал доставки. На свежей выдаче via=sms НЕ даём (SMS — только повтор по кнопке).
  const deliverVia: 'tg' | 'sms' | 'email' =
    channel === 'email' ? 'email' : isResend && body.via === 'sms' ? 'sms' : 'tg'

  const tooMany = () => {
    const guard = guardSendCode({ ip, contact, channel })
    if (guard.ok) return null
    return NextResponse.json(
      { ok: false, error: 'rate_limited', retryAfterSec: guard.retryAfterSec },
      { status: 429, headers: { 'retry-after': String(guard.retryAfterSec) } },
    )
  }

  const onCooldown = (kind: 'fresh' | 'resend') => {
    const left = cooldownLeft(contact, kind)
    if (left <= 0) return null
    return NextResponse.json({ ok: false, error: 'cooldown', retryAfterSec: left }, { status: 429 })
  }

  async function deliver(code: string): Promise<NextResponse | null> {
    try {
      if (deliverVia === 'email') {
        await sendVerificationEmail(contact, code)
      } else {
        const r = await sendPhoneCode(contact, code, deliverVia)
        if (!r.ok) {
          const error = deliverVia === 'sms' ? 'sms_failed' : 'tg_failed'
          return NextResponse.json({ ok: false, error }, { status: 502 })
        }
      }
    } catch (e) {
      console.error('[send-code] отправка не удалась:', e)
      return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 502 })
    }
    return null
  }

  const ok = () => {
    const res = NextResponse.json({ ok: true, contact, via: deliverVia })
    // Обновляем/ставим reg-сессию (привязка повторов к этому браузеру).
    res.cookies.set(REG_COOKIE, signSession(contact), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60,
    })
    return res
  }

  // === ПОВТОР (есть валидная сессия): без капчи, но с кулдауном повтора. ===
  if (isResend) {
    return (
      tooMany() ?? onCooldown('resend') ?? (await deliver(issueCode(contact, 'resend'))) ?? ok()
    )
  }

  // === СВЕЖАЯ выдача: капча обязательна (закрывает и оракул, и обход капчи). ===
  if (!(await verifyTurnstile(body.captchaToken, ip))) {
    return NextResponse.json({ ok: false, error: 'captcha_failed' }, { status: 403 })
  }
  return tooMany() ?? onCooldown('fresh') ?? (await deliver(issueCode(contact, 'fresh'))) ?? ok()
}
