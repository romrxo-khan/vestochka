import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { botAuthorized } from '@/lib/bot-auth'

export const runtime = 'nodejs'

/**
 * Состояние «запроса на рост сервера» (аппрув владельцем кнопкой в боте).
 *  GET  (x-bot-token) → { pending, approved } — автоскейлер читает.
 *  POST (x-bot-token) { action:'request'|'clear', key } — автоскейлер ставит/снимает запрос.
 * Сам аппрув ставит подписанная ссылка из кнопки → /api/provision/scale-approve.
 */
export async function GET(req: Request) {
  if (!botAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 })
  const db = getDb()
  return NextResponse.json({
    ok: true,
    pending: db.kvGet('scale_pending') ?? '',
    approved: db.kvGet('scale_approved') ?? '',
  })
}

export async function POST(req: Request) {
  if (!botAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 })
  const b = (await req.json().catch(() => ({}))) as { action?: string; key?: string }
  const db = getDb()
  if (b.action === 'request' && b.key) {
    db.kvSet('scale_pending', b.key)
    db.kvSet('scale_approved', '')
  } else if (b.action === 'clear') {
    db.kvSet('scale_pending', '')
    db.kvSet('scale_approved', '')
  }
  return NextResponse.json({ ok: true })
}
