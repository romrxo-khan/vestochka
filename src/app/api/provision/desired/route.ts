import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { botAuthorized } from '@/lib/bot-auth'

export const runtime = 'nodejs'

/**
 * GET /api/provision/desired (x-bot-token) — желаемое состояние флота для провижинера.
 *
 * Возвращает { agents, teardowns, restores }:
 *  - agents — кому ДОЛЖЕН крутиться MAX-агент (онбординг доведён, доступ валиден);
 *  - teardowns — кого снести (неоплата, teardown_pending);
 *  - restores — кого вернуть после оплаты (restore_pending).
 *
 * Владелец (co-located router+agent) исключается: его контейнер провижинер не трогает.
 * Список исключений — env PROVISIONER_SKIP_USER_IDS (через запятую, по умолчанию "1").
 */
export async function GET(req: Request) {
  if (!botAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  const skip = new Set(
    (process.env.PROVISIONER_SKIP_USER_IDS ?? '1')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n)),
  )
  const db = getDb()
  const agents = db
    .desiredAgents()
    .filter((u) => !skip.has(u.id))
    .map((u) => ({ userId: u.id, groupId: u.group_id, maxPhone: u.max_phone }))
  const teardowns = db
    .pendingTeardowns()
    .filter((u) => !skip.has(u.id))
    .map((u) => u.id)
  const restores = db
    .pendingRestores()
    .filter((u) => !skip.has(u.id))
    .map((u) => u.id)
  return NextResponse.json({ ok: true, agents, teardowns, restores })
}
