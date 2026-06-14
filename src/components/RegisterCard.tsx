'use client'

import { useEffect, useState } from 'react'
import Turnstile from './Turnstile'

type Step = 'contact' | 'code' | 'done'

/** Окно регистрации/входа по ПОЧТЕ: ввод email → код подтверждения → готово. */
export default function RegisterCard() {
  const [step, setStep] = useState<Step>('contact')
  const [contact, setContact] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaReset, setCaptchaReset] = useState(0)
  const [trialDays, setTrialDays] = useState<number | null>(null)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [cardType, setCardType] = useState<'ru' | 'foreign' | null>(null)
  const [returning, setReturning] = useState(false) // аккаунт уже был — это вход, не регистрация
  const [refCode, setRefCode] = useState('') // реферальный код приглашения
  const [refApplied, setRefApplied] = useState(false)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null) // уже вошедший пользователь

  // Подхватываем код из ссылки-приглашения ?ref=CODE.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('ref')
    if (p) setRefCode(p.trim().toUpperCase())
  }, [])

  // Если сессия ещё жива — предлагаем сразу в кабинет, без повторного логина.
  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.loggedIn) setSessionEmail(d.email ?? '')
      })
      .catch(() => {})
  }, [])

  const captchaOn = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  const stripeOn = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  const lavaOn = Boolean(process.env.NEXT_PUBLIC_LAVA_ENABLED)
  const payOn = stripeOn || lavaOn

  // Оплата российской картой — Lava.top: создаёт счёт и редиректит на оплату.
  async function startLava() {
    setError('')
    setCheckoutBusy(true)
    try {
      const res = await fetch('/api/payments/lava/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: contact, plan: 'shared' }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok || !data.url) {
        setError('Не удалось открыть оплату. Попробуйте ещё раз.')
        return
      }
      window.location.href = data.url
    } catch {
      setError('Нет связи с сервером. Попробуйте ещё раз.')
    } finally {
      setCheckoutBusy(false)
    }
  }

  // «Привязать карту»: Stripe Checkout (подписка, неделя триала). Редирект на страницу Stripe.
  async function startCheckout() {
    setError('')
    setCheckoutBusy(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: contact, plan: 'shared' }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok || !data.url) {
        setError('Не удалось открыть оплату. Попробуйте ещё раз.')
        return
      }
      window.location.href = data.url
    } catch {
      setError('Нет связи с сервером. Попробуйте ещё раз.')
    } finally {
      setCheckoutBusy(false)
    }
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ channel: 'email', contact, captchaToken }),
      })
      const data = await res.json()
      // Токен капчи одноразовый — после запроса сбрасываем виджет на свежий.
      if (captchaOn) setCaptchaReset((x) => x + 1)
      if (!res.ok || !data.ok) {
        if (data.error === 'cooldown') setError(`Подождите ${data.retryAfterSec} c и попробуйте снова.`)
        else if (data.error === 'rate_limited')
          setError('Слишком много запросов. Попробуйте позже.')
        else if (data.error === 'captcha_failed')
          setError('Не удалось пройти проверку. Обновите страницу и попробуйте снова.')
        else if (data.error === 'invalid_contact') setError('Проверьте адрес почты.')
        else if (data.error === 'send_failed') setError('Не удалось отправить код. Попробуйте ещё раз.')
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
        body: JSON.stringify({ channel: 'email', contact, code, referralCode: refCode || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        if (data.error === 'mismatch') setError('Неверный код. Проверьте и повторите.')
        else if (data.error === 'expired') setError('Код истёк. Запросите новый.')
        else if (data.error === 'too_many') setError('Слишком много попыток. Запросите новый код.')
        else setError('Не удалось подтвердить код.')
        return
      }
      if (typeof data.trial?.daysRemaining === 'number') setTrialDays(data.trial.daysRemaining)
      if (data.trial?.isNew === false) setReturning(true) // аккаунт уже существовал → это вход
      if (data.referralApplied) setRefApplied(true)
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
        {step === 'done' && returning ? 'С возвращением' : 'Вход и регистрация'}
      </span>
      <div className="head">
        {step === 'done' && returning ? 'Вы вошли' : 'Вход или регистрация'}
      </div>

      {step === 'done' ? (
        returning ? (
          // Аккаунт уже существовал — это вход, без «регистрация/неделя/оплата».
          <>
            <p className="lead">С возвращением ✅ Вы вошли в свой аккаунт.</p>
            <a href="/cabinet" className="pay-btn" style={{ textDecoration: 'none' }}>
              <span className="pay-btn-title">Перейти в кабинет</span>
              <span className="pay-btn-sub">подписка, подключение MAX и Telegram</span>
            </a>
          </>
        ) : payOn ? (
          <>
            {refApplied && (
              <p className="lead" style={{ color: '#9fe3b4' }}>
                🎁 Код приглашения принят — у вас <strong>2 недели бесплатно</strong>.
              </p>
            )}
            {lavaOn && stripeOn && !cardType ? (
              // Сначала простой выбор карты — без обещаний и без преимуществ способов.
              <>
                <p className="lead">
                  Почта подтверждена ✅ Пробный период активен. Какой способ оплаты предпочитаете?
                </p>
                <button type="button" className="pay-btn" onClick={() => setCardType('ru')}>
                  <span className="pay-btn-title">🇷🇺 Российская карта</span>
                </button>
                <button type="button" className="pay-btn alt" onClick={() => setCardType('foreign')}>
                  <span className="pay-btn-title">🌍 Зарубежная карта</span>
                </button>
              </>
            ) : cardType === 'ru' || (lavaOn && !stripeOn) ? (
              // РФ: неделя уже идёт (без карты), оплата при готовности.
              <>
                <p className="lead">
                  Бесплатная неделя активна ✅ Оплатите российской картой, когда будете готовы —
                  спишем при оформлении, дальше помесячно.
                </p>
                <button type="button" className="pay-btn" onClick={startLava} disabled={checkoutBusy}>
                  <span className="pay-btn-title">
                    {checkoutBusy ? 'Открываем оплату…' : 'Оплатить российской картой'}
                  </span>
                  {!checkoutBusy && (
                    <span className="pay-btn-sub">карты РФ · МИР, Visa, Mastercard</span>
                  )}
                </button>
                {/* Оплата РФ не берётся сразу — даём пропустить и сразу подключить MAX. */}
                <a href="/cabinet" className="pay-btn alt" style={{ textDecoration: 'none' }}>
                  <span className="pay-btn-title">Пропустить — подключить MAX</span>
                  <span className="pay-btn-sub">оплатите позже, неделя уже идёт</span>
                </a>
                {stripeOn && (
                  <button
                    type="button"
                    className="link-back"
                    onClick={() => setCardType(null)}
                    style={{ background: 'none', border: 0, color: '#7fb0ff', cursor: 'pointer', marginTop: 8 }}
                  >
                    ← другой способ оплаты
                  </button>
                )}
              </>
            ) : (
              // Зарубежная: Stripe-триал — карта сейчас, списание через 7 дней.
              <>
                <p className="lead">
                  Привяжите зарубежную карту — <strong>первая неделя бесплатно</strong>, спишем
                  только через 7 дней. Отменить можно в любой момент.
                </p>
                <button type="button" className="pay-btn" onClick={startCheckout} disabled={checkoutBusy}>
                  <span className="pay-btn-title">
                    {checkoutBusy ? 'Открываем оплату…' : 'Привязать карту · неделя бесплатно'}
                  </span>
                  {!checkoutBusy && <span className="pay-btn-sub">Stripe · Visa, Mastercard</span>}
                </button>
                {lavaOn && (
                  <button
                    type="button"
                    className="link-back"
                    onClick={() => setCardType(null)}
                    style={{ background: 'none', border: 0, color: '#7fb0ff', cursor: 'pointer', marginTop: 8 }}
                  >
                    ← другой способ оплаты
                  </button>
                )}
              </>
            )}
            <ul className="pay-points">
              <li>
                <span>🔒</span>
                <span>Оплата на стороне платёжной системы — данные карты к нам не попадают.</span>
              </li>
              <li>
                <span>✕</span>
                <span>Отменить подписку можно в любой момент.</span>
              </li>
            </ul>
          </>
        ) : (
          <p className="lead">
            Почта подтверждена ✅{' '}
            <strong>
              Бесплатная неделя активна
              {typeof trialDays === 'number' ? ` — осталось ${trialDays} дн.` : ''}.
            </strong>{' '}
            Готовим ваш доступ к MAX: следующий шаг — вход в MAX по номеру и SMS, мы свяжемся с вами
            здесь же.
          </p>
        )
      ) : (
        <>
          {sessionEmail !== null && step === 'contact' && (
            <div style={{ marginBottom: 16 }}>
              <p className="lead">
                Вы уже вошли{sessionEmail ? ` как ${sessionEmail}` : ''}.
              </p>
              <a href="/cabinet" className="pay-btn" style={{ textDecoration: 'none' }}>
                <span className="pay-btn-title">Перейти в кабинет</span>
              </a>
              <p className="fine">Или войдите под другой почтой ниже.</p>
            </div>
          )}
          <p className="lead">
            Введите почту — пришлём код. Есть аккаунт — войдёте, нет — заведём.{' '}
            <strong>Первая неделя бесплатно.</strong>
          </p>

          {step === 'contact' ? (
            <form onSubmit={sendCode}>
              <input
                type="email"
                name="email"
                placeholder="Электронная почта"
                autoComplete="email"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
              <input
                type="text"
                name="ref"
                placeholder="Код приглашения (если есть) — +неделя"
                autoComplete="off"
                value={refCode}
                onChange={(e) => setRefCode(e.target.value.toUpperCase())}
              />
              <Turnstile onToken={setCaptchaToken} resetSignal={captchaReset} />
              <button type="submit" disabled={busy || !contact || (captchaOn && !captchaToken)}>
                {busy ? 'Отправляем…' : 'Получить код'}
              </button>
            </form>
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
                  Изменить почту
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
