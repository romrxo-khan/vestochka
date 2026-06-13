import { NextResponse } from 'next/server'
import { getStripe, stripeConfigured } from '@/lib/stripe'
import { getDb } from '@/lib/control-db'

export const runtime = 'nodejs'

/**
 * POST { sessionId, phone } → привязывает MAX-номер к аккаунту (анти-абуз триала).
 * Пользователь определяется по Stripe-сессии (client_reference_id), не из тела — чтобы нельзя
 * было записать номер на чужой аккаунт. Если номер уже на другом аккаунте → 409.
 */
export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }
  let body: { sessionId?: string; phone?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }
  if (!body.sessionId || !body.phone) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
  }

  let userId: number | null = null
  try {
    const session = await getStripe().checkout.sessions.retrieve(body.sessionId)
    const ref = session.client_reference_id ?? session.metadata?.app_user_id
    userId = ref ? Number(ref) : null
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_session' }, { status: 401 })
  }
  if (!userId) return NextResponse.json({ ok: false, error: 'no_user' }, { status: 401 })

  const result = getDb().claimMaxPhone(userId, body.phone)
  if (result.ok) return NextResponse.json({ ok: true })
  return NextResponse.json(
    { ok: false, error: result.reason },
    { status: result.reason === 'taken' ? 409 : 400 },
  )
}
