/**
 * Stripe-клиент (серверный). Ключ только из env (STRIPE_SECRET_KEY). Для иностранных карт;
 * РФ-карты идут через 1plat. Подписка с триалом 7 дней («неделя за привязку карты»).
 */
import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY не задан')
  if (!_stripe) _stripe = new Stripe(key)
  return _stripe
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

/** Price ID по тарифу. */
export function priceForPlan(plan: 'shared' | 'personal'): string | undefined {
  return plan === 'personal' ? process.env.STRIPE_PRICE_PERSONAL : process.env.STRIPE_PRICE_SHARED
}
