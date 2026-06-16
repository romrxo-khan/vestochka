/**
 * Наглядный мокап сервиса для лендинга: телефон с чатом Telegram, куда «Весточка»
 * пересылает сообщения из MAX (текст, голосовое, фото, ответ из Telegram).
 * Чисто презентационный (SVG/CSS), без данных — безопасно рендерить на сервере.
 */
export default function HeroMock() {
  return (
    <div className="mk" aria-hidden="true">
      <div className="mk-phone">
        <div className="mk-bar">
          <div className="mk-ava">👨‍👩‍👧</div>
          <div>
            <div className="mk-bar-t">Семья</div>
            <div className="mk-bar-s">пересылается из MAX</div>
          </div>
        </div>

        <div className="mk-chat">
          <div className="mk-badge">📨 Весточка · из MAX в Telegram</div>

          <div className="mk-b mk-in">
            <div className="mk-name">👤 Мама</div>
            Ты доехал? 🙂
          </div>

          <div className="mk-b mk-in mk-voice">
            <div className="mk-name">👤 Мама</div>
            <div className="mk-voice-row">
              <span className="mk-play">▶</span>
              <span className="mk-wave" />
              <span className="mk-dur">0:08</span>
            </div>
          </div>

          <div className="mk-b mk-out">Да, всё хорошо — спасибо! 🙌</div>

          <div className="mk-b mk-in">
            <div className="mk-name">👤 Папа</div>
            <div className="mk-photo">
              <span>📷 фото</span>
            </div>
            С рыбалки 🎣
          </div>

          <div className="mk-b mk-out">Огонь! Вечером наберу 📞</div>
        </div>
      </div>
    </div>
  )
}
