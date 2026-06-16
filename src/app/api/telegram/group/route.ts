import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { botAuthorized } from '@/lib/bot-auth'

export const runtime = 'nodejs'

/**
 * POST { tgUserId, groupId, title?, status, canManageTopics } (x-bot-token).
 * Бот сообщает, что его статус в группе изменился. Сопоставляем добавившего с
 * аккаунтом (по tg_user_id) и сохраняем группу. status 'left'/'kicked' → отвязка.
 */
export async function POST(req: Request) {
  if (!botAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  let body: {
    tgUserId?: number
    groupId?: number | string
    title?: string
    status?: string
    canManageTopics?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }
  if (!body.tgUserId) return NextResponse.json({ ok: false, error: 'no_user' }, { status: 400 })

  const db = getDb()
  const user = db.byTelegram(Number(body.tgUserId))
  // Кто добавил бота не привязан к аккаунту — игнорируем молча (не наш кейс).
  if (!user) return NextResponse.json({ ok: true, matched: false })

  const removed = body.status === 'left' || body.status === 'kicked'
  if (removed || !body.groupId) {
    db.setGroup(user.id, null, null, false)
    return NextResponse.json({ ok: true, matched: true })
  }
  const r = db.setGroup(user.id, String(body.groupId), body.title ?? null, Boolean(body.canManageTopics))
  // conflict=true → группа уже за другим аккаунтом; роутер сообщит об этом в группу.
  return NextResponse.json({ ok: true, matched: true, conflict: Boolean(r.conflict) })
}
