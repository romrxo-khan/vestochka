import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { REG_COOKIE, verifySession } from '@/lib/reg-session'
import { imConfigured, createInvoice } from '@/lib/intellectmoney'
import { TARIFFS, type Plan } from '@/lib/tariffs'

export const runtime = 'nodejs'

/**
 * POST { email, plan? } → создаёт счёт IntellectMoney (РФ-карты, оплата за месяц) и
 * возвращает URL страницы оплаты. orderId = "<userId>.<ts>" — по нему result-вебхук
 * находит пользователя. Подтверждение оплаты — через /api/payments/intellectmoney/result.
 */
export async function POST(req: NextRequest) {
  if (!imConfigured()) {
    return NextResponse.json({ ok: false, error: 'im_not_configured' }, { status: 503 })
  }
  let body: { email?: string; plan?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }
  const email = body.email?.trim().toLowerCase()
  if (!email) {
    console.warn('[im/checkout] отказ: missing_email')
    return NextResponse.json({ ok: false, error: 'missing_email' }, { status: 400 })
  }
  // Санитизация для логов: email — пользовательский ввод, нельзя пускать в лог сырым
  // (CRLF/управляющие символы → подделка строк лога).
  const safeEmail = email.replace(/[\r\n\x00-\x1f\x7f]/g, '?')
  // Доступ только владельцу подтверждённой почты (кука verify-code).
  if (!verifySession(req.cookies.get(REG_COOKIE)?.value, email)) {
    console.warn(`[im/checkout] отказ: unverified (email=${safeEmail}, cookie=${req.cookies.get(REG_COOKIE)?.value ? 'есть' : 'нет'})`)
    return NextResponse.json({ ok: false, error: 'unverified' }, { status: 401 })
  }
  const plan: Plan = body.plan === 'personal' ? 'personal' : 'shared'
  const tariff = TARIFFS.find((t) => t.id === plan)
  if (!tariff) return NextResponse.json({ ok: false, error: 'no_plan' }, { status: 400 })

  const user = getDb().byEmailOrPhone(email)
  if (!user) {
    console.warn(`[im/checkout] отказ: no_user (email=${safeEmail})`)
    return NextResponse.json({ ok: false, error: 'no_user' }, { status: 400 })
  }
  console.warn(`[im/checkout] создаю счёт: user=${user.id} plan=${plan} amount=${tariff.rub}`)

  const origin = process.env.SITE_URL?.replace(/\/$/, '')
  if (!origin) {
    console.error('[im/checkout] SITE_URL не задан')
    return NextResponse.json({ ok: false, error: 'site_url_not_configured' }, { status: 500 })
  }

  const r = await createInvoice({
    orderId: `${user.id}.${Date.now()}`,
    amount: tariff.rub.toFixed(2),
    currency: 'RUB',
    serviceName: `Весточка — тариф «${tariff.name}» (подписка на месяц)`,
    email,
    successUrl: `${origin}/cabinet`,
    backUrl: `${origin}/cabinet`,
    resultUrl: `${origin}/api/payments/intellectmoney/result`,
  })
  if ('error' in r) {
    console.error('[im/checkout] не создан счёт:', r.error)
    return NextResponse.json({ ok: false, error: 'checkout_failed' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, url: r.url })
}
