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
 * POST { email, tgUserId, tgUsername? } — бот привязывает Telegram по email (фолбэк,
 * когда диплинк не доносит /start). Безопасность — в linkByEmail: связываем только если
 * аккаунт недавно был активен в кабинете на шаге привязки (доказывает владение почтой).
 */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  let body: { email?: string; tgUserId?: number; tgUsername?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }
  const email = (body.email ?? '').trim()
  if (!email || !body.tgUserId) {
    return NextResponse.json({ ok: false, error: 'bad_args' }, { status: 400 })
  }
  const r = getDb().linkByEmail(email, Number(body.tgUserId), body.tgUsername)
  if (!r.ok) {
    const message =
      r.reason === 'no_account'
        ? 'Аккаунт с такой почтой не найден. Проверьте, что вводите почту регистрации на vestochka.uk.'
        : r.reason === 'not_pending'
          ? 'Сначала откройте кабинет на vestochka.uk/cabinet (шаг «Подключите Telegram»), затем пришлите почту сюда.'
          : r.reason === 'tg_taken'
            ? 'Этот Telegram уже привязан к другому аккаунту.'
            : 'Не удалось привязать. Попробуйте ещё раз.'
    return NextResponse.json({ ok: false, error: r.reason, message }, { status: 409 })
  }
  return NextResponse.json({ ok: true })
}
