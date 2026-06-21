import type { Metadata } from 'next'
import Link from 'next/link'
import Tariffs from '@/components/Tariffs'

export const metadata: Metadata = {
  title: 'Что важно знать — Весточка',
  description: 'Как работает «Весточка», что переносится, а что остаётся в MAX.',
}

export default function DetailsPage() {
  return (
    <div className="wrap">
      <header>
        <div className="top">
          <Link href="/" className="mark" style={{ textDecoration: 'none' }}>
            Весточка<b>.</b>
          </Link>
          <nav>
            <Link href="/blog">Блог</Link>
            <Link href="/#register" className="nav-pill">
              Войти
            </Link>
          </nav>
        </div>
      </header>

      <article className="col">
        <span className="eyebrow">О сервисе</span>
        <h1 className="post-title">Что важно знать</h1>
        <p className="post-desc">
          «Весточка» пересылает сообщения из мессенджера MAX в ваш Telegram — без установки MAX на
          телефон. Несколько важных моментов о том, как это работает.
        </p>

        <section id="price" style={{ marginTop: 8 }}>
          <h2 className="section-h" style={{ fontSize: 22 }}>Тарифы и цена</h2>
          <p className="section-sub">
            <strong style={{ color: '#0c1b34' }}>Первая неделя — бесплатно.</strong> Дальше —
            простая помесячная подписка. Оплата российской (₽) или зарубежной картой (€). Отменить
            можно в любой момент.
          </p>
          <Tariffs currency="both" />
        </section>

        <div className="limits" style={{ marginTop: 28 }}>
          <div className="limit">
            <h3>История переписки не переносится</h3>
            <p>
              Мост пересылает только новые сообщения — с момента подключения. Всё, что было в MAX
              раньше, остаётся в самом MAX: мы не выкачиваем вашу старую переписку.
            </p>
          </div>
          <div className="limit">
            <h3>Коды для входа на Госуслуги приходят только в приложении MAX</h3>
            <p>
              MAX намеренно показывает эти коды лишь на телефоне — это его защита, и обойти её мы не
              пытаемся. Бот предупредит, что код запрошен, но сам код смотрите в приложении MAX.
            </p>
          </div>
          <div className="limit">
            <h3>Звонки не поддерживаются</h3>
            <p>
              Через «Весточку» нельзя звонить и принимать звонки — голосовые и видеозвонки
              доступны только в самом приложении MAX. Мост передаёт сообщения: текст,
              ответы-цитаты, голосовые, фото, видео-кружки и файлы.
            </p>
          </div>
          <div className="limit">
            <h3>Стикеры и реакции пока не передаются</h3>
            <p>
              Текст, ответы-цитаты, фото, голосовые, видео-кружки и файлы работают в обе стороны.
              Стикеры и реакции — в планах.
            </p>
          </div>
        </div>

        <footer className="post-cta">
          <p>
            <Link href="/#register">← Подключить «Весточку»</Link>
          </p>
        </footer>
      </article>
    </div>
  )
}
