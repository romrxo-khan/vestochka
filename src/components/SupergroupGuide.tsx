'use client'

import { useState } from 'react'

const BOT = process.env.NEXT_PUBLIC_BOT_USERNAME ?? 'maxvintgbot'

type Lang = 'ru' | 'en'

/** Названия кнопок Telegram по языку интерфейса — чтобы пользователь их легко нашёл. */
const T: Record<Lang, Record<string, string>> = {
  ru: {
    menu: 'меню (☰) → «Создать группу»',
    name: 'назовите группу (например, «Весточка») и создайте',
    edit: 'Изменить',
    topics: 'Темы',
    addMember: 'Добавить участника',
    admins: 'Администраторы',
    addAdmin: 'Добавить администратора',
    manageTopics: 'Управление темами',
    pin: 'Закреплять сообщения',
    save: 'Сохранить (галочка ✓)',
  },
  en: {
    menu: 'menu (☰) → “New Group”',
    name: 'name the group (e.g. “Vestochka”) and create it',
    edit: 'Edit',
    topics: 'Topics',
    addMember: 'Add Member',
    admins: 'Administrators',
    addAdmin: 'Add Admin',
    manageTopics: 'Manage Topics',
    pin: 'Pin Messages',
    save: 'Save (✓)',
  },
}

/**
 * Шаг 3: инструкция по созданию супергруппы и добавлению бота с правами.
 * Сначала спрашиваем язык Telegram, чтобы подсказывать точные названия кнопок.
 */
export default function SupergroupGuide() {
  const [lang, setLang] = useState<Lang | null>(null)

  if (!lang) {
    return (
      <div>
        <p className="lead">
          Последний шаг — создать группу в Telegram, куда бот разложит ваши чаты MAX по темам.
          Подскажу по шагам. <strong>На каком языке у вас Telegram?</strong>
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
      <p className="lead">
        Создайте группу и добавьте бота — сообщения из MAX начнут приходить отдельными темами.
      </p>
      <ol className="guide-steps">
        <li>
          <b>Создайте группу.</b> В Telegram: {t.menu}. Затем {t.name}.
        </li>
        <li>
          <b>Включите темы.</b> Откройте группу → «{t.edit}» → включите «{t.topics}». Группа станет
          супергруппой с темами.
        </li>
        <li>
          <b>Добавьте бота.</b> В группе → «{t.addMember}» → найдите{' '}
          <code>@{BOT}</code> → добавьте.
        </li>
        <li>
          <b>Дайте права.</b> «{t.edit}» → «{t.admins}» → «{t.addAdmin}» → выберите{' '}
          <code>@{BOT}</code> → включите «{t.manageTopics}» и «{t.pin}» → «{t.save}».
        </li>
        <li>
          <b>Готово.</b> Бот разложит чаты MAX по темам этой группы. Отвечайте прямо в темах — уйдёт
          в MAX.
        </li>
      </ol>
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
