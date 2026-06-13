/**
 * Аутентификация админ-дашборда. Токен передаётся ОДИН раз на /api/admin/login?token=…,
 * который ставит подписанную httpOnly-куку; дальше /admin авторизуется по куке (токена в URL
 * больше нет — он не оседает в истории/логах на каждом заходе). Сравнение токена —
 * constant-time. Подпись куки — HMAC(OTP_SECRET).
 */
import crypto from 'node:crypto'

export const ADMIN_COOKIE = 'admin_session'
const TTL_MS = 12 * 60 * 60_000 // 12 часов
const SECRET = process.env.OTP_SECRET ?? 'dev-otp-secret-change-me'

/** Constant-time сравнение предъявленного токена с ADMIN_TOKEN. */
export function checkAdminToken(token: string | undefined): boolean {
  const expected = process.env.ADMIN_TOKEN
  if (!expected || !token) return false
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function sig(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
}

export function signAdminSession(): string {
  const payload = `admin|${Date.now() + TTL_MS}`
  return `${Buffer.from(payload).toString('base64url')}.${sig(payload)}`
}

export function verifyAdminSession(token: string | undefined): boolean {
  if (!token) return false
  const [b64, given] = token.split('.')
  if (!b64 || !given) return false
  let payload: string
  try {
    payload = Buffer.from(b64, 'base64url').toString()
  } catch {
    return false
  }
  const a = Buffer.from(given)
  const b = Buffer.from(sig(payload))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  const [tag, expStr] = payload.split('|')
  return tag === 'admin' && Number(expStr) > Date.now()
}
