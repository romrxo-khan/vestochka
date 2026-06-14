'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Шаг подключения MAX. Зеркалит движок входа в контейнере через канал-брокер (сайт):
 *   телефон → капча (авто) → код из SMS → пароль доступа (2FA) → готово.
 * Пользователь вводит только телефон, код и (если включена доп.защита) пароль.
 */
type State =
  | 'IDLE'
  | 'QUEUED'
  | 'LOADING'
  | 'PHONE_REQUIRED'
  | 'SOLVING_CAPTCHA'
  | 'HUMAN_CAPTCHA_REQUIRED'
  | 'CODE_REQUIRED'
  | 'PASSWORD_REQUIRED'
  | 'NAME_REQUIRED'
  | 'ONLINE'
  | 'ERROR'

const STEP_LABELS = ['Запуск', 'Проверка', 'Код', 'Готово']

/** Дружелюбный статус + индекс шага для каждого состояния движка. */
function statusFor(state: State): { text: string; step: number } {
  switch (state) {
    case 'QUEUED':
      return { text: 'Запускаем подключение…', step: 0 }
    case 'LOADING':
      return { text: 'Открываем MAX…', step: 0 }
    case 'PHONE_REQUIRED':
      return { text: 'Передаём номер…', step: 0 }
    case 'SOLVING_CAPTCHA':
      return { text: 'Проходим проверку «не робот»…', step: 1 }
    case 'CODE_REQUIRED':
      return { text: 'Код из SMS', step: 2 }
    case 'PASSWORD_REQUIRED':
      return { text: 'Пароль доступа', step: 2 }
    case 'NAME_REQUIRED':
      return { text: 'Регистрация', step: 2 }
    case 'ONLINE':
      return { text: 'Готово', step: 3 }
    default:
      return { text: 'Подключаемся…', step: 0 }
  }
}

/** Полоска шагов: пройденные — зелёные, текущий — пульсирует. */
function Steps({ current }: { current: number }) {
  return (
    <div className="onb-steps">
      {STEP_LABELS.map((label, i) => (
        <span
          key={label}
          className={`onb-step ${i < current ? 'done' : i === current ? 'active' : ''}`}
        >
          <span className="dot" />
          {label}
        </span>
      ))}
    </div>
  )
}

const WORKING: State[] = ['QUEUED', 'LOADING', 'PHONE_REQUIRED', 'SOLVING_CAPTCHA']

