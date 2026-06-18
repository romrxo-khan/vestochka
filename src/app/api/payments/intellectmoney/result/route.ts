import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { verifyResult, isPaid, parseCp1251Form, type ResultFields } from '@/lib/intellectmoney'
import { notifyReactivated } from '@/lib/notify'

export const runtime = 'nodejs'

const MONTH_MS = 30 * 86_400_000

/**
 * Result URL IntellectMoney: POST со статусом платежа. Проверяем подпись, на «оплачено»
 * активируем подписку (на месяц) → дальше уже готовый dunning. Отвечаем строкой "OK"
 * (иначе IntellectMoney будет слать повторно).
 */
export async function POST(req: Request) {
  let raw: Record<string, string> = {}
  try {
    const ct = req.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) {
      raw = (await req.json()) as Record<string, string>
    } else if (ct.includes('application/x-www-form-urlencoded') || ct === '') {
      // IM шлёт форму в Windows-1251 — парсим тело побайтно как CP1251 (иначе serviceName бьётся).
      raw = parseCp1251Form(Buffer.from(await req.arrayBuffer()))
    } else {
      const fd = await req.formData()
      for (const [k, v] of fd.entries()) raw[k] = String(v)
    }
  } catch {
    return new NextResponse('bad request', { status: 400 })
  }

  // Регистронезависимый доступ к полям (IntellectMoney может слать в разном регистре).
  const low: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) low[k.toLowerCase()] = v
  const get = (name: string) => low[name.toLowerCase()] ?? ''

  const f: ResultFields = {
    eshopId: get('eshopId'),
    invoiceId: get('invoiceId') || get('paymentId'),
    orderId: get('orderId'),
    eshopAccount: get('eshopAccount'),
    serviceName: get('serviceName'),
    recipientAmount: get('recipientAmount'),
    recipientCurrency: get('recipientCurrency'),
    paymentStatus: get('paymentStatus'),
    userName: get('userName'),
    userEmail: get('userEmail'),
    paymentData: get('paymentData'),
    hash: get('hash'),
  }

  if (!verifyResult(f)) {
    console.error(
      `[im/result] подпись не прошла. keys=${Object.keys(low).join(',')} orderId=${f.orderId} status=${f.paymentStatus}`,
    )
    return new NextResponse('bad sign', { status: 403 })
  }

  if (isPaid(f.paymentStatus)) {
    const userId = Number(f.orderId.split('.')[0])
    const user = Number.isFinite(userId) ? getDb().byId(userId) : undefined
    if (user) {
      const wasLapsed = user.payment_status === 'past_due' || user.status === 'suspended'
      const end = new Date(Date.now() + MONTH_MS).toISOString()
      getDb().activateSubscription(user.id, end, 'intellectmoney')
      if (wasLapsed) {
        const fresh = getDb().byId(user.id)
        if (fresh) await notifyReactivated(fresh).catch(() => {})
      }
    } else {
      console.error('[im/result] оплачено, но юзер не найден. orderId=' + f.orderId)
    }
  }

  return new NextResponse('OK', { status: 200, headers: { 'content-type': 'text/plain' } })
}
