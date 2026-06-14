import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { cabinetUser } from '@/lib/cabinet-session'

export const runtime = 'nodejs'

/**
 * POST { done: boolean } — отметить онбординг завершённым («Готово») или снова
 * открыть инструкцию (done:false → кабинет показывает шаги настройки).
 */
export async function POST(req: Request) {
  const user = await cabinetUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  let body: { done?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }
  getDb().setSetupDone(user.id, Boolean(body.done))
  return NextResponse.json({ ok: true })
}
