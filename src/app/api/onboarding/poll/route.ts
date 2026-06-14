import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { botAuthorized } from '@/lib/bot-auth'

export const runtime = 'nodejs'

/**
 * GET ?userId=… (x-bot-token) — контейнер опрашивает: текущее состояние +
 * ожидающий ввод пользователя (забирается атомарно, чтобы не съесть дважды).
 */
export async function GET(req: Request) {
  if (!botAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  const userId = Number(new URL(req.url).searchParams.get('userId'))
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ ok: false, error: 'bad_user' }, { status: 400 })
  }
  const db = getDb()
  const row = db.onbGet(userId)
  if (!row) return NextResponse.json({ ok: true, state: 'IDLE', pending: null })
  const pending = db.onbTakeInput(userId) // забираем и очищаем
  return NextResponse.json({ ok: true, state: row.state, pending })
}
