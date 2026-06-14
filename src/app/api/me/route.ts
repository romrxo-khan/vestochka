import { NextResponse } from 'next/server'
import { cabinetUser } from '@/lib/cabinet-session'

export const runtime = 'nodejs'

/** GET — вошёл ли пользователь (по сессии-куке). Для «вы уже вошли → в кабинет» на лендинге. */
export async function GET() {
  const user = await cabinetUser()
  return NextResponse.json({ loggedIn: Boolean(user), email: user?.email ?? null })
}
