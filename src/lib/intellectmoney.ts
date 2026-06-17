/**
 * IntellectMoney (РФ-эквайринг) — Merchant 2.0 API.
 *  - createInvoice: POST на api.intellectmoney.ru → InvoiceId → редирект на оплату.
 *  - Result URL (вебхук): IntellectMoney POST'ит статус → проверяем подпись → ответ "OK".
 * Подписи — MD5 строки полей через '::' с SecretKey в конце (порядок строго по доке).
 */
import crypto from 'node:crypto'

const ESHOP_ID = process.env.INTELLECTMONEY_ESHOP_ID ?? ''
const SECRET = process.env.INTELLECTMONEY_SECRET_KEY ?? ''
const CREATE_INVOICE_URL = 'https://api.intellectmoney.ru/merchant/createInvoice'
const PAY_PAGE = 'https://merchant.intellectmoney.ru/'

export function imConfigured(): boolean {
  return Boolean(ESHOP_ID && SECRET)
}

const md5 = (s: string): string => crypto.createHash('md5').update(s, 'utf8').digest('hex')

export interface InvoiceParams {
  orderId: string
  amount: string // "399.00"
  currency: string // RUB | TST (тест)
  serviceName: string
  email: string
  userName?: string
  successUrl: string
  backUrl: string
  resultUrl: string
}

/**
 * Подпись createInvoice (порядок строго по доке):
 * EshopId::OrderId::ServiceName::RecipientAmount::RecipientCurrency::UserName::Email::
 * SuccessUrl::FailUrl::BackUrl::ResultUrl::ExpireDate::HoldMode::Preference::SecretKey
 * (FailUrl/ExpireDate/HoldMode/Preference — пустые).
 */
function invoiceHash(p: InvoiceParams): string {
  return md5(
    [
      ESHOP_ID,
      p.orderId,
      p.serviceName,
      p.amount,
      p.currency,
      p.userName ?? '',
      p.email,
      p.successUrl,
      '', // FailUrl
      p.backUrl,
      p.resultUrl,
      '', // ExpireDate
      '', // HoldMode
      '', // Preference
      SECRET,
    ].join('::'),
  )
}

/** Создаёт счёт и возвращает URL страницы оплаты, либо текст ошибки. */
export async function createInvoice(p: InvoiceParams): Promise<{ url: string } | { error: string }> {
  const form = new URLSearchParams({
    EshopId: ESHOP_ID,
    OrderId: p.orderId,
    ServiceName: p.serviceName,
    RecipientAmount: p.amount,
    RecipientCurrency: p.currency,
    Email: p.email,
    SuccessUrl: p.successUrl,
    BackUrl: p.backUrl,
    ResultUrl: p.resultUrl,
    Hash: invoiceHash(p),
  })
  if (p.userName) form.set('UserName', p.userName)
  try {
    const res = await fetch(CREATE_INVOICE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: form.toString(),
    })
    const data = (await res.json()) as {
      OperationState?: { Code?: number; Desc?: string }
      Result?: { State?: { Code?: number; Desc?: string }; InvoiceId?: string | number }
    }
    const invoiceId = data?.Result?.InvoiceId
    if (!invoiceId) {
      const desc = data?.Result?.State?.Desc ?? data?.OperationState?.Desc ?? 'unknown'
      return { error: `no_invoice: ${desc}` }
    }
    return { url: `${PAY_PAGE}?InvoiceId=${invoiceId}` }
  } catch (e) {
    return { error: (e as Error)?.message ?? 'fetch_failed' }
  }
}

/** Поля уведомления Result URL (читаем регистронезависимо). */
export interface ResultFields {
  eshopId: string
  invoiceId: string
  orderId: string
  eshopAccount: string
  serviceName: string
  recipientAmount: string
  recipientCurrency: string
  paymentStatus: string
  userName: string
  userEmail: string
  paymentData: string
  hash: string
}

/**
 * Подпись уведомления Result URL:
 * EshopId::InvoiceId::OrderId::EshopAccount::ServiceName::RecipientAmount::
 * RecipientCurrency::PaymentStatus::UserName::UserEmail::PaymentData::SecretKey
 */
export function verifyResult(f: ResultFields): boolean {
  const expected = md5(
    [
      f.eshopId,
      f.invoiceId,
      f.orderId,
      f.eshopAccount,
      f.serviceName,
      f.recipientAmount,
      f.recipientCurrency,
      f.paymentStatus,
      f.userName,
      f.userEmail,
      f.paymentData,
      SECRET,
    ].join('::'),
  )
  const got = (f.hash ?? '').toLowerCase()
  if (got.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got))
}

/** Успешная оплата по протоколу IntellectMoney. */
export function isPaid(paymentStatus: string): boolean {
  const s = (paymentStatus ?? '').trim().toLowerCase()
  return s === 'paid' || s === '5' || s === '2'
}
