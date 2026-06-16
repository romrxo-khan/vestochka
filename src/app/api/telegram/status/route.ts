import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { cabinetUser } from '@/lib/cabinet-session'

export const runtime = 'nodejs'

/** GET — привязан ли Telegram у пользователя кабинета (для авто-подтверждения в UI). */
export async function GET() {
  const user = await cabinetUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  // Юзер на шаге привязки и ещё не связан — отмечаем «ждёт привязку», чтобы разрешить
  // привязку по email через бота (фолбэк, когда диплинк не доносит /start).
  if (!user.tg_user_id) getDb().markTgLinkPending(user.id)
  return NextResponse.json({ ok: true, linked: Boolean(user.tg_user_id) })
}
