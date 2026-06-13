import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Оплата не прошла — Весточка', robots: { index: false } }

export default function PaymentFail() {
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
        <h1>Оплата не прошла</h1>
        <p className="sub">
          Платёж не завершён. Деньги не списаны. Попробуйте ещё раз или используйте другую карту.
        </p>
        <div className="act">
          <Link className="button" href="/#register">
            Попробовать снова
          </Link>
          <Link className="button-ghost" href="/">
            На главную
          </Link>
        </div>
      </div>
    </div>
  )
}
