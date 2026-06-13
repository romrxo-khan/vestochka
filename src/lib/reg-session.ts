/**
 * Короткоживущая подписанная сессия регистрации. Выдаётся httpOnly-кукой при ПЕРВОЙ
 * (прошедшей капчу) отправке кода и привязана к конкретному контакту. Повтор кода
 * («Получить по SMS» / «Отправить заново») требует эту куку — поэтому:
 *   - чужой клиент не может слать повторы на чужой активный код (анти-бомбинг/скрутка);
 *   - капча на повторе не нужна (её уже прошли при выдаче);
 *   - эндпоинт не превращается в оракул «есть ли активная регистрация у номера».
 *
 * Подпись — HMAC(OTP_SECRET). Тело — base64url(contact|exp). Без БД, stateless.
 */
import crypto from 'node:crypto'

export const REG_COOKIE = 'reg_session'
const TTL_MS = 15 * 60_000
const SECRET = process.env.OTP_SECRET ?? 'dev-otp-secret-change-me'

function sig(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
}

export function signSession(contact: string): string {
  const payload = `${contact}|${Date.now() + TTL_MS}`
  return `${Buffer.from(payload).toString('base64url')}.${sig(payload)}`
}

/** true, если кука валидна, не истекла и привязана именно к этому контакту. */
export function verifySession(token: string | undefined, contact: string): boolean {
  if (!token) return false
  const [b64, given] = token.split('.')
  if (!b64 || !given) return false
  let payload: string
  try {
    payload = Buffer.from(b64, 'base64url').toString()
  } catch {
    return false
  }
  const expected = sig(payload)
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  const [c, expStr] = payload.split('|')
  return c === contact && Number(expStr) > Date.now()
}
