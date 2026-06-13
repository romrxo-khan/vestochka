'use client'

import { useState } from 'react'

/** Шаг подключения MAX: ввод номера → анти-абуз (один номер = один аккаунт) → дальше вход в MAX. */
export default function MaxConnect({
  sessionId,
  canConnect,
}: {
  sessionId: string
  canConnect: boolean
}) {
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/onboarding/claim-phone', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, phone }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        if (data.error === 'taken')
          setError('Этот номер MAX уже используется в другом аккаунте Весточки.')
        else if (data.error === 'invalid') setError('Проверьте номер телефона.')
        else setError('Не удалось сохранить номер. Попробуйте ещё раз.')
        return
      }
      setDone(true)
    } catch {
      setError('Нет связи с сервером. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <p className="lead" style={{ marginTop: 16 }}>
        Номер записан ✅ Дальше — вход в MAX по коду из SMS. Откроем этот шаг прямо здесь.
      </p>
    )
  }

  return (
    <form onSubmit={submit}>
      <input
        type="tel"
        name="max_phone"
        placeholder="Номер MAX, +7 9XX…"
        autoComplete="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button type="submit" disabled={busy || !phone || !canConnect}>
        {busy ? 'Сохраняем…' : 'Продолжить'}
      </button>
      {!canConnect && (
        <p className="fine">Откройте кабинет по ссылке из подтверждения оплаты.</p>
      )}
      {error && (
        <p className="fine" style={{ color: '#e0506a' }}>
          {error}
        </p>
      )}
    </form>
  )
}
