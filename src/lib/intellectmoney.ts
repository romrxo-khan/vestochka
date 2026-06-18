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

// Result-протокол IntellectMoney (legacy форма оповещения) работает в Windows-1251:
// и serviceName в теле, и контрольная подпись считаются по CP1251-байтам, не UTF-8.
// (createInvoice — современный API, там UTF-8; его НЕ трогаем.)
const _dec1251 = new TextDecoder('windows-1251')
const _enc1251 = new Map<string, number>()
for (let b = 0; b < 256; b++) _enc1251.set(_dec1251.decode(Uint8Array.of(b)), b)
function toCp1251(str: string): Buffer {
  const out = Buffer.alloc(str.length)
  for (let i = 0; i < str.length; i++) {
    const b = _enc1251.get(str[i])
    out[i] = b === undefined ? 0x3f : b // '?' для не-CP1251 символов
  }
  return out
}
const md5cp1251 = (s: string): string => crypto.createHash('md5').update(toCp1251(s)).digest('hex')

/** Percent-decode значения формы в Windows-1251 (одно поле). */
function _decodePercentCp1251(v: string): string {
  const bytes: number[] = []
  for (let i = 0; i < v.length; i++) {
    if (v[i] === '%' && /^[0-9A-Fa-f]{2}$/.test(v.slice(i + 1, i + 3))) {
      bytes.push(parseInt(v.slice(i + 1, i + 3), 16))
      i += 2
    } else {
      bytes.push(v.charCodeAt(i) & 0xff)
    }
  }
  return _dec1251.decode(Uint8Array.from(bytes))
}

/** Парсит application/x-www-form-urlencoded тело как Windows-1251 (result-уведомление IM). */
export function parseCp1251Form(buf: Buffer): Record<string, string> {
  const out: Record<string, string> = {}
  const text = buf.toString('latin1') // тело урла — ASCII (%XX + латиница), читаем побайтно
  for (const pair of text.split('&')) {
    if (!pair) continue
    const eq = pair.indexOf('=')
    const kRaw = (eq === -1 ? pair : pair.slice(0, eq)).replace(/\+/g, ' ')
    const vRaw = (eq === -1 ? '' : pair.slice(eq + 1)).replace(/\+/g, ' ')
    out[_decodePercentCp1251(kRaw)] = _decodePercentCp1251(vRaw)
  }
  return out
}

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
 * Подпись уведомления Result URL (офиц. формула IntellectMoney, БЕЗ invoiceId/paymentId):
 * EshopId::OrderId::ServiceName::EshopAccount::RecipientAmount::RecipientCurrency::
 * PaymentStatus::UserName::UserEmail::PaymentData::SecretKey
 * Пример: 17354::order_1::Книга::4356091274::12.30::RUB::5::Имя::a@b.ru::2010-01-17 13:12:03::key
 */
export function verifyResult(f: ResultFields): boolean {
  // Result-протокол IM считает подпись по CP1251-байтам (serviceName кириллицей).
  const expected = md5cp1251(
    [
      f.eshopId,
      f.orderId,
      f.serviceName,
      f.eshopAccount,
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

/**
 * Успешная оплата по протоколу IntellectMoney.
 * paymentStatus: 3=счёт создан, 4=отменён, 5=оплачен (деньги магазину), 7=частично, 8=оплачен+возврат.
 * Активируем только при полной оплате (5).
 */
export function isPaid(paymentStatus: string): boolean {
  const s = (paymentStatus ?? '').trim().toLowerCase()
  return s === 'paid' || s === '5'
}
