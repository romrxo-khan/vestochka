/**
 * Отправка кода подтверждения по SMS через SMS.RU.
 * (Telegram Gateway не используем — требует минимальный баланс $100.)
 *
 * env SMSRU_API_ID — «Программный ID» из кабинета sms.ru.
 * Если ключа нет — dev-режим: печатаем код в консоль (локальный поток проходим).
 */

export interface SendResult {
  ok: boolean
  provider: 'smsru' | 'dev'
  error?: string
}

const MSG = (code: string) => `Весточка: код подтверждения ${code}. Действует 10 минут.`

export async function sendPhoneCode(phone: string, code: string): Promise<SendResult> {
  const apiId = process.env.SMSRU_API_ID
  if (!apiId) {
    console.log(`[sms:dev] код для ${phone}: ${code}`)
    return { ok: true, provider: 'dev' }
  }
  try {
    const url = new URL('https://sms.ru/sms/send')
    url.searchParams.set('api_id', apiId)
    url.searchParams.set('to', phone.replace('+', ''))
    url.searchParams.set('msg', MSG(code))
    url.searchParams.set('json', '1')
    const res = await fetch(url, { method: 'POST' })
    const data = (await res.json().catch(() => null)) as
      | { status?: string; status_text?: string }
      | null
    if (data?.status === 'OK') return { ok: true, provider: 'smsru' }
    return { ok: false, provider: 'smsru', error: data?.status_text ?? `http ${res.status}` }
  } catch (e) {
    return { ok: false, provider: 'smsru', error: String(e) }
  }
}
