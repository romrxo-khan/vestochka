import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, ADMIN_TTL_MS, checkAdminToken, signAdminSession } from '@/lib/admin-auth'

export const runtime = 'nodejs'

/** GET /api/admin/login?token=… → проверяет токен, ставит httpOnly-куку, редиректит на /admin. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? undefined
  if (!checkAdminToken(token)) {
    return new NextResponse('unauthorized', { status: 401 })
  }
  // Публичный origin из SITE_URL (за прокси req.url = внутренний localhost).
  const base = process.env.SITE_URL?.replace(/\/$/, '') ?? new URL(req.url).origin
  const res = NextResponse.redirect(`${base}/admin`)
  res.cookies.set(ADMIN_COOKIE, signAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // lax (не strict): при заходе по ссылке логина из Telegram/почты/заметок переход
    // /api/admin/login → /admin межсайтовый, и strict-куку браузер не шлёт на редирект
    // (видно «Доступ закрыт», хотя кука поставлена). lax шлёт куку на top-level переходы
    // и при этом защищает от CSRF (cross-site POST/subresource). Для сессии админки — норма.
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(ADMIN_TTL_MS / 1000),
  })
  return res
}
