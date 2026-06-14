import { NextResponse } from 'next/server'
import { cabinetUser } from '@/lib/cabinet-session'

export const runtime = 'nodejs'

/** GET — привязан ли Telegram у пользователя кабинета (для авто-подтверждения в UI). */
export async function GET() {
  const user = await cabinetUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({ ok: true, linked: Boolean(user.tg_user_id) })
}
