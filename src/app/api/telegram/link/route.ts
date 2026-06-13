import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getDb } from '@/lib/control-db'
import { verifyLinkToken } from '@/lib/link-token'

export const runtime = 'nodejs'

/** Бот аутентифицируется общим секретом (он на сервере, не публичный). */
function authorized(req: Request): boolean {
  const expected = process.env.BOT_API_TOKEN ?? process.env.INTERNAL_TOKEN
  const got = req.headers.get('x-bot-token') ?? ''
  if (!expected) return false
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * POST { token, tgUserId, tgUsername? } — бот зовёт при /start <token>.
 * Проверяем подпись токена (HMAC от user_id) → связываем Telegram с аккаунтом.
 */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  let body: { token?: string; tgUserId?: number; tgUsername?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }
  const userId = verifyLinkToken(body.token)
  if (!userId || !body.tgUserId) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 })
  }
  const r = getDb().linkTelegram(userId, Number(body.tgUserId), body.tgUsername)
  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: r.reason, message: 'Этот Telegram уже привязан к другому аккаунту.' },
      { status: 409 },
    )
  }
  return NextResponse.json({ ok: true })
}
