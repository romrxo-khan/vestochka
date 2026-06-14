'use client'

import { useState } from 'react'

const BOT = process.env.NEXT_PUBLIC_BOT_USERNAME ?? 'maxvintgbot'

type Lang = 'ru' | 'en'

/** Подписи кнопок Telegram по языку интерфейса — внутри мокапов и в подсказках. */
const T: Record<Lang, Record<string, string>> = {
  ru: {
    tgTitle: 'Telegram',
    newGroup: 'Создать группу',
    contacts: 'Контакты',
    calls: 'Звонки',
    groupTitle: 'Весточка',
    edit: 'Изменить',
    topics: 'Темы',
    history: 'История чата',
    addMember: 'Добавить участника',
    search: 'Поиск',
    admins: 'Администраторы',
    addAdmin: 'Добавить администратора',
    manageTopics: 'Управление темами',
    pin: 'Закреплять сообщения',
    tapNewGroup: 'Нажмите «Создать группу»',
    tapTopics: 'Включите «Темы»',
    tapBot: 'Найдите и добавьте бота',
    tapPerm: 'Включите «Управление темами»',
    cap1: 'Создайте группу',
    cap1d: 'Меню (☰) вверху слева → «Создать группу». Назовите её и создайте.',
    cap2: 'Включите темы',
    cap2d: 'Откройте группу → «Изменить» → включите «Темы».',
    cap3: 'Добавьте бота',
    cap3d: 'В группе → «Добавить участника» → найдите бота → добавьте.',
    cap4: 'Дайте права боту',
    cap4d: '«Изменить» → «Администраторы» → «Добавить администратора» → бот → включите «Управление темами».',
    done: 'Готово! Чаты MAX начнут приходить отдельными темами в этой группе. Отвечайте прямо в темах.',
  },
  en: {
    tgTitle: 'Telegram',
    newGroup: 'New Group',
    contacts: 'Contacts',
    calls: 'Calls',
    groupTitle: 'Vestochka',
    edit: 'Edit',
    topics: 'Topics',
    history: 'Chat History',
    addMember: 'Add Member',
    search: 'Search',
    admins: 'Administrators',
    addAdmin: 'Add Admin',
    manageTopics: 'Manage Topics',
    pin: 'Pin Messages',
    tapNewGroup: 'Tap “New Group”',
    tapTopics: 'Turn on “Topics”',
    tapBot: 'Find and add the bot',
    tapPerm: 'Turn on “Manage Topics”',
    cap1: 'Create a group',
    cap1d: 'Menu (☰) top-left → “New Group”. Name it and create.',
    cap2: 'Enable topics',
    cap2d: 'Open the group → “Edit” → turn on “Topics”.',
    cap3: 'Add the bot',
    cap3d: 'In the group → “Add Member” → find the bot → add it.',
    cap4: 'Give the bot rights',
    cap4d: '“Edit” → “Administrators” → “Add Admin” → bot → turn on “Manage Topics”.',
    done: 'Done! Your MAX chats will arrive as separate topics in this group. Reply right in the topics.',
  },
}

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

/** Мокап экрана телефона + подпись «нажмите сюда». */
function Phone({ title, children, tap }: { title: string; children: React.ReactNode; tap: string }) {
  return (
    <div className="tg-mock">
      <div className="tg-phone">
        <div className="tg-bar">{title}</div>
        {children}
      </div>
      <div className="tg-tap">
        <span className="tg-tap-dot" /> {tap}
      </div>
    </div>
  )
}

/**
 * Шаг 3: визуальная инструкция по группе. Сначала язык Telegram, затем
 * иллюстрированные шаги с подсветкой нужных кнопок (подписи на выбранном языке).
 */
export default function SupergroupGuide() {
  const [lang, setLang] = useState<Lang | null>(null)

  if (!lang) {
    return (
      <div>
        <p className="lead">
          Последний шаг — создать группу в Telegram, куда бот разложит ваши чаты MAX по темам.
          Покажу по шагам с картинками. <strong>На каком языке у вас Telegram?</strong>
        </p>
        <button type="button" className="pay-btn" onClick={() => setLang('ru')}>
          <span className="pay-btn-title">🇷🇺 Русский</span>
        </button>
        <button type="button" className="pay-btn alt" onClick={() => setLang('en')}>
          <span className="pay-btn-title">🌍 English / другой</span>
        </button>
      </div>
    )
  }

  const t = T[lang]
  return (
    <div>
      <p className="lead">Создайте группу и добавьте бота — сделайте 4 шага по картинкам ниже.</p>

      <div className="guide-card">
        <div className="guide-num">1</div>
        <div className="guide-body">
          <div className="guide-cap">{t.cap1}</div>
          <div className="guide-desc">{t.cap1d}</div>
          <Phone title={`☰  ${t.tgTitle}`} tap={t.tapNewGroup}>
            <Row label={t.newGroup} icon="👥" hl chevron />
            <Row label={t.contacts} icon="👤" />
            <Row label={t.calls} icon="📞" />
          </Phone>
        </div>
      </div>

      <div className="guide-card">
        <div className="guide-num">2</div>
        <div className="guide-body">
          <div className="guide-cap">{t.cap2}</div>
          <div className="guide-desc">{t.cap2d}</div>
          <Phone title={`${t.groupTitle} · ${t.edit}`} tap={t.tapTopics}>
            <Row label={t.topics} icon="🗂️" hl toggle="on" />
            <Row label={t.history} icon="🕘" toggle="off" />
            <Row label={t.admins} icon="🛡️" chevron />
          </Phone>
        </div>
      </div>

      <div className="guide-card">
        <div className="guide-num">3</div>
        <div className="guide-body">
          <div className="guide-cap">{t.cap3}</div>
          <div className="guide-desc">{t.cap3d}</div>
          <Phone title={t.addMember} tap={t.tapBot}>
            <div className="tg-search">🔎 {t.search}: {BOT}</div>
            <Row label={`@${BOT}`} icon="🐦" hl chevron />
          </Phone>
        </div>
      </div>

      <div className="guide-card">
        <div className="guide-num">4</div>
        <div className="guide-body">
          <div className="guide-cap">{t.cap4}</div>
          <div className="guide-desc">{t.cap4d}</div>
          <Phone title={t.admins} tap={t.tapPerm}>
            <Row label={t.manageTopics} icon="🗂️" hl toggle="on" />
            <Row label={t.pin} icon="📌" toggle="on" />
          </Phone>
        </div>
      </div>

      <p className="guide-done">✅ {t.done}</p>
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
