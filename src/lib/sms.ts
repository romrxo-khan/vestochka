/**
 * Доставка кода подтверждения на телефон. Два явных канала (выбор — не автоцепочка):
 *
 *  - 'tg'  — Telegram Gateway (приоритет): код приходит В TELEGRAM на номер. Дёшево (~$0.01).
 *            env TG_GATEWAY_TOKEN.
 *  - 'sms' — SMS.RU: обычная SMS. Дороже (~3–4 ₽). env SMSRU_API_ID.
 *            Шлём только по кнопке «Получить по SMS», если код в Telegram не пришёл.
 *
 * Если ключа канала нет — dev-режим: печатаем код в консоль (локальный поток проходим).
 */

export type PhoneChannel = 'tg' | 'sms'

export interface SendResult {
  ok: boolean
  provider: 'tg-gateway' | 'smsru' | 'dev'
  error?: string
}

const MSG = (code: string) => `Весточка: код подтверждения ${code}. Действует 10 минут.`

async function viaTgGateway(phone: string, code: string, token: string): Promise<SendResult> {
  // Telegram Gateway: доставка указанного кода в Telegram-аккаунт номера (если он есть в TG).
  const res = await fetch('https://gatewayapi.telegram.org/sendVerificationMessage', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ phone_number: phone, code }),
  })
  const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
  if (data?.ok) return { ok: true, provider: 'tg-gateway' }
  return { ok: false, provider: 'tg-gateway', error: data?.error ?? `http ${res.status}` }
}

async function viaSmsRu(phone: string, code: string, apiId: string): Promise<SendResult> {
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

/** Отправляет код на телефон выбранным каналом. */
export async function sendPhoneCode(
  phone: string,
  code: string,
  channel: PhoneChannel,
): Promise<SendResult> {
  try {
    if (channel === 'tg') {
      const token = process.env.TG_GATEWAY_TOKEN
      if (token) return await viaTgGateway(phone, code, token)
    } else {
      const apiId = process.env.SMSRU_API_ID
      if (apiId) return await viaSmsRu(phone, code, apiId)
    }
  } catch (e) {
    return { ok: false, provider: channel === 'tg' ? 'tg-gateway' : 'smsru', error: String(e) }
  }
  // Ключ канала не настроен — dev-режим.
  console.log(`[phone:dev:${channel}] код для ${phone}: ${code}`)
  return { ok: true, provider: 'dev' }
}
