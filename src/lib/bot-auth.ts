import crypto from 'node:crypto'

/** Аутентификация контейнера/бота общим секретом BOT_API_TOKEN (не публичный). */
export function botAuthorized(req: Request): boolean {
  const expected = process.env.BOT_API_TOKEN ?? process.env.INTERNAL_TOKEN
  const got = req.headers.get('x-bot-token') ?? ''
  if (!expected) return false
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
