import Link from 'next/link'
import RegisterCard from '@/components/RegisterCard'
import Tariffs from '@/components/Tariffs'
import HeroMock from '@/components/HeroMock'

// Частые вопросы — заодно FAQPage-разметка для поиска (ловит вопросные запросы).
const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Как читать сообщения из MAX в Telegram?',
    a: 'Подключите аккаунт MAX в кабинете «Весточки» — входящие из MAX будут приходить в ваш Telegram отдельными темами, а отвечать можно прямо из Telegram. Устанавливать MAX на телефон не нужно.',
  },
  {
    q: 'Как вернуть уведомления MAX на iPhone?',
    a: 'Если уведомления MAX на iPhone не приходят, подключите MAX к Telegram через «Весточку»: сообщения из MAX будут приходить как обычные уведомления Telegram, а они на iPhone работают штатно.',
  },
  {
    q: 'Нужно ли устанавливать приложение MAX?',
    a: 'Нет. «Весточка» работает на стороне сервиса — вам достаточно Telegram. MAX на телефон ставить не нужно.',
  },
  {
    q: 'Можно ли отвечать в MAX из Telegram?',
    a: 'Да. Ответ, написанный в Telegram, уходит собеседнику обратно в MAX — текст, фото, голосовые, видео-кружки и файлы.',
  },
  {
    q: 'Сколько стоит «Весточка»?',
    a: 'Первая неделя — бесплатно. Дальше 159 ₽/мес (для зарубежных карт — €1.59).',
  },
]

export default function Home() {
  return (
    <div className="wrap">
      <header>
        <div className="top">
          <div className="mark">
            Весточка<b>.</b>
          </div>
          <nav>
            <Link href="/blog">Блог</Link>
            <a href="#register" className="nav-pill">
              Войти
            </a>
          </nav>
        </div>
      </header>

      <div className="hero-grid">
        <div className="hero">
          <span className="eyebrow">MAX → Telegram</span>
          <h1>
            Близкие пишут в&nbsp;MAX. Вы отвечаете <span>из&nbsp;Telegram</span>
          </h1>
          <p className="sub">
            Сообщения из MAX приходят в привычный Telegram. Отвечайте текстом, голосом, фото и
            кружками — <strong className="hl">не устанавливая MAX на телефон</strong>.
          </p>
          <div className="act">
            <a className="button" href="#register">
              Регистрация
            </a>
            <a className="button-ghost" href="#register">
              Войти
            </a>
          </div>
          <p className="hero-note">Первая неделя бесплатно · MAX ставить не нужно</p>
        </div>
        <HeroMock />
      </div>

      <section style={{ paddingTop: 40 }}>
        <span className="eyebrow">Что это даёт</span>
        <div className="list">
          <div className="row">
            <div className="n">01</div>
            <div>
              <h3>Уведомления приходят в Telegram</h3>
              <p>
                Новое сообщение в MAX — и оно сразу в Telegram. Ничего не пропустите, даже когда MAX
                не открыт на телефоне.
              </p>
            </div>
          </div>
          <div className="row">
            <div className="n">02</div>
            <div>
              <h3>MAX можно не держать на телефоне</h3>
              <p>Не нужно ставить MAX на телефон. Вся переписка доступна в привычном месте.</p>
            </div>
          </div>
          <div className="row">
            <div className="n">03</div>
            <div>
              <h3>Связь с близкими в России</h3>
              <p>
                Те, кто пишет вам в MAX, остаются на связи. Отвечайте им из Telegram, как обычно.
              </p>
            </div>
          </div>
          <div className="row">
            <div className="n">04</div>
            <div>
              <h3>Конфиденциальность переписки</h3>
              <p>
                Содержимое сообщений мы не храним и не логируем — только передаём между MAX и
                Telegram. У каждого свой изолированный профиль, а коды входа (например, Госуслуг) мы
                не извлекаем.
              </p>
            </div>
          </div>
          <div className="row">
            <div className="n">05</div>
            <div>
              <h3>Всё в одном мессенджере</h3>
              <p>
                Текст и ответы на конкретное сообщение, фото, голосовые, видео-кружки и файлы — без
                переключений.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 54 }}>
        <span className="eyebrow">Как подключиться</span>
        <div className="steps">
          <div className="step">
            <div className="s">ШАГ 1</div>
            <h3>Регистрация</h3>
            <p>Введите почту — подготовим ваш личный доступ.</p>
          </div>
          <div className="step">
            <div className="s">ШАГ 2</div>
            <h3>Вход в MAX</h3>
            <p>Войдите в свой аккаунт MAX по номеру и коду из SMS — через нас.</p>
          </div>
          <div className="step">
            <div className="s">ШАГ 3</div>
            <h3>Пользуйтесь из Telegram</h3>
            <p>Сообщения приходят в Telegram, отвечайте там же — как привыкли.</p>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 56 }}>
        <RegisterCard />
      </section>

      <section style={{ paddingTop: 56 }} id="tariffs">
        <span className="eyebrow">Тарифы</span>
        <h2 className="section-h">Простая помесячная подписка</h2>
        <p className="section-sub">
          <strong style={{ color: '#0c1b34', fontSize: '1.12em' }}>
            Первая неделя — бесплатно.
          </strong>{' '}
          Подписку можно отменить в любой момент. Оплата российской (₽) или зарубежной картой (€).
        </p>
        <Tariffs currency="both" />
        <p className="section-sub" style={{ marginTop: 18 }}>
          <strong>Как вы получаете услугу.</strong> «Весточка» — онлайн-сервис, без физической
          доставки. Сразу после оплаты доступ открывается в личном кабинете: подключаете MAX и
          свой Telegram — и сообщения из MAX начинают приходить в Telegram. Услуга оказывается
          непрерывно, пока активна подписка.
        </p>
      </section>

      <section style={{ paddingTop: 56 }} id="faq">
        <span className="eyebrow">Частые вопросы</span>
        <h2 className="section-h">Коротко о главном</h2>
        <div className="limits">
          {FAQS.map((f) => (
            <div className="limit" key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: FAQS.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            }).replace(/</g, '\\u003c'),
          }}
        />
      </section>

      <section style={{ paddingTop: 44 }}>
        <div className="act" style={{ justifyContent: 'center' }}>
          <Link href="/details" className="button-ghost">
            Что важно знать о сервисе →
          </Link>
        </div>
      </section>

      <footer>
        <span>
          <Link href="/details">О сервисе</Link> · <Link href="/blog">Блог</Link> ·{' '}
          <Link href="/editorial-policy">Редполитика</Link> · <Link href="/offer">Оферта</Link> ·{' '}
          <Link href="/privacy">Политика данных</Link> · <Link href="/requisites">Реквизиты</Link>
        </span>
        <span>Не является официальным сервисом MAX.</span>
      </footer>
    </div>
  )
}
