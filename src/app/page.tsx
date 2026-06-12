export default function Home() {
  return (
    <div className="wrap">
      <header>
        <div className="top">
          <div className="mark">
            Весточка<b>.</b>
          </div>
          <nav>
            <a href="#start">Подключиться</a>
          </nav>
        </div>
      </header>

      <div className="hero">
        <span className="eyebrow">MAX → Telegram</span>
        <h1>
          Близкие пишут в&nbsp;MAX. Вы отвечаете <span>из&nbsp;Telegram</span>.
        </h1>
        <p className="sub">
          Сообщения из MAX приходят в привычный Telegram. Отвечайте текстом, голосом, фото и
          кружками — не устанавливая MAX на телефон.
        </p>
        <div className="act">
          <a className="button" href="#start">
            Подключиться
          </a>
          <span className="meta">Пара минут на подключение · переписка остаётся у&nbsp;вас</span>
        </div>
      </div>

      <section>
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
              <h3>Ваша переписка изолирована</h3>
              <p>
                Отдельный профиль на каждого пользователя. Для повышенной приватности — тариф с
                личным сервером.
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
            <p>Оставьте почту или номер телефона — подготовим ваш личный доступ.</p>
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

      <section id="start">
        <div className="cta">
          <span className="eyebrow" style={{ color: '#7fb0ff' }}>
            Подключиться
          </span>
          <div className="head">Оставьте контакт</div>
          <p className="lead">Пришлём ссылку для подключения. Выберите, как удобнее.</p>
          <input type="radio" name="method" id="m-phone" className="seg-radio" defaultChecked />
          <input type="radio" name="method" id="m-email" className="seg-radio" />
          <div className="seg">
            <label htmlFor="m-phone">По телефону</label>
            <label htmlFor="m-email">По почте</label>
          </div>
          <form action="#" method="post">
            <input
              className="in-phone"
              type="tel"
              name="phone"
              placeholder="Номер телефона, +7…"
              autoComplete="tel"
              inputMode="tel"
            />
            <input
              className="in-email"
              type="email"
              name="email"
              placeholder="Электронная почта"
              autoComplete="email"
            />
            <button type="submit">Получить доступ</button>
          </form>
          <p className="fine">Нажимая кнопку, вы соглашаетесь с обработкой персональных данных.</p>
        </div>
      </section>

      <section style={{ paddingTop: 56 }}>
        <span className="eyebrow">Что важно знать</span>
        <div className="limits">
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
            <h3>Стикеры и реакции пока не передаются</h3>
            <p>
              Текст, ответы-цитаты, фото, голосовые, видео-кружки и файлы работают в обе стороны.
              Стикеры и реакции — в планах.
            </p>
          </div>
        </div>
      </section>

      <footer>
        <span>Весточка — мост между MAX и Telegram.</span>
        <span>Не является официальным сервисом MAX.</span>
      </footer>
    </div>
  )
}
