import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { botAuthorized } from '@/lib/bot-auth'

export const runtime = 'nodejs'

/**
 * GET /api/provision/desired?box=<name> (x-bot-token) — желаемое состояние ДЛЯ КОНКРЕТНОГО бокса.
 *
 * Многобоксовость: каждый провижинер передаёт свой FLEET_BOX_NAME и получает ТОЛЬКО своих
 * закреплённых юзеров (иначе новый бокс «угнал» бы существующих — баг, найденный в тесте B3).
 * Перед выдачей закрепляем неназначенных desired-юзеров за наименее загруженным живым боксом.
 * Без параметра box — legacy-режим (все desired), для обратной совместимости одного бокса.
 *
 * Возвращает { agents, teardowns, restores }.
 * Владелец (co-located router+agent) исключается: env PROVISIONER_SKIP_USER_IDS (по умолч. "1").
 */
const FRESH_MS = 25 * 60_000

/** Живые боксы = свежие репортеры fleet-report ∪ сам вызывающий бокс. */
function liveBoxes(db: ReturnType<typeof getDb>, callerBox: string): string[] {
  let map: Record<string, { running: number; ts: number }> = {}
  try {
    map = JSON.parse(db.kvGet('fleet_running') ?? '{}')
  } catch {
    /* пусто */
  }
  const now = Date.now()
  const fresh = Object.entries(map)
    .filter(([, e]) => now - e.ts <= FRESH_MS)
    .map(([b]) => b)
  return Array.from(new Set([...fresh, callerBox]))
}

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
  const box = (new URL(req.url).searchParams.get('box') ?? '').trim()
  const db = getDb()

  // Box-aware: закрепляем неназначенных за живыми боксами (наименее загруженный, в пределах cap).
  if (box) {
    const perBoxCap = Number(process.env.SEATS_PER_BOX ?? process.env.SEATS_TOTAL ?? '12')
    db.assignBoxes(liveBoxes(db, box), perBoxCap, skip)
  }

  // С box-параметром teardown/restore выполняет ТОЛЬКО владеющий бокс (фильтр по box).
  const ownsBox = (u: { box: string | null }) => !box || u.box === box

  const agents = db
    .desiredAgents(box || undefined)
    .filter((u) => !skip.has(u.id))
    .map((u) => ({ userId: u.id, groupId: u.group_id, maxPhone: u.max_phone }))
  const teardowns = db
    .pendingTeardowns()
    .filter((u) => !skip.has(u.id) && ownsBox(u))
    .map((u) => u.id)
  const restores = db
    .pendingRestores()
    .filter((u) => !skip.has(u.id) && ownsBox(u))
    .map((u) => u.id)
  return NextResponse.json({ ok: true, agents, teardowns, restores })
}
