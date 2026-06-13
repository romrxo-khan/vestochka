import { NextResponse } from 'next/server'
import { verifyLavaWebhook } from '@/lib/lava'
import { getDb, type User } from '@/lib/control-db'

export const runtime = 'nodejs'

interface LavaEvent {
  eventType?: string
  status?: string
  contractId?: string
  parentContractId?: string
  buyer?: { email?: string }
}

const plus30d = () => new Date(Date.now() + 30 * 86_400_000).toISOString()

/** Webhook Lava.top. Basic-auth, затем обновляем статус оплаты. */
export async function POST(req: Request) {
  if (!verifyLavaWebhook(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  let e: LavaEvent
  try {
    e = (await req.json()) as LavaEvent
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  const db = getDb()
  // Сопоставляем пользователя: по контракту (надёжно) или по почте покупателя.
  let user: User | undefined
  const cid = e.parentContractId ?? e.contractId
  if (cid) user = db.byProviderSubscription(cid)
  if (!user && e.buyer?.email) user = db.byEmailOrPhone(e.buyer.email.trim().toLowerCase())
  if (!user) return NextResponse.json({ ok: true }) // нечего обновлять — подтверждаем приём

  const type = e.eventType ?? ''
  const status = e.status ?? ''

  try {
    if (type === 'payment.success' || type === 'subscription.recurring.payment.success') {
      if (status === 'completed' || status === 'subscription-active' || type.includes('recurring')) {
        db.markFirstPaid(user.id)
        db.setPayment(user.id, {
          payment_provider: 'lava',
          payment_status: 'active',
          status: 'active',
          current_period_end: plus30d(),
          provider_subscription_id: e.contractId ?? cid,
        })
      }
    } else if (type === 'payment.failed' || status === 'failed' || status === 'subscription-failed') {
      db.setPayment(user.id, { payment_status: 'past_due' })
    } else if (type.includes('cancel') || status.includes('cancel')) {
      db.markCancelled(user.id)
    }
  } catch (err) {
    console.error('[lava/webhook] обработка не удалась:', type, err)
    return NextResponse.json({ ok: false }, { status: 500 }) // Lava повторит
  }

  return NextResponse.json({ ok: true })
}
