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
              <strong>Электронная почта:</strong>{' '}
              <a href="mailto:vestochka99@outlook.com">vestochka99@outlook.com</a>
            </li>
            <li>
              <strong>Сайт:</strong> <Link href="/">https://vestochka.uk</Link>
            </li>
          </ul>
          <p>
            <strong>Как оказывается услуга.</strong> «Весточка» — онлайн-сервис по подписке, без
            физической доставки. Доступ открывается в личном кабинете сразу после регистрации;
            сообщения из MAX начинают приходить в Telegram после подключения в кабинете.
          </p>
          <p>
            По вопросам оплаты, услуг и возврата пишите на{' '}
            <a href="mailto:vestochka99@outlook.com">vestochka99@outlook.com</a>. Условия —
            в <Link href="/offer">публичной оферте</Link>, обработка данных — в{' '}
            <Link href="/privacy">Политике обработки персональных данных</Link>.
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
