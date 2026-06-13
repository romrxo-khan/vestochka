/**
 * Токен связки кабинет↔Telegram-бот. Кабинет генерит подписанный токен (HMAC от user_id),
 * кладёт его в deep-link `t.me/<bot>?start=<token>`. Бот при /start присылает токен нам,
 * мы проверяем подпись и связываем tg_user_id с аккаунтом. Без БД, stateless, TTL 15 мин.
 */
import crypto from 'node:crypto'

const TTL_MS = 15 * 60_000
const SECRET = process.env.OTP_SECRET ?? 'dev-otp-secret-change-me'

function sig(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(`link:${payload}`).digest('base64url')
}

export function signLinkToken(userId: number): string {
  const payload = `${userId}.${Date.now() + TTL_MS}`
  return `${Buffer.from(payload).toString('base64url')}.${sig(payload)}`
}

/** Возвращает userId, если токен валиден и не истёк, иначе null. */
export function verifyLinkToken(token: string | undefined): number | null {
  if (!token) return null
  const [b64, given] = token.split('.')
  if (!b64 || !given) return null
  let payload: string
  try {
    payload = Buffer.from(b64, 'base64url').toString()
  } catch {
    return null
  }
  const a = Buffer.from(given)
  const b = Buffer.from(sig(payload))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  const [idStr, expStr] = payload.split('.')
  if (Number(expStr) < Date.now()) return null
  const id = Number(idStr)
  return Number.isInteger(id) && id > 0 ? id : null
}
