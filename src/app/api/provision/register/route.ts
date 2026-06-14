import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { botAuthorized } from '@/lib/bot-auth'

export const runtime = 'nodejs'

/**
 * POST /api/provision/register (x-bot-token) — провижинер регистрирует адрес агента.
 *
 * Тело: { userId, agentUrl }
 *  - agentUrl — куда роутеру слать входящие этого юзера (мульти-бокс):
 *    `http://<ip-бокса>:<порт>` (приватный IP или публичный под INGEST_SECRET);
 *  - пустой/отсутствует → стираем адрес (возврат к docker-фолбэку max-user-<id>:8090).
 *
 * Роутер читает agent_url через /api/telegram/route. Идемпотентно.
 */
export async function POST(req: Request) {
  if (!botAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  let body: { userId?: number; agentUrl?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }
  const userId = Number(body.userId)
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ ok: false, error: 'bad_args' }, { status: 400 })
  }
  // Принимаем только http(s)-адрес или пустое (стереть). Защита от мусора в колонке.
  const url = typeof body.agentUrl === 'string' ? body.agentUrl.trim() : ''
  if (url && !/^https?:\/\/[^\s]+$/i.test(url)) {
    return NextResponse.json({ ok: false, error: 'bad_url' }, { status: 400 })
  }
  getDb().setAgentUrl(userId, url || null)
  return NextResponse.json({ ok: true })
}
