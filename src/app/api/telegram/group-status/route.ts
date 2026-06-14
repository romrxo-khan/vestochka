import { NextResponse } from 'next/server'
import { cabinetUser } from '@/lib/cabinet-session'

export const runtime = 'nodejs'

/** GET — статус группы пользователя (для подсказок и авто-подтверждения в кабинете). */
export async function GET() {
  const user = await cabinetUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({
    ok: true,
    connected: Boolean(user.group_id),
    rightsOk: user.group_ok === 1,
    title: user.group_title ?? null,
  })
}
