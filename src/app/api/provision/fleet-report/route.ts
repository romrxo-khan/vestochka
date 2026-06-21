import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { botAuthorized } from '@/lib/bot-auth'

export const runtime = 'nodejs'

/**
 * Агрегатор реальной нагрузки флита по боксам (многобоксовость автоскейлера).
 *
 * Каждый флит-бокс периодически репортит число запущенных агентов (docker ps) СВОЕГО бокса;
 * лидер-автоскейлер (один на флит) читает СУММУ свежих репортов вместо локального docker ps.
 * Без этого при >1 боксе нагрузка занижалась (локальный счёт) против ёмкости всех боксов.
 *
 *  POST (x-bot-token) { box, running } → сохранить отчёт бокса (сайт штампует ts сам).
 *  GET  (x-bot-token) → { boxes, total, fresh, stale } — сумма по СВЕЖИМ боксам.
 *
 * Хранится в app_kv['fleet_running'] как JSON-карта { box: { running, ts } }.
 */
const KEY = 'fleet_running'
const FRESH_MS = 25 * 60_000 // отчёт «свежий», если моложе 25 мин (таймер репорта ~10 мин)
const PRUNE_MS = 24 * 60 * 60_000 // совсем старые записи (переименованный/снятый бокс) убираем

type Entry = { running: number; ts: number }
type Map_ = Record<string, Entry>

function read(db: ReturnType<typeof getDb>): Map_ {
  try {
    return JSON.parse(db.kvGet(KEY) ?? '{}') as Map_
  } catch {
    return {}
  }
}

export async function GET(req: Request) {
  if (!botAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 })
  const db = getDb()
  const map = read(db)
  const now = Date.now()
  const boxes: Map_ = {}
  const stale: string[] = []
  let total = 0
  let fresh = 0
  for (const [box, e] of Object.entries(map)) {
    if (now - e.ts <= FRESH_MS) {
      boxes[box] = e
      total += e.running
      fresh++
    } else {
      stale.push(box)
    }
  }
  return NextResponse.json({ ok: true, boxes, total, fresh, stale })
}

export async function POST(req: Request) {
  if (!botAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 })
  const b = (await req.json().catch(() => ({}))) as { box?: string; running?: number }
  const box = typeof b.box === 'string' ? b.box.trim().slice(0, 64) : ''
  const running = Number.isFinite(b.running) ? Math.max(0, Math.floor(b.running as number)) : NaN
  if (!box || Number.isNaN(running)) {
    return NextResponse.json({ ok: false, error: 'box и running обязательны' }, { status: 400 })
  }
  const db = getDb()
  const now = Date.now()
  const map = read(db)
  map[box] = { running, ts: now }
  // Чистим давно молчащие боксы, чтобы карта не росла бесконечно.
  for (const [k, e] of Object.entries(map)) if (now - e.ts > PRUNE_MS) delete map[k]
  db.kvSet(KEY, JSON.stringify(map))
  return NextResponse.json({ ok: true })
}
