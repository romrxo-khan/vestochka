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
  forceShow = false,
}: {
  linkUrl: string | null
  initialLinked: boolean
  forceShow?: boolean
}) {
  const [linked, setLinked] = useState(initialLinked)
  const [copied, setCopied] = useState(false)
  const [code, setCode] = useState('') // одноразовый код привязки из кабинета
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
        } else if (d.linkCode) {
          setCode(d.linkCode)
        }
      } catch {
        /* нет связи — попробуем на следующем тике */
      }
    }
    void check() // сразу, не ждём первый тик (чтобы показать код без задержки)
    const id = setInterval(check, 3000)
    return () => clearInterval(id)
  }, [linked, router])

  if (linked && !forceShow) {
    return (
      <p className="lead">
        Telegram подключён ✅ Сообщения из MAX и уведомления будут приходить в бота.
      </p>
    )
  }

  if (!linkUrl) return <p className="fine">Бот скоро будет доступен здесь.</p>

  // Фолбэк: если бот уже открыт, Telegram не пересылает /start — юзер шлёт боту КОД.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
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
        Кнопка «Start» не появилась (бот уже был открыт)? Пришлите боту этот код:
      </p>
      <div className="tg-cmd">
        <code>{code || '…'}</code>
        <button type="button" onClick={() => void copy()} disabled={!code}>
          {copied ? 'Скопировано ✓' : 'Скопировать'}
        </button>
      </div>
      <p className="fine">После отправки вернитесь сюда — подтвердим автоматически.</p>
    </>
  )
}
