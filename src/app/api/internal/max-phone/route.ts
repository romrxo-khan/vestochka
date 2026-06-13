import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getDb } from '@/lib/control-db'

export const runtime = 'nodejs'

/** constant-time сравнение с внутренним токеном (онбординг/провижининг вызывает этот роут). */
function authorized(req: Request): boolean {
  const expected = process.env.INTERNAL_TOKEN ?? process.env.ADMIN_TOKEN
  const got = req.headers.get('x-internal-token') ?? ''
  if (!expected) return false
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * POST { userId, phone } → привязывает MAX-номер к аккаунту (анти-абуз триала).
 * Если номер уже на другом аккаунте → 409 с сообщением для пользователя.
 * Вызывается на шаге входа в MAX (онбординг), не публичный.
 */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  let body: { userId?: number; phone?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }
  if (!body.userId || !body.phone) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
  }

  const result = getDb().claimMaxPhone(Number(body.userId), body.phone)
  if (result.ok) return NextResponse.json({ ok: true, phone: result.phone })

  if (result.reason === 'taken') {
    return NextResponse.json(
      {
        ok: false,
        error: 'taken',
        message: 'Этот номер MAX уже используется в другом аккаунте Весточки.',
      },
      { status: 409 },
    )
  }
  return NextResponse.json({ ok: false, error: 'invalid', message: 'Неверный номер.' }, { status: 400 })
}
