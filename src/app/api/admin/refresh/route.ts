import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE, ADMIN_TTL_MS, signAdminSession, verifyAdminSession } from '@/lib/admin-auth'

export const runtime = 'nodejs'

/**
 * POST /api/admin/refresh — скользящее продление админ-сессии. Вызывается при открытии /admin
 * (keep-alive): если кука валидна, переставляем её с новым сроком. Пока заходишь — не истекает,
 * токен заново вводить не нужно. Невалидна → 401 (логинимся через /api/admin/login?token=…).
 */
export async function POST() {
  const cur = (await cookies()).get(ADMIN_COOKIE)?.value
  if (!verifyAdminSession(cur)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, signAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: Math.floor(ADMIN_TTL_MS / 1000),
  })
  return res
}
