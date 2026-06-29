'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SupergroupGuide from './SupergroupGuide'
import ContactsGuide from './ContactsGuide'
import MaxConnect from './MaxConnect'
import TelegramLink from './TelegramLink'
import CopyCode from './CopyCode'

interface Props {
  email: string
  planLabel: string
  daysRemaining: number
  statusLabel: string
  maxPhone: string | null
  needsReauth: boolean
  sessionId: string
  tgLinked: boolean
  groupOk: boolean
  groupTitle: string | null
  refCode: string
  inviteUrl: string
  linkUrl: string | null
}

type Panel = 'none' | 'max' | 'tg' | 'group' | 'reauth'

/** Личный кабинет: данные, реальные действия (сменить MAX / заменить TG), группа, приглашение. */
export default function AccountView(p: Props) {
  const [copied, setCopied] = useState(false)
  const [panel, setPanel] = useState<Panel>('none')
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

  async function changeMax() {
    setBusy(true)
    try {
      await fetch('/api/cabinet/reset-max', { method: 'POST' })
      setPanel('max')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const toggle = (x: Panel) => setPanel((cur) => (cur === x ? 'none' : x))

  return (
    <>
      {p.needsReauth && (
        <section
          className="cta"
          style={{ marginTop: 8, borderColor: '#ffb020', background: 'rgba(255,176,32,.07)' }}
        >
          <div className="head">🔌 Сессия MAX отключилась</div>
          <p className="lead">
            Сообщения из MAX не приходят, пока вы не войдёте заново. Это <strong>тот же номер</strong>,
            не нужно ничего менять — просто подтвердите вход кодом из SMS.
          </p>
          <button type="button" className="pay-btn" onClick={() => toggle('reauth')}>
            <span className="pay-btn-title">Обновить вход в MAX</span>
            <span className="pay-btn-sub">войти заново тем же номером</span>
          </button>
          {panel === 'reauth' && (
            <div style={{ marginTop: 12 }}>
              <MaxConnect sessionId={p.sessionId} canConnect />
            </div>
          )}
        </section>
      )}

      <section className="cta" style={{ marginTop: 8 }}>
        <div className="head">Ваши данные</div>
        <div className="acc-rows">
          <div className="acc-row"><span>Почта</span><b>{p.email}</b></div>
          <div className="acc-row"><span>Номер MAX</span><b>{p.maxPhone ?? '—'}</b></div>
          <div className="acc-row"><span>Telegram</span><b>{p.tgLinked ? 'подключён ✅' : 'не подключён'}</b></div>
          <div className="acc-row"><span>Группа</span><b>{p.groupOk ? `${p.groupTitle ?? 'подключена'} ✅` : 'не подключена'}</b></div>
          <div className="acc-row"><span>Тариф</span><b>{p.planLabel}</b></div>
          <div className="acc-row"><span>Подписка</span><b>{p.statusLabel} · {p.daysRemaining} дн.</b></div>
        </div>
      </section>

      <section className="cta" style={{ marginTop: 16 }}>
        <div className="head">Управление подключением</div>

        <button type="button" className="pay-btn alt" onClick={() => void changeMax()} disabled={busy}>
          <span className="pay-btn-title">Сменить номер MAX</span>
          <span className="pay-btn-sub">отвяжем текущий и подключим новый</span>
        </button>
        {panel === 'max' && (
          <div style={{ marginTop: 12 }}>
            <MaxConnect sessionId="" canConnect />
          </div>
        )}

        <button type="button" className="pay-btn alt" onClick={() => toggle('tg')} style={{ marginTop: 10 }}>
          <span className="pay-btn-title">Заменить аккаунт Telegram</span>
          <span className="pay-btn-sub">привязать другой Telegram к этому аккаунту</span>
        </button>
        {panel === 'tg' && (
          <div style={{ marginTop: 12 }}>
            <TelegramLink linkUrl={p.linkUrl} initialLinked={p.tgLinked} forceShow />
          </div>
        )}

        <button type="button" className="pay-btn alt" onClick={() => toggle('group')} style={{ marginTop: 10 }}>
          <span className="pay-btn-title">Инструкция по группе и контактам</span>
          <span className="pay-btn-sub">как создать группу, добавить бота, писать новым</span>
        </button>
        {panel === 'group' && (
          <div style={{ marginTop: 12 }}>
            <SupergroupGuide />
            <div style={{ marginTop: 20 }}>
              <ContactsGuide />
            </div>
          </div>
        )}
      </section>

      <section className="cta" style={{ marginTop: 16 }}>
        <div className="head">Пригласите друга</div>
        <p className="lead">
          Друг получит <strong>2 недели бесплатно</strong>, а вы <strong>+1 неделю</strong>. И так за
          каждого.
        </p>
        <p className="fine" style={{ marginBottom: 6 }}>Ваш код приглашения (нажмите, чтобы скопировать):</p>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 2, marginBottom: 14 }}>
          <CopyCode text={p.refCode} />
        </div>
        <p className="fine" style={{ marginBottom: 6 }}>Или поделитесь ссылкой:</p>
        <div className="tg-cmd">
          <code>{p.inviteUrl}</code>
          <button type="button" onClick={() => void copyInvite()}>
            {copied ? 'Скопировано ✓' : 'Скопировать'}
          </button>
        </div>
      </section>
    </>
  )
}
