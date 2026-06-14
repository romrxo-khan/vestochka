import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { botAuthorized } from '@/lib/bot-auth'

export const runtime = 'nodejs'

/**
 * GET /api/telegram/route?groupId=<id> (x-bot-token).
 *
 * Центральный роутер (единственный поллер общего бота) спрашивает: входящее
 * сообщение из группы <groupId> — в чей MAX-агент его доставить? Возвращаем
 * { ok, userId, agentUrl }. Адрес агента — по конвенции docker-сети
 * `http://max-user-<id>:8090` (опц. колонка agent_url переопределяет на будущее
 * для нескольких боксов). Сайт — единственный источник правды о связке group→user.
 */
export async function GET(req: Request) {
  if (!botAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  const groupId = new URL(req.url).searchParams.get('groupId')
  if (!groupId) {
    return NextResponse.json({ ok: false, error: 'no_group' }, { status: 400 })
  }

  const db = getDb()
  const user = db.byGroupId(String(groupId))
  // Группа не привязана ни к кому (или ещё не дошла авто-привязка) — роутер дропнет.
  if (!user) {
    return NextResponse.json({ ok: true, matched: false })
  }

  const agentUrl =
    (user as { agent_url?: string | null }).agent_url || `http://max-user-${user.id}:8090`
  return NextResponse.json({ ok: true, matched: true, userId: user.id, agentUrl })
}
