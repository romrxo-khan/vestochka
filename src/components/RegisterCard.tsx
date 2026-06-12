'use client'

import { useState } from 'react'

type Method = 'phone' | 'email'
type Step = 'contact' | 'code' | 'done'

/** Окно регистрации/входа: ввод контакта → код подтверждения → готово. */
export default function RegisterCard() {
  const [method, setMethod] = useState<Method>('phone')
  const [step, setStep] = useState<Step>('contact')
  const [contact, setContact] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const labelFor = method === 'phone' ? 'номер телефона' : 'почту'

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channel: method, contact }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        if (data.error === 'cooldown') setError(`Подождите ${data.retryAfterSec} c и попробуйте снова.`)
        else if (data.error === 'rate_limited')
          setError('Слишком много запросов. Попробуйте позже.')
        else if (data.error === 'invalid_contact') setError(`Проверьте ${labelFor}.`)
        else if (data.error === 'sms_failed' || data.error === 'send_failed')
          setError('Не удалось отправить код. Попробуйте ещё раз.')
        else setError('Что-то пошло не так. Попробуйте ещё раз.')
        return
      }
      setStep('code')
    } catch {
      setError('Нет связи с сервером. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  async function verify(e?: React.FormEvent) {
    e?.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channel: method, contact, code }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        if (data.error === 'mismatch') setError('Неверный код. Проверьте и повторите.')
        else if (data.error === 'expired') setError('Код истёк. Запросите новый.')
        else if (data.error === 'too_many') setError('Слишком много попыток. Запросите новый код.')
        else setError('Не удалось подтвердить код.')
        return
      }
      setStep('done')
    } catch {
      setError('Нет связи с сервером. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cta" id="register">
      <span className="eyebrow" style={{ color: '#7fb0ff' }}>
        Начать пользоваться
      </span>
      <div className="head">Регистрация</div>

      {step === 'done' ? (
        <p className="lead">
          Контакт подтверждён ✅ <strong>Готовим ваш доступ к MAX.</strong> Следующий шаг — вход в
          MAX по номеру и SMS. Мы свяжемся с вами здесь же.
        </p>
      ) : (
        <>
          <p className="lead">
            Телефон или почта — и MAX у вас в Telegram. <strong>Первая неделя бесплатно.</strong>
          </p>

          {step === 'contact' ? (
            <>
              <div className="seg">
                <button
                  type="button"
                  className={method === 'phone' ? 'on' : ''}
                  onClick={() => {
                    setMethod('phone')
                    setError('')
                  }}
                >
                  По телефону
                </button>
                <button
                  type="button"
                  className={method === 'email' ? 'on' : ''}
                  onClick={() => {
                    setMethod('email')
                    setError('')
                  }}
                >
                  По почте
                </button>
              </div>

              <form onSubmit={sendCode}>
                {method === 'phone' ? (
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Номер телефона, +7…"
                    autoComplete="tel"
                    inputMode="tel"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                ) : (
                  <input
                    type="email"
                    name="email"
                    placeholder="Электронная почта"
                    autoComplete="email"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                )}
                <button type="submit" disabled={busy || !contact}>
                  {busy ? 'Отправляем…' : 'Получить код'}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={verify}>
              <p className="lead" style={{ marginTop: 0 }}>
                Отправили код на <strong>{contact}</strong>.
              </p>
              <input
                type="text"
                name="code"
                placeholder="Код из 6 цифр"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
              <button type="submit" disabled={busy || code.length < 6}>
                {busy ? 'Проверяем…' : 'Подтвердить'}
              </button>
              <p className="fine">
                Не пришёл код?{' '}
                <a
                  href="#"
                  style={{ color: '#7fb0ff' }}
                  onClick={(e) => {
                    e.preventDefault()
                    if (!busy) sendCode()
                  }}
                >
                  Отправить заново
                </a>{' '}
                ·{' '}
                <a
                  href="#"
                  style={{ color: '#7fb0ff' }}
                  onClick={(e) => {
                    e.preventDefault()
                    setStep('contact')
                    setCode('')
                    setError('')
                  }}
                >
                  Изменить контакт
                </a>
              </p>
            </form>
          )}
        </>
      )}

      {error && (
        <p className="fine" style={{ color: '#e0506a' }}>
          {error}
        </p>
      )}

      {step === 'contact' && (
        <p className="fine">
          Нажимая кнопку, вы соглашаетесь с обработкой персональных данных. Уже есть аккаунт?{' '}
          <a href="#" style={{ color: '#7fb0ff' }}>
            Войти
          </a>
        </p>
      )}
    </div>
  )
}
