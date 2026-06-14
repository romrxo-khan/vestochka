'use client'

import { useEffect, useState } from 'react'

interface GroupStatus {
  connected: boolean
  rightsOk: boolean
  title: string | null
}

const BOT = process.env.NEXT_PUBLIC_BOT_USERNAME ?? 'maxvintgbot'

type Lang = 'ru' | 'en' | 'de' | 'es' | 'he'

interface Labels {
  newGroup: string
  contacts: string
  calls: string
  edit: string
  topics: string
  history: string
  addMember: string
  search: string
  admins: string
  addAdmin: string
  manageTopics: string
  pin: string
}

/**
 * Названия кнопок Telegram на языке интерфейса пользователя. Инструкции вокруг
 * остаются на русском (аудитория — русскоязычная эмиграция), а кнопки в мокапах
 * показываем так, как они подписаны на ЕГО телефоне — чтобы он их нашёл.
 */
const LABELS: Record<Lang, Labels> = {
  ru: {
    newGroup: 'Создать группу', contacts: 'Контакты', calls: 'Звонки', edit: 'Изменить',
    topics: 'Темы', history: 'История чата', addMember: 'Добавить участника', search: 'Поиск',
    admins: 'Администраторы', addAdmin: 'Добавить администратора', manageTopics: 'Управление темами',
    pin: 'Закреплять сообщения',
  },
  en: {
    newGroup: 'New Group', contacts: 'Contacts', calls: 'Calls', edit: 'Edit',
    topics: 'Topics', history: 'Chat History', addMember: 'Add Member', search: 'Search',
    admins: 'Administrators', addAdmin: 'Add Admin', manageTopics: 'Manage Topics',
    pin: 'Pin Messages',
  },
  de: {
    newGroup: 'Neue Gruppe', contacts: 'Kontakte', calls: 'Anrufe', edit: 'Bearbeiten',
    topics: 'Themen', history: 'Chatverlauf', addMember: 'Mitglied hinzufügen', search: 'Suche',
    admins: 'Administratoren', addAdmin: 'Administrator hinzufügen', manageTopics: 'Themen verwalten',
    pin: 'Nachrichten anpinnen',
  },
  es: {
    newGroup: 'Nuevo grupo', contacts: 'Contactos', calls: 'Llamadas', edit: 'Editar',
    topics: 'Temas', history: 'Historial del chat', addMember: 'Añadir miembro', search: 'Buscar',
    admins: 'Administradores', addAdmin: 'Añadir administrador', manageTopics: 'Gestionar temas',
    pin: 'Fijar mensajes',
  },
  he: {
    newGroup: 'קבוצה חדשה', contacts: 'אנשי קשר', calls: 'שיחות', edit: 'עריכה',
    topics: 'נושאים', history: "היסטוריית צ'אט", addMember: 'הוספת חבר', search: 'חיפוש',
    admins: 'מנהלים', addAdmin: 'הוספת מנהל', manageTopics: 'ניהול נושאים',
    pin: 'הצמדת הודעות',
  },
}

const PICKER: Array<{ id: Lang; label: string }> = [
  { id: 'ru', label: '🇷🇺 Русский' },
  { id: 'en', label: '🇬🇧 English' },
  { id: 'de', label: '🇩🇪 Deutsch' },
  { id: 'es', label: '🇪🇸 Español' },
  { id: 'he', label: '🇮🇱 עברית' },
]

function Row({ label, hl, icon, chevron, toggle }: {
  label: string
  hl?: boolean
  icon?: string
  chevron?: boolean
  toggle?: 'on' | 'off'
}) {
  return (
    <div className={`tg-row${hl ? ' hl' : ''}`}>
      <span className="tg-row-label">
        {icon && <span className="tg-ic">{icon}</span>}
        {label}
      </span>
      {toggle && <span className={`tg-toggle${toggle === 'on' ? ' on' : ''}`} />}
      {chevron && <span className="tg-chev">›</span>}
    </div>
  )
}

function Phone({ title, rtl, children, tap }: {
  title: string
  rtl: boolean
  children: React.ReactNode
  tap: string
}) {
  return (
    <div className="tg-mock">
      <div className="tg-phone" dir={rtl ? 'rtl' : 'ltr'}>
        <div className="tg-bar">{title}</div>
        {children}
      </div>
      <div className="tg-tap">
        <span className="tg-tap-dot" /> {tap}
      </div>
    </div>
  )
}

