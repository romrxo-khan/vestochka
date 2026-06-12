import { NextResponse } from 'next/server'
import { issueCode, isValidContact, normalizeContact } from '@/lib/otp'
import { sendVerificationEmail } from '@/lib/email'
import { sendVerificationSms } from '@/lib/sms'
import { guardSendCode, clientIp } from '@/lib/ratelimit'

export const runtime = 'nodejs'

/** POST { channel: 'email'|'phone', contact: string } → отправляет код подтверждения. */
export async function POST(req: Request) {
  let body: { channel?: string; contact?: string }
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
    // Телефон принимаем только РФ-мобильный; иностранцам подсказываем путь через почту.
    const error = channel === 'phone' ? 'phone_not_ru' : 'invalid_contact'
    return NextResponse.json({ ok: false, error }, { status: 400 })
  }

  // Антиспам/антискрутка: лимиты по IP, по контакту и глобальный потолок трат.
  const guard = guardSendCode({ ip: clientIp(req), contact, channel })
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', retryAfterSec: guard.retryAfterSec },
      { status: 429, headers: { 'retry-after': String(guard.retryAfterSec) } },
    )
  }

  const issued = issueCode(contact)
  if (!issued.ok) {
    return NextResponse.json(
      { ok: false, error: 'cooldown', retryAfterSec: issued.retryAfterSec },
      { status: 429 },
    )
  }

  try {
    if (channel === 'email') {
      await sendVerificationEmail(contact, issued.code)
    } else {
      const r = await sendVerificationSms(contact, issued.code)
      if (!r.ok) {
        return NextResponse.json({ ok: false, error: 'sms_failed' }, { status: 502 })
      }
    }
  } catch (e) {
    console.error('[send-code] отправка не удалась:', e)
    return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 502 })
  }

  // Код наружу НЕ возвращаем. Клиент держит только нормализованный контакт.
  return NextResponse.json({ ok: true, contact })
}
