import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { botAuthorized } from '@/lib/bot-auth'

export const runtime = 'nodejs'

/**
 * POST /api/provision/ack (x-bot-token) — провижинер рапортует, что сделал.
 *
 * Тело: { userId, action }
 *  - action 'provisioning'|'running'|'stopped'|'none' → просто фиксируем agent_state;
 *  - action 'teardown_done' → снимаем teardown_pending, agent_state='stopped';
 *  - action 'restore_done'  → снимаем restore_pending, agent_state='running'.
 */
export async function POST(req: Request) {
  if (!botAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  let body: { userId?: number; action?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }
  const userId = Number(body.userId)
  if (!Number.isFinite(userId) || !body.action) {
    return NextResponse.json({ ok: false, error: 'bad_args' }, { status: 400 })
  }

  const db = getDb()
  switch (body.action) {
    case 'teardown_done':
      db.ackTeardown(userId)
      break
    case 'restore_done':
      db.ackRestore(userId)
      break
    case 'provisioning':
    case 'running':
    case 'stopped':
    case 'none':
      db.setAgentState(userId, body.action)
      break
    default:
      return NextResponse.json({ ok: false, error: 'bad_action' }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
