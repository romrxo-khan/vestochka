import { NextResponse } from 'next/server'
import { verifyLavaWebhook } from '@/lib/lava'
import { getDb } from '@/lib/control-db'

export const runtime = 'nodejs'

interface LavaEvent {
  eventType?: string
  status?: string
  contractId?: string
  parentContractId?: string
  timestamp?: string
}

const plus30d = () => new Date(Date.now() + 30 * 86_400_000).toISOString()

/** Webhook Lava.top. Basic-auth → идемпотентность → маппинг ТОЛЬКО по серверному контракту. */
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
  // Корневой контракт подписки сохранён при АУТЕНТИФИЦИРОВАННОМ checkout — только по нему
  // и сопоставляем. buyer.email НЕ используем (он задаётся плательщиком и не доверенный).
  const root = e.parentContractId ?? e.contractId
  if (!root) return NextResponse.json({ ok: true })
  const user = db.byProviderSubscription(root)
  if (!user) return NextResponse.json({ ok: true }) // неизвестный контракт — подтверждаем приём

  // Идемпотентность: одно и то же событие не обрабатываем дважды (защита от повторов).
  const key = `lava:${root}:${e.eventType ?? ''}:${e.timestamp ?? ''}`
  if (!db.claimWebhookEvent(key)) return NextResponse.json({ ok: true })

  const type = e.eventType ?? ''
  const status = e.status ?? ''
  try {
    if (type === 'payment.success' || type === 'subscription.recurring.payment.success') {
      if (status === 'completed' || status === 'subscription-active' || type.includes('recurring')) {
        // Активируем (+ флаг восстановления профиля, если был suspended). Корневой контракт не трогаем.
        db.activateSubscription(user.id, plus30d(), 'lava')
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
