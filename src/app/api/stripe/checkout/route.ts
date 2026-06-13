import { NextResponse } from 'next/server'
import { getStripe, stripeConfigured, priceForPlan } from '@/lib/stripe'
import { getDb } from '@/lib/control-db'

export const runtime = 'nodejs'

/**
 * POST { email, plan? } → создаёт Stripe Checkout (подписка, триал 7 дней) и возвращает URL.
 * Карту вводит сам Stripe (PCI на их стороне). После — редирект на /payment/success.
 */
export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ ok: false, error: 'stripe_not_configured' }, { status: 503 })
  }
  let body: { email?: string; plan?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) return NextResponse.json({ ok: false, error: 'missing_email' }, { status: 400 })
  const plan = body.plan === 'personal' ? 'personal' : 'shared'
  const price = priceForPlan(plan)
  if (!price) return NextResponse.json({ ok: false, error: 'no_price' }, { status: 500 })

  // Пользователь уже создан на verify-code; берём его id для связи с подпиской.
  const user = getDb().byEmailOrPhone(email)

  // ПУБЛИЧНЫЙ origin: за Cloudflare/Traefik req.url видит внутренний localhost — нельзя.
  // Берём из SITE_URL, иначе из x-forwarded-* заголовков, иначе как fallback.
  const fwdHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const fwdProto = req.headers.get('x-forwarded-proto') ?? 'https'
  const origin =
    process.env.SITE_URL?.replace(/\/$/, '') ??
    (fwdHost ? `${fwdProto}://${fwdHost}` : new URL(req.url).origin)

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      subscription_data: { trial_period_days: 7 },
      customer_email: email,
      client_reference_id: user ? String(user.id) : undefined,
      metadata: { plan, app_user_id: user ? String(user.id) : '' },
      allow_promotion_codes: true,
      success_url: `${origin}/payment/success`,
      cancel_url: `${origin}/payment/fail`,
    })
    return NextResponse.json({ ok: true, url: session.url })
  } catch (e) {
    console.error('[stripe/checkout] ошибка:', e)
    return NextResponse.json({ ok: false, error: 'checkout_failed' }, { status: 502 })
  }
}