export default function MaxConnect({ canConnect }: { sessionId: string; canConnect: boolean }) {
  const [state, setState] = useState<State>('IDLE')
  const [detail, setDetail] = useState<string | null>(null)
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [value, setValue] = useState('') // код / пароль / имя
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [active, setActive] = useState(false) // пошёл ли онбординг (включает опрос)
  const [elapsedSec, setElapsedSec] = useState(0) // сколько идём в «рабочем» состоянии
  const lastSent = useRef<State | null>(null)

  // Тикаем секунды, пока крутится рабочее состояние — для подписи «дольше обычного».
  useEffect(() => {
    if (!WORKING.includes(state)) {
      setElapsedSec(0)
      return
    }
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [state])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding', { cache: 'no-store' })
      if (!res.ok) return
      const d = await res.json()
      setState(d.state as State)
      setDetail(d.detail ?? null)
      setCaptcha(d.captchaImage ?? null)
      if (d.state !== 'IDLE') setActive(true)
      if (['CODE_REQUIRED', 'PASSWORD_REQUIRED', 'NAME_REQUIRED'].includes(d.state)) {
        if (lastSent.current && lastSent.current !== d.state) setValue('')
        lastSent.current = null
      }
    } catch {
      /* нет связи — попробуем на следующем тике */
    }
  }, [])

  // Опрос состояния, пока онбординг активен и не финальное.
  useEffect(() => {
    if (!active) return
    void refresh()
    const id = setInterval(() => {
      void refresh()
    }, 2000)
    return () => clearInterval(id)
  }, [active, refresh])

  // Резюмируем, если сессия уже идёт (перезагрузили страницу).
  useEffect(() => {
    void refresh()
  }, [refresh])

  async function post(body: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> {
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await res.json().catch(() => ({ ok: false }))
    return { ok: res.ok && d.ok, message: d.message }
  }

  async function startWithPhone(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const s = await post({ action: 'start' })
      if (!s.ok) {
        setError('Не удалось начать подключение. Попробуйте ещё раз.')
        return
      }
      const r = await post({ action: 'input', kind: 'phone', value: phone })
      if (!r.ok) {
        setError(r.message ?? 'Проверьте номер телефона.')
        return
      }
      setActive(true)
      setState('QUEUED')
    } catch {
      setError('Нет связи с сервером. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  async function sendValue(kind: 'code' | 'password' | 'name') {
    setError('')
    setBusy(true)
    lastSent.current = state
    try {
      const r = await post({ action: 'input', kind, value })
      if (!r.ok) setError(r.message ?? 'Не удалось отправить. Попробуйте ещё раз.')
    } catch {
      setError('Нет связи с сервером.')
    } finally {
      setBusy(false)
    }
  }

  async function retry() {
    setError('')
    setValue('')
    setBusy(true)
    try {
      await post({ action: 'start' })
      setState('QUEUED')
      setActive(true)
    } finally {
      setBusy(false)
    }
  }

  const errBox = error && (
    <p className="fine" style={{ color: '#e0506a' }}>
      {error}
    </p>
  )

  // ── Рендер по состоянию ────────────────────────────────────────────────────
  if (state === 'ONLINE') {
    return <p className="lead" style={{ marginTop: 12 }}>MAX подключён ✅ Сообщения пойдут в Telegram.</p>
  }

  if (state === 'CODE_REQUIRED' || state === 'PASSWORD_REQUIRED' || state === 'NAME_REQUIRED') {
    const cfg =
      state === 'CODE_REQUIRED'
        ? { kind: 'code' as const, label: 'Код из SMS', ph: '••••••', im: 'numeric' as const, type: 'text' }
        : state === 'PASSWORD_REQUIRED'
          ? { kind: 'password' as const, label: 'Пароль доступа MAX', ph: 'Ваш пароль', im: 'text' as const, type: 'password' }
          : { kind: 'name' as const, label: 'Как вас зовут', ph: 'Имя', im: 'text' as const, type: 'text' }
    return (
      <div style={{ marginTop: 8 }}>
        <Steps current={statusFor(state).step} />
        <p className="lead" style={{ marginTop: 14 }}>
          {state === 'CODE_REQUIRED'
            ? 'MAX прислал код в SMS — введите его.'
            : state === 'PASSWORD_REQUIRED'
              ? 'Ваш аккаунт под доп. защитой — введите пароль доступа MAX.'
              : 'Аккаунта на этом номере нет — зарегистрируем. Введите имя.'}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void sendValue(cfg.kind)
          }}
        >
          <input
            type={cfg.type}
            placeholder={cfg.ph}
            inputMode={cfg.im}
            autoComplete={cfg.kind === 'password' ? 'off' : 'one-time-code'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="submit" disabled={busy || !value}>
            {busy ? 'Отправляем…' : 'Продолжить'}
          </button>
        </form>
        {errBox}
      </div>
    )
  }

  if (state === 'HUMAN_CAPTCHA_REQUIRED') {
    return (
      <div style={{ marginTop: 8 }}>
        <p className="lead">Нужна проверка «не робот». Решите её ниже.</p>
        {captcha && (
          <img
            src={`data:image/png;base64,${captcha}`}
            alt="Проверка"
            style={{ maxWidth: '100%', borderRadius: 12, border: '1px solid #2a3550' }}
          />
        )}
        <p className="fine">Если картинка не обновляется — подождите пару секунд.</p>
      </div>
    )
  }

  if (state === 'ERROR') {
    return (
      <div style={{ marginTop: 8 }}>
        <p className="lead" style={{ color: '#e0506a' }}>
          Не получилось{detail ? `: ${detail}` : ''}.
        </p>
        <button type="button" onClick={() => void retry()} disabled={busy}>
          Попробовать снова
        </button>
      </div>
    )
  }

  // Активный промежуточный шаг (запуск/капча/ждём телефон) — живой индикатор.
  if (active && state !== 'IDLE') {
    const { text, step } = statusFor(state)
    return (
      <div style={{ marginTop: 8 }}>
        <div className="onb-status">
          <span className="onb-spinner" />
          <span className="onb-status-text">{text}</span>
        </div>
        <Steps current={step} />
        <p className="onb-note">
          {elapsedSec >= 25
            ? 'Идёт чуть дольше обычного — MAX иногда отвечает не сразу. Не закрывайте страницу, мы продолжаем.'
            : 'Не закрывайте страницу — обычно занимает несколько секунд.'}
        </p>
      </div>
    )
  }

  // Старт: ввод номера MAX.
  return (
    <form onSubmit={startWithPhone}>
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
        {busy ? 'Подключаем…' : 'Подключить MAX'}
      </button>
      {!canConnect && <p className="fine">Откройте кабинет по ссылке из письма-подтверждения.</p>}
      {errBox}
    </form>
  )
}
