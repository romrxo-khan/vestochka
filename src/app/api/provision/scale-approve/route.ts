import crypto from 'node:crypto'
import { getDb } from '@/lib/control-db'

export const runtime = 'nodejs'

/**
 * Аппрув роста сервера по подписанной ссылке (из кнопки бота, тапает владелец).
 * GET ?key=<boxId:type>&sig=<hmac> — sig = HMAC-SHA256(key, BOT_API_TOKEN)[:32].
 * Если подпись верна и key совпадает с текущим scale_pending → ставим scale_approved.
 * Публичный (тап из браузера), но защищён подписью: подделать без секрета нельзя.
 */
function page(text: string, status = 200): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0d1b2a;color:#eaf2ff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">
     <div style="max-width:420px;padding:28px;text-align:center;font-size:18px;line-height:1.5">${text}</div></body>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const key = url.searchParams.get('key') ?? ''
  const sig = url.searchParams.get('sig') ?? ''
  const secret = process.env.BOT_API_TOKEN ?? process.env.INTERNAL_TOKEN ?? ''
  if (!secret || !key || !sig) return page('❌ Недействительная ссылка.', 400)

  const expect = crypto.createHmac('sha256', secret).update(key).digest('hex').slice(0, 32)
  const ok =
    sig.length === expect.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))
  if (!ok) return page('❌ Недействительная подпись.', 403)

  const db = getDb()
  if (db.kvGet('scale_pending') !== key) {
    return page('⚠️ Запрос неактуален — уже обработан или изменился.', 200)
  }
  db.kvSet('scale_approved', key)
  return page('✅ Подтверждено. Сервер расширится в течение ~10 минут.', 200)
}
