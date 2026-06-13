import { NextResponse } from 'next/server'
import { issueCode, peekActiveCode, isValidContact, normalizeContact } from '@/lib/otp'
import { sendVerificationEmail } from '@/lib/email'
import { sendPhoneCode } from '@/lib/sms'
import { guardSendCode, clientIp } from '@/lib/ratelimit'
import { verifyTurnstile } from '@/lib/turnstile'

export const runtime = 'nodejs'

/**
 * POST { channel, contact, via?, captchaToken? } → отправляет код.
 *  - channel: 'email' | 'phone'
 *  - via (только phone): 'tg' (по умолчанию — код в Telegram) | 'sms' (кнопка «Получить по SMS»)
 *
 * Две ветки:
 *  1) СВЕЖАЯ выдача (активного кода ещё нет): капча + кулдаун + новый код. Телефон → Telegram.
 *  2) ПОВТОР существующего кода (активный код есть: «Отправить заново» / «Получить по SMS»):
 *     тот же код другим/тем же каналом, БЕЗ капчи и кулдауна (юзер их уже прошёл),
 *     но под лимитами IP/контакта (guardSendCode).
 */
export async function POST(req: Request) {
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
  // Канал доставки: email → email; phone → Telegram по умолчанию, SMS по кнопке.
  const deliverVia: 'tg' | 'sms' | 'email' =
    channel === 'email' ? 'email' : body.via === 'sms' ? 'sms' : 'tg'

  const rateLimited = () => {
    const guard = guardSendCode({ ip, contact, channel })
    if (guard.ok) return null
    return NextResponse.json(
      { ok: false, error: 'rate_limited', retryAfterSec: guard.retryAfterSec },
      { status: 429, headers: { 'retry-after': String(guard.retryAfterSec) } },
    )
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

  // === Ветка 2: повтор существующего кода (без капчи/кулдауна). ===
  const active = peekActiveCode(contact)
  if (active) {
    const limited = rateLimited()
    if (limited) return limited
    const failed = await deliver(active)
    if (failed) return failed
    return NextResponse.json({ ok: true, contact, via: deliverVia })
  }

  // Если просили SMS, а активного кода нет (истёк) — просим начать заново.
  if (channel === 'phone' && body.via === 'sms') {
    return NextResponse.json({ ok: false, error: 'expired' }, { status: 410 })
  }

  // === Ветка 1: свежая выдача — капча + кулдаун + новый код. ===
  if (!(await verifyTurnstile(body.captchaToken, ip))) {
    return NextResponse.json({ ok: false, error: 'captcha_failed' }, { status: 403 })
  }

  const limited = rateLimited()
  if (limited) return limited

  const issued = issueCode(contact)
  if (!issued.ok) {
    return NextResponse.json(
      { ok: false, error: 'cooldown', retryAfterSec: issued.retryAfterSec },
      { status: 429 },
    )
  }

  const failed = await deliver(issued.code)
  if (failed) return failed
  return NextResponse.json({ ok: true, contact, via: deliverVia })
}
