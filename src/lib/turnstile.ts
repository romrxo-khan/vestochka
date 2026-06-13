/**
 * Проверка капчи Cloudflare Turnstile на стороне сервера.
 *
 * Ключи (создаются в Cloudflare → Turnstile):
 *   - NEXT_PUBLIC_TURNSTILE_SITE_KEY — публичный, в виджете на фронте;
 *   - TURNSTILE_SECRET_KEY           — секретный, только на сервере (env).
 *
 * Если секрет НЕ задан — проверка отключена (dev/локально поток проходит без капчи).
 * Когда секрет задан — без валидного токена код не отправляется.
 */
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY)
}

export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true // капча выключена
  if (!token) return false

  try {
    const body = new URLSearchParams({ secret, response: token })
    if (ip && ip !== 'unknown') body.set('remoteip', ip)
    const res = await fetch(VERIFY_URL, { method: 'POST', body })
    const data = (await res.json().catch(() => null)) as { success?: boolean } | null
    return data?.success === true
  } catch {
    return false
  }
}
