import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getDb } from '@/lib/control-db'

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
 * POST { code, tgUserId, tgUsername? } — бот привязывает Telegram по одноразовому коду
 * из кабинета (фолбэк, когда диплинк не доносит /start). Код секретен и одноразовый —
 * захват чужого аккаунта невозможен (в отличие от привязки по email).
 */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  let body: { code?: string; tgUserId?: number; tgUsername?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }
  const code = (body.code ?? '').trim()
  if (!code || !body.tgUserId) {
    return NextResponse.json({ ok: false, error: 'bad_args' }, { status: 400 })
  }
  const r = getDb().linkByCode(code, Number(body.tgUserId), body.tgUsername)
  if (!r.ok) {
    const message =
      r.reason === 'no_code' || r.reason === 'bad_code'
        ? 'Код не найден. Скопируйте код из кабинета (шаг «Подключите Telegram») и пришлите его сюда.'
        : r.reason === 'expired'
          ? 'Код устарел. Откройте кабинет ещё раз — там будет свежий код.'
          : r.reason === 'tg_taken'
            ? 'Этот Telegram уже привязан к другому аккаунту.'
            : 'Не удалось привязать. Попробуйте ещё раз.'
    return NextResponse.json({ ok: false, error: r.reason, message }, { status: 409 })
  }
  return NextResponse.json({ ok: true })
}
