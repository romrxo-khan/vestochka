import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { verifyUnsubToken } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Отписка от писем-напоминаний (dunning). Ссылка приходит в каждом письме и в заголовке
 * List-Unsubscribe. Токен — HMAC(id) (см. lib/email), email в URL не раскрываем, БД-токен
 * не храним. Отписка касается ТОЛЬКО email — Telegram-уведомления остаются (это основной канал).
 *
 *  - GET  — клик по ссылке в письме: отписываем и показываем страницу подтверждения.
 *  - POST — one-click из почтового клиента (RFC 8058): отписываем, отдаём 200.
 */
function apply(req: Request): { ok: boolean } {
  const url = new URL(req.url)
  const id = Number(url.searchParams.get('u'))
  const token = url.searchParams.get('t') ?? ''
  if (!Number.isInteger(id) || id <= 0 || !verifyUnsubToken(id, token)) return { ok: false }
  // Идемпотентно: повторная отписка просто оставляет флаг выставленным.
  getDb().setEmailUnsub(id, true)
  return { ok: true }
}

const SITE = process.env.SITE_URL ?? 'https://vestochka.uk'

function page(ok: boolean): string {
  const title = ok ? 'Вы отписались от писем' : 'Ссылка недействительна'
  const body = ok
    ? `Больше не будем присылать письма-напоминания об оплате. Уведомления в Telegram остаются — их можно отключить в боте.`
    : `Не удалось подтвердить ссылку отписки. Откройте письмо заново и нажмите ссылку ещё раз.`
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f1f6ff;margin:0">
  <div style="max-width:440px;margin:60px auto;background:#fff;border-radius:16px;padding:32px;color:#0f1b2d">
    <h1 style="font-size:20px;margin:0 0 8px">Весточка</h1>
    <h2 style="font-size:17px;margin:0 0 12px;color:${ok ? '#0f1b2d' : '#b4231f'}">${title}</h2>
    <p style="font-size:15px;color:#33415c;margin:0 0 22px">${body}</p>
    <a href="${SITE}" style="display:inline-block;background:#1763ff;color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:700">На сайт Весточки</a>
  </div>
</body></html>`
}

export async function GET(req: Request): Promise<Response> {
  const { ok } = apply(req)
  return new NextResponse(page(ok), {
    status: ok ? 200 : 400,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

export async function POST(req: Request): Promise<Response> {
  const { ok } = apply(req)
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 })
}
