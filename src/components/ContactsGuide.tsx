'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CopyCode from './CopyCode'

/**
 * Шаг 4: как появляются собеседники и как писать новым. Внизу — «Готово»,
 * активна только когда группа подключена с правами (защита от незавершённой настройки).
 */
export default function ContactsGuide() {
  const [rightsOk, setRightsOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/telegram/group-status', { cache: 'no-store' })
        const d = await r.json()
        if (d.ok) setRightsOk(Boolean(d.rightsOk))
      } catch {
        /* повторим */
      }
    }
    void check()
    const id = setInterval(check, 4000)
    return () => clearInterval(id)
  }, [])

  async function finish() {
    setBusy(true)
    try {
      await fetch('/api/cabinet/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ done: true }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="lead">
        Контакты добавлять в группу вручную не нужно — каждый чат MAX становится отдельной{' '}
        <strong>темой</strong> сам.
      </p>
      <div className="group-ok" style={{ borderColor: 'var(--blue)', background: 'rgba(127,176,255,.12)', color: '#cfe0ff' }}>
        <span className="group-ok-check" style={{ background: 'var(--blue)' }}>i</span>
        <span>
          Команды для контактов отправляйте боту в <b>«Общей» теме группы</b> — так ничего не
          перепутается.
        </span>
      </div>
      <ul className="guide-steps" style={{ paddingLeft: 0, listStyle: 'none' }}>
        <li>
          💬 <b>Вам написали в MAX</b> — в группе автоматически появится новая тема с именем
          человека. Отвечайте прямо в ней — уйдёт ему в MAX.
        </li>
        <li>
          ✍️ <b>Написать новому</b> — в «Общей» теме отправьте <CopyCode text="/new Имя" /> (например,{' '}
          <CopyCode text="/new Анна" />). Бот найдёт контакт в MAX, покажет совпадения кнопками —
          выберите нужного. Откроется чат, появится тема.
        </li>
        <li>
          📥 <b>Открыть существующий чат</b> — там же <CopyCode text="/import Имя" /> (если переписка
          уже была в MAX).
        </li>
        <li>
          👥 <b>Внутри темы группового чата</b> (3+ человек) команда <CopyCode text="/new" /> или{' '}
          <CopyCode text="/import" /> покажет участников именно этой группы — удобно открыть личку с
          кем-то из них.
        </li>
      </ul>
      <p className="fine">
        Тема создаётся при первой переписке; пустых тем «про запас» нет — это нормально.
      </p>

      <button
        type="button"
        className="pay-btn"
        onClick={() => void finish()}
        disabled={busy || !rightsOk}
        style={{ marginTop: 16 }}
      >
        <span className="pay-btn-title">{busy ? 'Готово…' : 'Готово — в личный кабинет'}</span>
        {!rightsOk && (
          <span className="pay-btn-sub">активна, когда бот добавлен в группу с правами (шаг 3)</span>
        )}
      </button>
    </div>
  )
}
