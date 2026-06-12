/**
 * Отправка SMS с кодом. Провайдер за абстракцией — чтобы менять без правок вызовов.
 *
 * Провайдеры (по приоритету ENV):
 *  - SMS.RU            — SMSRU_API_ID (РФ, дёшево, простой HTTP API)
 *  - Telegram Gateway  — TG_GATEWAY_TOKEN (ещё дешевле, но шлёт код в Telegram, не в SMS)
 *  - dev               — если ничего не настроено, печатаем код в консоль (локальный поток)
 *
 * Возвращает { ok } — наружу детали провайдера не утекают.
 */

export interface SmsResult {
  ok: boolean
  provider: 'smsru' | 'tg-gateway' | 'dev'
  error?: string
}

const MSG = (code: string) => `Весточка: код подтверждения ${code}. Действует 10 минут.`

async function sendViaSmsRu(phone: string, code: string, apiId: string): Promise<SmsResult> {
  const url = new URL('https://sms.ru/sms/send')
  url.searchParams.set('api_id', apiId)
  url.searchParams.set('to', phone.replace('+', ''))
  url.searchParams.set('msg', MSG(code))
  url.searchParams.set('json', '1')
  const res = await fetch(url, { method: 'POST' })
  const data = (await res.json().catch(() => null)) as { status?: string; status_text?: string } | null
  if (data?.status === 'OK') return { ok: true, provider: 'smsru' }
  return { ok: false, provider: 'smsru', error: data?.status_text ?? `http ${res.status}` }
}

async function sendViaTgGateway(phone: string, code: string, token: string): Promise<SmsResult> {
  // Telegram Gateway API: отправка проверочного кода на номер (если у номера есть Telegram).
  const res = await fetch('https://gatewayapi.telegram.org/sendVerificationMessage', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ phone_number: phone, code }),
  })
  const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
  if (data?.ok) return { ok: true, provider: 'tg-gateway' }
  return { ok: false, provider: 'tg-gateway', error: data?.error ?? `http ${res.status}` }
}

export async function sendVerificationSms(phone: string, code: string): Promise<SmsResult> {
  const smsru = process.env.SMSRU_API_ID
  const tg = process.env.TG_GATEWAY_TOKEN
  try {
    if (smsru) return await sendViaSmsRu(phone, code, smsru)
    if (tg) return await sendViaTgGateway(phone, code, tg)
  } catch (e) {
    return { ok: false, provider: smsru ? 'smsru' : 'tg-gateway', error: String(e) }
  }
  console.log(`[sms:dev] код для ${phone}: ${code}`)
  return { ok: true, provider: 'dev' }
}
