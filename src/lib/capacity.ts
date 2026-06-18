/**
 * Ёмкость флита: сколько «мест» (агентов MAX) всего и сколько занято.
 * SEATS_TOTAL — env, владелец увеличивает при добавлении флит-боксов (по замерам ~18–20 на CAX21).
 * «Занято» = живые подписчики (trialing/active/past_due) — каждый рано или поздно поднимет агента.
 * «Запущено» = реально крутящиеся агенты (подключён MAX).
 */
import { getDb } from './control-db'
import { notifyOwner } from './telegram-notify'

export const SEATS_TOTAL = Math.max(0, Number(process.env.SEATS_TOTAL ?? '20') || 0)

export interface Capacity {
  total: number
  used: number
  running: number
  free: number
  full: boolean
  pct: number
}

export function capacity(): Capacity {
  const db = getDb()
  const used = db.seatsUsed()
  const running = db.runningAgentsCount()
  const total = SEATS_TOTAL
  return {
    total,
    used,
    running,
    free: Math.max(0, total - used),
    full: total > 0 && used >= total,
    pct: total > 0 ? Math.round((used / total) * 100) : 0,
  }
}

const RANK = { ok: 0, warn: 1, full: 2 } as const
type Level = keyof typeof RANK

/**
 * Алерт владельцу в Telegram при пересечении порогов 80% / 100%. Дебаунс через kv:
 * шлём только при ПОВЫШЕНИИ уровня (ok→warn→full), при снижении молча обновляем отметку.
 * Никогда не бросает — best-effort.
 */
export async function maybeAlertCapacity(): Promise<void> {
  try {
    const c = capacity()
    if (c.total <= 0) return
    const level: Level = c.used >= c.total ? 'full' : c.pct >= 80 ? 'warn' : 'ok'
    const db = getDb()
    const last = (db.kvGet('capacity_alert_level') as Level | undefined) ?? 'ok'
    if (level === last) return
    if (RANK[level] > RANK[last]) {
      const msg =
        level === 'full'
          ? `🛑 Весточка: МЕСТА ЗАКОНЧИЛИСЬ — ${c.used}/${c.total}. Новые регистрации заблокированы. Подними новый флит-бокс и увеличь SEATS_TOTAL.`
          : `⚠️ Весточка: занято ${c.used}/${c.total} мест (${c.pct}%). Пора готовить новый флит-бокс.`
      await notifyOwner(msg)
    }
    db.kvSet('capacity_alert_level', level)
  } catch (e) {
    console.error('[capacity] alert error:', (e as Error)?.message ?? e)
  }
}
