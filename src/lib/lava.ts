/**
 * Lava.top (РФ-эквайринг). Мы → Lava: заголовок X-Api-Key, POST /api/v3/invoice → paymentUrl.
 * Lava → нас (webhook): HTTP Basic (LAVA_WEBHOOK_USER/PASS). Подписка = periodicity=MONTHLY.
 */
import crypto from 'node:crypto'

const API = 'https://gate.lava.top'

export function lavaConfigured(): boolean {
  return Boolean(process.env.LAVA_API_KEY && process.env.LAVA_OFFER_SHARED)
}

export function lavaOffer(plan: 'shared' | 'personal'): string | undefined {
  return plan === 'personal' ? process.env.LAVA_OFFER_PERSONAL : process.env.LAVA_OFFER_SHARED
}

export interface LavaInvoice {
  ok: boolean
  url?: string
  contractId?: string
  error?: string
}

/** Создаёт счёт на оплату (подписка MONTHLY по умолчанию) и возвращает ссылку на оплату. */
export async function createLavaInvoice(
  email: string,
  offerId: string,
  periodicity: 'MONTHLY' | 'ONE_TIME' = 'MONTHLY',
): Promise<LavaInvoice> {
  const key = process.env.LAVA_API_KEY
  if (!key) return { ok: false, error: 'not_configured' }
  try {
    const res = await fetch(`${API}/api/v3/invoice`, {
      method: 'POST',
      headers: { 'X-Api-Key': key, 'content-type': 'application/json' },
      body: JSON.stringify({ email, offerId, currency: 'RUB', periodicity }),
    })
    const data = (await res.json().catch(() => null)) as
      | { id?: string; paymentUrl?: string; error?: string }
      | null
    if (!res.ok || !data?.paymentUrl) {
      return { ok: false, error: data?.error ?? `http ${res.status}` }
    }
    return { ok: true, url: data.paymentUrl, contractId: data.id }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

/** Проверяет Basic-авторизацию входящего webhook от Lava (constant-time). */
export function verifyLavaWebhook(req: Request): boolean {
  const user = process.env.LAVA_WEBHOOK_USER
  const pass = process.env.LAVA_WEBHOOK_PASS
  if (!user || !pass) return false
  const expected = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
  const got = req.headers.get('authorization') ?? ''
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
