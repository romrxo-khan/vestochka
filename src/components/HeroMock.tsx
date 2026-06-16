/**
 * Hero-инфографика: MAX → Весточка → Telegram. Показывает поток сообщений из MAX
 * через сервис в Telegram + что именно передаётся. Чисто презентационный (CSS).
 */
export default function HeroMock() {
  return (
    <div aria-hidden="true">
      <div className="flow">
        <div className="flow-node flow-max">
          <div className="flow-cap">MAX</div>
          <div className="flow-bubbles">
            <span className="fb fb-in" />
            <span className="fb fb-in short" />
            <span className="fb fb-in" />
          </div>
          <div className="flow-sub">сообщения приходят в MAX</div>
        </div>

        <div className="flow-arrow">→</div>

        <div className="flow-node flow-vest">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={42} height={42} className="flow-icon" />
          <div className="flow-cap">Весточка</div>
          <div className="flow-sub">пересылает мгновенно</div>
        </div>

        <div className="flow-arrow">→</div>

        <div className="flow-node flow-tg">
          <div className="flow-cap">Telegram</div>
          <div className="flow-bubbles">
            <span className="fb fb-out" />
            <span className="fb fb-in short" />
            <span className="fb fb-out" />
          </div>
          <div className="flow-sub">в вашем Telegram ✓</div>
        </div>
      </div>

      <div className="flow-chips">
        <span className="flow-chip">💬 текст</span>
        <span className="flow-chip">🎤 голосовые</span>
        <span className="flow-chip">📷 фото</span>
        <span className="flow-chip">⭕ кружки</span>
        <span className="flow-chip">📎 файлы</span>
      </div>
    </div>
  )
}
