'use client'

import { useState } from 'react'
import Tariffs from './Tariffs'
import type { Plan } from '@/lib/tariffs'

/**
 * Оплата подписки из кабинета (для неоплаченных). Выбор карты → тарифы → checkout.
 * Email берём из аккаунта; verifySession на бэке проходит по той же куке, что и кабинет.
 */
export default function PayBox({ email }: { email: string }) {
  const [cardType, setCardType] = useState<'ru' | 'foreign' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const stripeOn = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  const ruPayOn = Boolean(process.env.NEXT_PUBLIC_INTELLECTMONEY_ENABLED)

  async function pay(endpoint: string, plan: Plan) {
    setError('')
    setBusy(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, plan }),
      })
      const data = await res.json()
      if (data.error === 'already_active') {
        setError('У вас уже есть активная подписка.')
        return
      }
      if (!res.ok || !data.ok || !data.url) {
        setError('Не удалось открыть оплату. Попробуйте ещё раз.')
        return
      }
      window.location.href = data.url
    } catch {
      setError('Нет связи с сервером. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }
  const payRu = (plan: Plan) => pay('/api/payments/intellectmoney/checkout', plan)
  const payStripe = (plan: Plan) => pay('/api/stripe/checkout', plan)

  if (!stripeOn && !ruPayOn) return null

  return (
    <section className="cta" style={{ marginTop: 8 }}>
      <span className="eyebrow" style={{ color: '#7fb0ff' }}>
        Подписка
      </span>
      <div className="head">Оформить подписку</div>

      {!cardType ? (
        <>
          <p className="lead">Какой картой хотите оплатить?</p>
          {ruPayOn && (
            <button type="button" className="pay-btn" onClick={() => setCardType('ru')}>
              <span className="pay-btn-title">🇷🇺 Российская карта</span>
              <span className="pay-btn-sub">оплата в рублях</span>
            </button>
          )}
          {stripeOn && (
            <button type="button" className="pay-btn alt" onClick={() => setCardType('foreign')}>
              <span className="pay-btn-title">🌍 Зарубежная карта</span>
              <span className="pay-btn-sub">оплата в евро</span>
            </button>
          )}
        </>
      ) : cardType === 'ru' ? (
        <>
          <p className="lead">Выберите тариф — оплата российской картой (₽):</p>
          <Tariffs currency="rub" busy={busy} onPick={payRu} />
          <button
            type="button"
            className="link-back"
            onClick={() => setCardType(null)}
            style={{ background: 'none', border: 0, color: '#7fb0ff', cursor: 'pointer', marginTop: 8 }}
          >
            ← другой способ оплаты
          </button>
        </>
      ) : (
        <>
          <p className="lead">
            Выберите тариф — зарубежная карта (€), <strong>первая неделя бесплатно</strong>.
          </p>
          <Tariffs currency="eur" busy={busy} onPick={payStripe} />
          <button
            type="button"
            className="link-back"
            onClick={() => setCardType(null)}
            style={{ background: 'none', border: 0, color: '#7fb0ff', cursor: 'pointer', marginTop: 8 }}
          >
            ← другой способ оплаты
          </button>
        </>
      )}

      {error && (
        <p className="fine" style={{ color: '#e0506a' }}>
          {error}
        </p>
      )}
    </section>
  )
}
