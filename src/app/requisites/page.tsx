import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Реквизиты — Весточка',
  description: 'Сведения о продавце услуг сервиса «Весточка».',
  robots: { index: false },
}

export default function RequisitesPage() {
  return (
    <div className="wrap">
      <header>
        <div className="top">
          <Link href="/" className="mark" style={{ textDecoration: 'none' }}>
            Весточка<b>.</b>
          </Link>
          <nav>
            <Link href="/blog">Блог</Link>
          </nav>
        </div>
      </header>

      <article className="col">
        <span className="eyebrow">Сведения о продавце</span>
        <h1 className="post-title">Реквизиты</h1>
        <p className="post-desc">
          Услуги сервиса «Весточка» (vestochka.uk) оказывает самозанятый — плательщик налога на
          профессиональный доход (НПД).
        </p>

        <div className="blog-body">
          <ul>
            <li>
              <strong>Статус:</strong> самозанятый (плательщик НПД)
            </li>
            <li>
              <strong>ИНН:</strong> 164490442194
            </li>
            <li>
              <strong>Сервис:</strong> «Весточка» — доступ к мессенджеру MAX через Telegram
            </li>
            <li>
              <strong>Сайт:</strong> <Link href="/">https://vestochka.uk</Link>
            </li>
          </ul>
          <p>
            По вопросам оплаты и услуг — пишите на адрес электронной почты, указанный при
            регистрации; мы ответим на него же.
          </p>
        </div>

        <footer className="post-cta">
          <p>
            <Link href="/">← На главную</Link>
          </p>
        </footer>
      </article>
    </div>
  )
}
