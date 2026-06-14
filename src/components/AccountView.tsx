'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SupergroupGuide from './SupergroupGuide'

interface Props {
  email: string
  planLabel: string
  daysRemaining: number
  statusLabel: string
  maxPhone: string | null
  tgLinked: boolean
  refCode: string
  inviteUrl: string
}

/** Основной личный кабинет: данные, подписка, приглашение друга, переоткрыть инструкцию. */
export default function AccountView(p: Props) {
  const [copied, setCopied] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(p.inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* буфер недоступен */
    }
  }

  async function reSetup() {
    setBusy(true)
    try {
      await fetch('/api/cabinet/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ done: false }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="cta" style={{ marginTop: 8 }}>
        <div className="head">Ваши данные</div>
        <div className="acc-rows">
          <div className="acc-row"><span>Почта</span><b>{p.email}</b></div>
          <div className="acc-row"><span>Тариф</span><b>{p.planLabel}</b></div>
          <div className="acc-row"><span>Подписка</span><b>{p.statusLabel} · {p.daysRemaining} дн.</b></div>
          <div className="acc-row"><span>Номер MAX</span><b>{p.maxPhone ?? '—'}</b></div>
          <div className="acc-row"><span>Telegram</span><b>{p.tgLinked ? 'подключён ✅' : 'не подключён'}</b></div>
        </div>
        <button type="button" className="pay-btn alt" onClick={() => void reSetup()} disabled={busy}>
          <span className="pay-btn-title">Изменить настройки</span>
          <span className="pay-btn-sub">переподключить MAX / Telegram, пройти настройку заново</span>
        </button>
      </section>

      <section className="cta" style={{ marginTop: 16 }}>
        <div className="head">Пригласите друга</div>
        <p className="lead">
          Поделитесь ссылкой — друг получит <strong>2 недели бесплатно</strong>, а вы{' '}
          <strong>+1 неделю</strong>. И так за каждого.
        </p>
        <div className="tg-cmd">
          <code>{p.inviteUrl}</code>
          <button type="button" onClick={() => void copyInvite()}>
            {copied ? 'Скопировано ✓' : 'Скопировать'}
          </button>
        </div>
        <p className="fine">Ваш код: <b>{p.refCode}</b> — друг может ввести его при регистрации.</p>
      </section>

      <section className="cta" style={{ marginTop: 16 }}>
        <div className="head">Инструкция по группе</div>
        {showGuide ? (
          <SupergroupGuide />
        ) : (
          <button type="button" className="pay-btn alt" onClick={() => setShowGuide(true)}>
            <span className="pay-btn-title">Открыть инструкцию заново</span>
            <span className="pay-btn-sub">как создать группу и добавить бота</span>
          </button>
        )}
      </section>
    </>
  )
}
