import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { getDb, type PaymentStatus, DUNNING_GRACE_DAYS } from '@/lib/control-db'
import { notifyPaymentFailed, notifyReactivated } from '@/lib/notify'

/** Был ли юзер в простое (past_due/suspended) — чтобы поприветствовать восстановление. */
function wasLapsed(u: { payment_status?: string; status?: string } | undefined): boolean {
  return u?.payment_status === 'past_due' || u?.status === 'suspended'
}

export const runtime = 'nodejs'

/** Unix-секунды → ISO, либо null. */
function iso(sec: number | null | undefined): string | null {
  return typeof sec === 'number' ? new Date(sec * 1000).toISOString() : null
}

/** current_period_end живёт по-разному в версиях API — берём из подписки или из её item. */
function periodEnd(sub: Stripe.Subscription): string | null {
  const s = sub as unknown as { current_period_end?: number }
  if (typeof s.current_period_end === 'number') return iso(s.current_period_end)
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined
  return iso(item?.current_period_end)
}

function mapStatus(s: Stripe.Subscription.Status): PaymentStatus {
  if (s === 'trialing') return 'trialing'
  if (s === 'active') return 'active'
  if (s === 'past_due' || s === 'unpaid') return 'past_due'
  return 'cancelled' // canceled / incomplete_expired / paused
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const sig = req.headers.get('stripe-signature')
  if (!secret || !sig) {
    return NextResponse.json({ ok: false, error: 'no_signature' }, { status: 400 })
  }

  const raw = await req.text() // СЫРОЕ тело — обязательно для проверки подписи
  let event: Stripe.Event
  try {
    event = await getStripe().webhooks.constructEventAsync(raw, sig, secret)
  } catch (e) {
    console.error('[stripe/webhook] подпись не прошла:', e)
    return NextResponse.json({ ok: false, error: 'bad_signature' }, { status: 400 })
  }

  const db = getDb()
  const stripe = getStripe()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = Number(session.client_reference_id || session.metadata?.app_user_id)
        const customerId = typeof session.customer === 'string' ? session.customer : null
        const subId = typeof session.subscription === 'string' ? session.subscription : null
        if (userId && customerId) {
          const before = db.byId(userId)
          db.setPayment(userId, { provider_customer_id: customerId, provider_subscription_id: subId })
          let end: string | null = null
          if (subId) end = periodEnd(await stripe.subscriptions.retrieve(subId))
          db.activateSubscription(userId, end, 'stripe') // оплачено сразу (триал у нас в БД)
          if (wasLapsed(before)) await notifyReactivated(db.byId(userId)!)
        }
        break
      }
      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice
        const customerId = typeof inv.customer === 'string' ? inv.customer : null
        const user = customerId ? db.byProviderCustomer(customerId) : undefined
        if (user && (inv.amount_paid ?? 0) > 0) {
          const lapsed = wasLapsed(user)
          db.activateSubscription(user.id, iso(inv.lines?.data?.[0]?.period?.end), 'stripe')
          if (lapsed) await notifyReactivated(db.byId(user.id)!)
        }
        break
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        const customerId = typeof inv.customer === 'string' ? inv.customer : null
        const user = customerId ? db.byProviderCustomer(customerId) : undefined
        if (user) {
          // past_due + ЗАПУСК grace-часов (иначе крон dunning юзера не подхватит) + сразу уведомить.
          const updated = db.startGrace(user.id, DUNNING_GRACE_DAYS)
          if (updated) await notifyPaymentFailed(updated, DUNNING_GRACE_DAYS)
        }
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : null
        const user = customerId ? db.byProviderCustomer(customerId) : undefined
        if (user) db.setPayment(user.id, { payment_status: mapStatus(sub.status), current_period_end: periodEnd(sub) })
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : null
        const user = customerId ? db.byProviderCustomer(customerId) : undefined
        if (user) db.markCancelled(user.id)
        break
      }
    }
  } catch (e) {
    console.error('[stripe/webhook] обработка не удалась:', event.type, e)
    return NextResponse.json({ ok: false }, { status: 500 }) // Stripe повторит
  }

  return NextResponse.json({ received: true })
}
