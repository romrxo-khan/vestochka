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
async function handle(req: Request): Promise<NextResponse> {
  let payload: unknown = null
  try {
    const ct = req.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) payload = await req.json()
    else {
      const text = await req.text()
      payload = text || null
    }
  } catch {
    payload = null
  }
  // Логируем для отладки формата провайдера (без секретов в проде позже урезать).
  console.log('[payments/callback]', JSON.stringify(payload)?.slice(0, 1000))

  // Провайдеры обычно ждут "OK"/200, иначе ретраят. Подпись и запись в БД — после доков.
  return new NextResponse('OK', { status: 200 })
}

export async function POST(req: Request) {
  return handle(req)
}

// Некоторые провайдеры проверяют URL коллбека через GET — отвечаем 200.
export async function GET() {
  return new NextResponse('OK', { status: 200 })
}
