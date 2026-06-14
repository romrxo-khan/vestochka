'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Шаг 1: подключение Telegram. Кнопка открывает бота в новой вкладке; здесь же
 * опрашиваем статус и АВТОМАТИЧЕСКИ подтверждаем привязку, когда бот её зафиксировал
 * (чинит кейс «уже запускал бота — открылся старый чат, подтверждения не видно»).
 */
export default function TelegramLink({
  linkUrl,
  initialLinked,
}: {
  linkUrl: string | null
  initialLinked: boolean
}) {
  const [linked, setLinked] = useState(initialLinked)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (linked) return
    const check = async () => {
      try {
        const r = await fetch('/api/telegram/status', { cache: 'no-store' })
        const d = await r.json()
        if (d.linked) {
          setLinked(true)
          router.refresh() // обновляем страницу (Шаг 3 зависит от привязки)
        }
      } catch {
        /* нет связи — попробуем на следующем тике */
      }
    }
    const id = setInterval(check, 3000)
    return () => clearInterval(id)
  }, [linked, router])

  if (linked) {
    return (
      <p className="lead">
        Telegram подключён ✅ Сообщения из MAX и уведомления будут приходить в бота.
      </p>
    )
  }

  if (!linkUrl) return <p className="fine">Бот скоро будет доступен здесь.</p>

  // Команда-фолбэк: если бот уже открыт, Telegram не пересылает /start — даём отправить вручную.
  const token = linkUrl.split('start=')[1] ?? ''
  const command = `/start ${token}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* буфер недоступен — пользователь скопирует вручную */
    }
  }

  return (
    <>
      <p className="lead">Откройте нашего бота — туда будут приходить сообщения из MAX и напоминания.</p>
      <a
        className="pay-btn"
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none' }}
      >
        <span className="pay-btn-title">Открыть бота в Telegram</span>
        <span className="pay-btn-sub">откроется в новой вкладке — подтвердим автоматически</span>
      </a>
      <p className="fine" style={{ marginTop: 12 }}>
        Бот уже был открыт и кнопка «Start» не появилась? Отправьте ему эту команду:
      </p>
      <div className="tg-cmd">
        <code>{command}</code>
        <button type="button" onClick={() => void copy()}>
          {copied ? 'Скопировано ✓' : 'Скопировать'}
        </button>
      </div>
      <p className="fine">После отправки вернитесь сюда — подтвердим автоматически.</p>
    </>
  )
}
