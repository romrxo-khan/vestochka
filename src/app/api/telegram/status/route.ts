import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { cabinetUser } from '@/lib/cabinet-session'

export const runtime = 'nodejs'

/** GET — привязан ли Telegram у пользователя кабинета (для авто-подтверждения в UI). */
export async function GET() {
  const user = await cabinetUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  // Не связан — выдаём одноразовый секретный код привязки (показываем в кабинете;
  // юзер шлёт его боту как фолбэк, когда диплинк не доносит /start).
  if (!user.tg_user_id) {
    const linkCode = getDb().issueTgLinkCode(user.id)
    return NextResponse.json({ ok: true, linked: false, linkCode })
  }
  return NextResponse.json({ ok: true, linked: true })
}
