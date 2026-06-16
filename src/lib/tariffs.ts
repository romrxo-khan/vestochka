/**
 * Тарифы сервиса «Весточка». Один источник правды для лендинга, окна оплаты и оферты.
 * Идентификаторы плана (`shared`/`personal`) совпадают с Stripe price / провайдером РФ.
 */
export type Plan = 'shared' | 'personal'

export interface Tariff {
  id: Plan
  name: string
  rub: number // ₽/мес (оплата российской картой)
  usd: number // $/мес (оплата зарубежной картой, Stripe)
  tagline: string
  features: string[]
  highlight?: boolean
}

export const TARIFFS: Tariff[] = [
  {
    id: 'shared',
    name: 'Базовый',
    rub: 399,
    usd: 4.99,
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
  {
    id: 'personal',
    name: 'Персональный',
    rub: 999,
    usd: 11.99,
    tagline: 'Всё из «Базового» + выделенный профиль',
    features: [
      'Отдельный выделенный профиль — выше приватность',
      'Приоритетные ресурсы и доставка сообщений',
      'Приоритетная поддержка',
    ],
    highlight: true,
  },
]

/** Цена тарифа строкой для выбранной валюты. */
export function priceLabel(t: Tariff, currency: 'rub' | 'usd'): string {
  return currency === 'rub' ? `${t.rub} ₽/мес` : `$${t.usd.toFixed(2)}/мес`
}
