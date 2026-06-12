import { NextResponse } from 'next/server'
import { verifyCode, isValidContact, normalizeContact } from '@/lib/otp'

export const runtime = 'nodejs'

/** POST { channel, contact, code } → проверяет код. На успехе здесь позже создаём аккаунт. */
export async function POST(req: Request) {
  let body: { channel?: string; contact?: string; code?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  const channel = body.channel === 'phone' ? 'phone' : body.channel === 'email' ? 'email' : null
  if (!channel || !body.contact || !body.code) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
  }

  const contact = normalizeContact(channel, body.contact)
  if (!isValidContact(channel, contact)) {
    return NextResponse.json({ ok: false, error: 'invalid_contact' }, { status: 400 })
  }

  const result = verifyCode(contact, body.code.trim())
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 401 })
  }

  // TODO (следующий шаг): создать пользователя в control-plane (createUser + триал),
  // выдать ссылку t.me/<bot>?start=<token> и/или сессию. Пока — подтверждаем контакт.
  return NextResponse.json({ ok: true, contact, channel })
}
