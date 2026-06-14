import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { cabinetUser } from '@/lib/cabinet-session'

export const runtime = 'nodejs'

/** POST — сброс подключения MAX (смена номера): чистим номер + сессию онбординга. */
export async function POST() {
  const user = await cabinetUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  getDb().resetMax(user.id)
  return NextResponse.json({ ok: true })
}
