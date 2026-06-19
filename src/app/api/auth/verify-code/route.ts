import { NextResponse } from 'next/server'
import { verifyCode, isValidContact, normalizeContact } from '@/lib/otp'
import { registerUser } from '@/lib/control-plane'
import { getDb } from '@/lib/control-db'
import { REG_COOKIE, signSession } from '@/lib/reg-session'
import { maybeAlertCapacity } from '@/lib/capacity'

export const runtime = 'nodejs'

/** POST { channel, contact, code } → проверяет код. На успехе здесь позже создаём аккаунт. */
export async function POST(req: Request) {
  let body: { channel?: string; contact?: string; code?: string; referralCode?: string }
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

  const safe = contact.replace(/[\r\n\x00-\x1f\x7f]/g, '?')
  const result = verifyCode(contact, body.code.trim())
  if (!result.ok) {
    console.warn(`[verify-code] не прошёл: ${result.reason} (${safe})`)
    return NextResponse.json({ ok: false, error: result.reason }, { status: 401 })
  }
  console.log(`[verify-code] подтверждён: ${safe}`)

  // Контакт подтверждён → создаём пользователя в control-plane и стартуем недельный триал.
  // Best-effort: сбой control-plane не блокирует подтверждение (логируем для ретрая позже).
  const reg = await registerUser(channel === 'email' ? { email: contact } : { phone: contact })
  if (!reg.ok) {
    console.error('[verify-code] регистрация в control-plane не удалась:', reg.error)
  }

  // Реферальный код — только для НОВОГО аккаунта: приглашённому 2 недели, пригласившему +1.
  let referralApplied = false
  let trial = reg.ok ? { daysRemaining: reg.daysRemaining, isNew: reg.isNew } : null
  const refCode = body.referralCode?.trim()
  if (reg.ok && reg.isNew && reg.userId && refCode) {
    const r = getDb().applyReferral(reg.userId, refCode)
    referralApplied = r.ok
    if (r.ok) {
      const u = getDb().byId(reg.userId)
      if (u) trial = { daysRemaining: getDb().daysRemaining(u), isNew: reg.isNew }
    }
  }

  // Оплачена ли подписка — чтобы окно входа знало: возвращающегося НЕОПЛАЧЕННОГО
  // юзера вести на оплату, а не молча в кабинет.
  const fresh = reg.ok && reg.userId ? getDb().byId(reg.userId) : undefined
  const paid = fresh?.payment_status === 'active'

  // Новый подписчик занял место → проверим ёмкость и при пересечении порога алертим владельцу.
  if (reg.ok && reg.isNew) await maybeAlertCapacity()

  const res = NextResponse.json({ ok: true, contact, channel, trial, referralApplied, paid })
  // Подтверждённый контакт = сессия входа (passwordless). 30 дней.
  res.cookies.set(REG_COOKIE, signSession(contact), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })
  return res
}
