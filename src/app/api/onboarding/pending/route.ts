import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { botAuthorized } from '@/lib/bot-auth'

export const runtime = 'nodejs'

/**
 * GET (x-bot-token) — оркестратор спрашивает: чьи сессии онбординга ждут запуска
 * воркера (state=QUEUED). Возвращает список user_id.
 */
export async function GET(req: Request) {
  if (!botAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ ok: true, users: getDb().onbQueued() })
}
