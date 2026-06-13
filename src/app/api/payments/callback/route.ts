import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Webhook РФ-эквайринга. Сюда провайдер шлёт уведомление об оплате.
 *
 * СЕЙЧАS — скелет: принимает запрос, логирует, отвечает OK (чтобы прошла проверка URL при
 * создании проекта у провайдера). НАМЕРЕННО НЕ меняет статус оплаты в БД, пока не известны
 * формат полей и подпись провайдера — иначе любой смог бы «пометить оплату».
 *
 * TODO (после получения доков провайдера):
 *   1) Проверить подпись (HMAC/секрет) — иначе не доверять телу.
 *   2) Достать идентификатор заказа/пользователя и сумму.
 *   3) getDb().setPayment(userId, {payment_status:'active', current_period_end, payment_provider})
 *      + markFirstPaid(userId) при первой успешной оплате.
 *   4) Идемпотентность по id транзакции.
 */
const MAX_BODY = 64 * 1024 // потолок тела, чтобы нельзя было «закормить» логи/память

async function handle(req: Request): Promise<NextResponse> {
  const raw = (await req.text()).slice(0, MAX_BODY)

  // По умолчанию НЕ логируем тело (PII/платёжные данные). Полный дамп — только при
  // DEBUG_PAYMENTS=1 (для разовой отладки формата провайдера), выключен в проде.
  if (process.env.DEBUG_PAYMENTS === '1') {
    console.log('[payments/callback] body:', raw.slice(0, 1000))
  } else {
    console.log('[payments/callback] received', raw.length, 'bytes')
  }

  // TODO: проверить подпись провайдера, распарсить, обновить статус оплаты в БД.
  // Провайдеры обычно ждут "OK"/200, иначе ретраят.
  return new NextResponse('OK', { status: 200 })
}

export async function POST(req: Request) {
  return handle(req)
}

// Некоторые провайдеры проверяют URL коллбека через GET — отвечаем 200.
export async function GET() {
  return new NextResponse('OK', { status: 200 })
}
