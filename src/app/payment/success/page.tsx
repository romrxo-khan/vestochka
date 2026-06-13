import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Оплата прошла — Весточка', robots: { index: false } }

export default function PaymentSuccess() {
  return (
    <div className="wrap">
      <header>
        <div className="top">
          <Link href="/" className="mark" style={{ textDecoration: 'none' }}>
            Весточка<b>.</b>
          </Link>
        </div>
      </header>
      <div className="hero">
        <span className="eyebrow">Оплата</span>
        <h1>Оплата прошла ✅</h1>
        <p className="sub">
          Спасибо! Подписка активна. Доступ к MAX через Telegram уже готовится — мы свяжемся с вами.
        </p>
        <div className="act">
          <Link className="button" href="/">
            На главную
          </Link>
        </div>
      </div>
    </div>
  )
}
