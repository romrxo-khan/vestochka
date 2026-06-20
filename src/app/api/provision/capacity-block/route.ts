import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { botAuthorized } from '@/lib/bot-auth'

export const runtime = 'nodejs'

/**
 * POST /api/provision/capacity-block (x-bot-token) — автоскейлер сообщает, что не смог
 * расширить флит. Ставим/снимаем флаг `capacity_blocked`: при true сайт показывает плашку
 * «приём новых ограничен» и блокирует новые регистрации (send-code → 503).
 * Body: { blocked: boolean }.
 */
export async function POST(req: Request) {
  if (!botAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  let body: { blocked?: boolean }
  try {
    body = (await req.json()) as { blocked?: boolean }
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }
  getDb().kvSet('capacity_blocked', body.blocked ? '1' : '0')
  return NextResponse.json({ ok: true, blocked: Boolean(body.blocked) })
}
