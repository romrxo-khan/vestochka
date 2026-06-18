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
    eur: 4.99, // TODO: → 3.99 после создания нового Stripe Price (€3.99) и обновления STRIPE_PRICE_SHARED
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
    rub: 859,
    eur: 11.99, // TODO: → 10.99 после создания нового Stripe Price (€10.99) и обновления STRIPE_PRICE_PERSONAL
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
export function priceLabel(t: Tariff, currency: 'rub' | 'eur'): string {
  return currency === 'rub' ? `${t.rub} ₽/мес` : `€${t.eur.toFixed(2)}/мес`
}
