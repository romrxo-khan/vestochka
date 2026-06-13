import { NextResponse } from 'next/server'
import { verifyCode, isValidContact, normalizeContact } from '@/lib/otp'
import { registerUser } from '@/lib/control-plane'
import { REG_COOKIE, signSession } from '@/lib/reg-session'

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

  // Контакт подтверждён → создаём пользователя в control-plane и стартуем недельный триал.
  // Best-effort: сбой control-plane не блокирует подтверждение (логируем для ретрая позже).
  const reg = await registerUser(channel === 'email' ? { email: contact } : { phone: contact })
  if (!reg.ok) {
    console.error('[verify-code] регистрация в control-plane не удалась:', reg.error)
  }

  const res = NextResponse.json({
    ok: true,
    contact,
    channel,
    trial: reg.ok ? { daysRemaining: reg.daysRemaining, isNew: reg.isNew } : null,
  })
  // Подтверждённый контакт = сессия для шага оплаты (checkout требует эту куку).
  res.cookies.set(REG_COOKIE, signSession(contact), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 15 * 60,
  })
  return res
}
