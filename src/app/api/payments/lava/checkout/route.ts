import { NextRequest, NextResponse } from 'next/server'
import { createLavaInvoice, lavaConfigured, lavaOffer } from '@/lib/lava'
import { getDb } from '@/lib/control-db'
import { REG_COOKIE, verifySession } from '@/lib/reg-session'

export const runtime = 'nodejs'

/** POST { email, plan? } → создаёт счёт Lava (подписка) и возвращает ссылку на оплату. */
export async function POST(req: NextRequest) {
  if (!lavaConfigured()) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }
  let body: { email?: string; plan?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }
  const email = body.email?.trim().toLowerCase()
  if (!email) return NextResponse.json({ ok: false, error: 'missing_email' }, { status: 400 })
  // Доступ только владельцу подтверждённой почты (кука verify-code).
  if (!verifySession(req.cookies.get(REG_COOKIE)?.value, email)) {
    return NextResponse.json({ ok: false, error: 'unverified' }, { status: 401 })
  }
  const plan = body.plan === 'personal' ? 'personal' : 'shared'
  const offerId = lavaOffer(plan)
  if (!offerId) return NextResponse.json({ ok: false, error: 'no_offer' }, { status: 500 })

  const inv = await createLavaInvoice(email, offerId, 'MONTHLY')
  if (!inv.ok || !inv.url) {
    console.error('[lava/checkout] не создан счёт:', inv.error)
    return NextResponse.json({ ok: false, error: 'checkout_failed' }, { status: 502 })
  }

  // Связываем контракт с пользователем (почта подтверждена выше) — webhook найдёт по contractId.
  // Не затираем активную привязку к ДРУГОМУ провайдеру (например уже оплаченный Stripe).
  const user = getDb().byEmailOrPhone(email)
  const otherActive =
    user && user.payment_status === 'active' && user.payment_provider && user.payment_provider !== 'lava'
  if (user && inv.contractId && !otherActive) {
    getDb().setPayment(user.id, { payment_provider: 'lava', provider_subscription_id: inv.contractId })
  }

  return NextResponse.json({ ok: true, url: inv.url })
}