/** Шаг 3: визуальная инструкция по группе. Язык Telegram → подписи кнопок на нём. */
export default function SupergroupGuide({ showDone = false }: { showDone?: boolean }) {
  const [lang, setLang] = useState<Lang | null>(null)
  const [status, setStatus] = useState<GroupStatus | null>(null)

  // В режиме онбординга (showDone) следим за статусом группы — подсказываем,
  // добавлен ли бот в группу с правами (защита от «забыл добавить»).
  useEffect(() => {
    if (!showDone) return
    const check = async () => {
      try {
        const r = await fetch('/api/telegram/group-status', { cache: 'no-store' })
        const d = await r.json()
        if (d.ok) setStatus({ connected: d.connected, rightsOk: d.rightsOk, title: d.title })
      } catch {
        /* нет связи — повторим */
      }
    }
    void check()
    const id = setInterval(check, 4000)
    return () => clearInterval(id)
  }, [showDone])

  if (!lang) {
    return (
      <div>
        <p className="lead">
          Последний шаг — создать группу в Telegram, куда бот разложит ваши чаты MAX по темам.
          Покажу по шагам с картинками. <strong>На каком языке у вас Telegram?</strong>
        </p>
        {PICKER.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={i === 0 ? 'pay-btn' : 'pay-btn alt'}
            onClick={() => setLang(p.id)}
          >
            <span className="pay-btn-title">{p.label}</span>
          </button>
        ))}
      </div>
    )
  }

  const L = LABELS[lang]
  const rtl = lang === 'he'
  return (
    <div>
      <p className="lead">Создайте группу и добавьте бота — 4 шага по картинкам ниже.</p>

      <div className="guide-card">
        <div className="guide-num">1</div>
        <div className="guide-body">
          <div className="guide-cap">Создайте группу</div>
          <div className="guide-desc">Меню (☰) вверху слева → «{L.newGroup}». Назовите и создайте.</div>
          <Phone title="☰  Telegram" rtl={rtl} tap={`Нажмите «${L.newGroup}»`}>
            <Row label={L.newGroup} icon="👥" hl chevron />
            <Row label={L.contacts} icon="👤" />
            <Row label={L.calls} icon="📞" />
          </Phone>
        </div>
      </div>

      <div className="guide-card">
        <div className="guide-num">2</div>
        <div className="guide-body">
          <div className="guide-cap">Включите темы</div>
          <div className="guide-desc">Откройте группу → «{L.edit}» → включите «{L.topics}».</div>
          <Phone title={`Весточка · ${L.edit}`} rtl={rtl} tap={`Включите «${L.topics}»`}>
            <Row label={L.topics} icon="🗂️" hl toggle="on" />
            <Row label={L.history} icon="🕘" toggle="off" />
            <Row label={L.admins} icon="🛡️" chevron />
          </Phone>
        </div>
      </div>

      <div className="guide-card">
        <div className="guide-num">3</div>
        <div className="guide-body">
          <div className="guide-cap">Добавьте бота</div>
          <div className="guide-desc">В группе → «{L.addMember}» → найдите бота → добавьте.</div>
          <Phone title={L.addMember} rtl={rtl} tap="Найдите и добавьте бота">
            <div className="tg-search">🔎 {L.search}: {BOT}</div>
            <Row label={`@${BOT}`} icon="🐦" hl chevron />
          </Phone>
        </div>
      </div>

      <div className="guide-card">
        <div className="guide-num">4</div>
        <div className="guide-body">
          <div className="guide-cap">Дайте права боту</div>
          <div className="guide-desc">
            «{L.edit}» → «{L.admins}» → «{L.addAdmin}» → бот → включите «{L.manageTopics}».
          </div>
          <Phone title={L.admins} rtl={rtl} tap={`Включите «${L.manageTopics}»`}>
            <Row label={L.manageTopics} icon="🗂️" hl toggle="on" />
            <Row label={L.pin} icon="📌" toggle="on" />
          </Phone>
        </div>
      </div>

      <p className="guide-done">
        ✅ Чаты MAX начнут приходить отдельными темами в этой группе. Отвечайте прямо в темах.
      </p>

      {showDone && (
        // Живой статус — защита от «забыл добавить бота / не дал прав».
        !status || !status.connected ? (
          <div className="onb-status" style={{ marginTop: 16 }}>
            <span className="onb-spinner" />
            <span className="onb-status-text" style={{ color: '#e6b566' }}>
              Бот ещё не добавлен в группу — выполните шаги выше. Ждём…
            </span>
          </div>
        ) : !status.rightsOk ? (
          <p className="onb-note" style={{ color: '#e0506a', marginTop: 16 }}>
            ⚠️ Бот в группе{status.title ? ` «${status.title}»` : ''}, но без прав. Сделайте его
            администратором с правом «{LABELS[lang].manageTopics}» (шаг 4).
          </p>
        ) : (
          <p className="guide-done" style={{ marginTop: 16 }}>
            ✅ Группа{status.title ? ` «${status.title}»` : ''} подключена.
          </p>
        )
      )}
      <p className="fine">
        Язык не тот?{' '}
        <button
          type="button"
          onClick={() => setLang(null)}
          style={{ background: 'none', border: 0, color: '#7fb0ff', cursor: 'pointer', padding: 0 }}
        >
          сменить
        </button>
      </p>
    </div>
  )
}
