import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, checkAdminToken, signAdminSession } from '@/lib/admin-auth'

export const runtime = 'nodejs'

/** GET /api/admin/login?token=… → проверяет токен, ставит httpOnly-куку, редиректит на /admin. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? undefined
  if (!checkAdminToken(token)) {
    return new NextResponse('unauthorized', { status: 401 })
  }
  const res = NextResponse.redirect(new URL('/admin', req.url))
  res.cookies.set(ADMIN_COOKIE, signAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 12 * 60 * 60,
  })
  return res
}
