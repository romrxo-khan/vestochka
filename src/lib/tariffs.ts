/**
 * Тарифы сервиса «Весточка». Один источник правды для лендинга, окна оплаты и оферты.
 * Идентификаторы плана (`shared`/`personal`) совпадают с Stripe price / провайдером РФ.
 */
export type Plan = 'shared' | 'personal'

export interface Tariff {
  id: Plan
  name: string
  rub: number // ₽/мес (оплата российской картой)
  eur: number // €/мес (оплата зарубежной картой, Stripe)
  tagline: string
  features: string[]
  highlight?: boolean
}

export const TARIFFS: Tariff[] = [
  {
    id: 'shared',
    name: 'Базовый',
    rub: 299,
    eur: 3.99,
    tagline: 'Всё, чтобы читать MAX в Telegram',
    features: [
      'Сообщения из MAX приходят в ваш Telegram',
      'Текст, фото, голосовые, видеокружки, файлы',
      'Группы и личные чаты — отдельными темами',
      'Ответы-цитаты (reply) сохраняются',
      'Можно отвечать из Telegram — уйдёт в MAX',
      'MAX не нужно ставить на телефон',
    ],
  },
]

/** Цена тарифа строкой для выбранной валюты. */
export function priceLabel(t: Tariff, currency: 'rub' | 'eur'): string {
  return currency === 'rub' ? `${t.rub} ₽/мес` : `€${t.eur.toFixed(2)}/мес`
}
