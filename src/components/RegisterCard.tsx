'use client'

import { useEffect, useState } from 'react'
import Turnstile from './Turnstile'
import Tariffs from './Tariffs'
import type { Plan } from '@/lib/tariffs'

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
  const [payNow, setPayNow] = useState(false) // юзер сам выбрал оплатить сразу (иначе — try-first)
  const [returning, setReturning] = useState(false) // аккаунт уже был — это вход, не регистрация
  const [paid, setPaid] = useState(false) // подписка уже оплачена (active)
  const [refCode, setRefCode] = useState('') // реферальный код приглашения
  const [refApplied, setRefApplied] = useState(false)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null) // уже вошедший пользователь
  const [showOther, setShowOther] = useState(false) // залогинен, но хочет войти под другой почтой
  const [capacityFull, setCapacityFull] = useState(false) // мест на сервере не осталось

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

  // Ёмкость сервера: если мест нет — показываем плашку и блокируем новые регистрации.
  useEffect(() => {
    fetch('/api/capacity', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setCapacityFull(Boolean(d.full)))
      .catch(() => {})
  }, [])

  const captchaOn = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  const stripeOn = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  const ruPayOn = Boolean(process.env.NEXT_PUBLIC_INTELLECTMONEY_ENABLED)
  const payOn = stripeOn || ruPayOn

  // Открывает оплату выбранного тарифа у нужного провайдера и редиректит на его страницу.
  async function startCheckout(endpoint: string, plan: Plan) {
    setError('')
    setCheckoutBusy(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: contact, plan }),
      })
      const data = await res.json()
      if (data.error === 'already_active') {
        setError('У вас уже есть активная подписка.')
        return
      }
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
  const startStripe = (plan: Plan) => startCheckout('/api/stripe/checkout', plan)
  const startRu = (plan: Plan) => startCheckout('/api/payments/intellectmoney/checkout', plan)

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
        else if (data.error === 'at_capacity') {
          setCapacityFull(true)
          setError('Сейчас все места заняты — новые регистрации временно недоступны. Попробуйте позже.')
        } else setError('Что-то пошло не так. Попробуйте ещё раз.')
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
      setPaid(Boolean(data.paid)) // оплачена ли подписка
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

      {capacityFull && step !== 'done' && (
        <p className="tg-privacy" style={{ borderColor: '#e0a23a', background: 'rgba(224,162,58,.10)' }}>
          ⏳ Сейчас все места заняты — мы временно не принимаем новых пользователей, чтобы держать
          качество. Уже подключённые работают как обычно. Загляните чуть позже — мы расширяемся.
          Если вы <strong>уже регистрировались</strong>, вход ниже работает.
        </p>
      )}

      {step === 'done' ? (
        returning && paid ? (
          // Вошёл и подписка оплачена — сразу в кабинет.
          <>
            <p className="lead">С возвращением ✅ Вы вошли в свой аккаунт.</p>
            <a href="/cabinet" className="pay-btn" style={{ textDecoration: 'none' }}>
              <span className="pay-btn-title">Перейти в кабинет</span>
              <span className="pay-btn-sub">подписка, подключение MAX и Telegram</span>
            </a>
          </>
        ) : payOn ? (
          payNow ? (
          <>
            {refApplied && (
              <p className="lead" style={{ color: '#9fe3b4' }}>
                🎁 Код приглашения принят — у вас <strong>2 недели бесплатно</strong>.
              </p>
            )}
            {!cardType ? (
              // Сначала простой выбор карты — без обещаний и без преимуществ способов.
              <>
                <p className="lead">
                  {returning ? 'С возвращением ✅ ' : 'Почта подтверждена ✅ '}
                  Какой картой хотите оплатить подписку?
                </p>
                <button type="button" className="pay-btn" onClick={() => setCardType('ru')}>
                  <span className="pay-btn-title">🇷🇺 Российская карта</span>
                  <span className="pay-btn-sub">оплата в рублях</span>
                </button>
                <button type="button" className="pay-btn alt" onClick={() => setCardType('foreign')}>
                  <span className="pay-btn-title">🌍 Зарубежная карта</span>
                  <span className="pay-btn-sub">оплата в евро</span>
                </button>
                <button
                  type="button"
                  className="link-back"
                  onClick={() => setPayNow(false)}
                  style={{ background: 'none', border: 0, color: '#7fb0ff', cursor: 'pointer', marginTop: 10, display: 'block', width: '100%', textAlign: 'center' }}
                >
                  ← пропустить, подключить MAX сейчас
                </button>
              </>
            ) : cardType === 'ru' ? (
              // РФ: показываем тарифы в рублях.
              <>
                <p className="lead">Выберите тариф — оплата российской картой (₽):</p>
                <Tariffs
                  currency="rub"
                  busy={checkoutBusy}
                  onPick={ruPayOn ? startRu : undefined}
                />
                {!ruPayOn && (
                  <p className="lead" style={{ marginTop: 12 }}>
                    Оплата российской картой скоро будет доступна. Бесплатная неделя уже идёт —
                    можно подключать MAX прямо сейчас.
                  </p>
                )}
                {/* Неделя бесплатна — можно пропустить и оплатить позже из кабинета. */}
                <a
                  href="/cabinet"
                  className="link-back"
                  style={{
                    display: 'block',
                    marginTop: 14,
                    color: '#7fb0ff',
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
                  Пока пропустить — перейти в кабинет
                </a>
                <button
                  type="button"
                  className="link-back"
                  onClick={() => setCardType(null)}
                  style={{ background: 'none', border: 0, color: '#7fb0ff', cursor: 'pointer', marginTop: 8 }}
                >
                  ← другой способ оплаты
                </button>
              </>
            ) : (
              // Зарубежная: Stripe-триал — карта сейчас, списание через 7 дней.
              <>
                <p className="lead">
                  Выберите тариф — зарубежная карта (€), <strong>первая неделя бесплатно</strong>,
                  спишем только через 7 дней. Отменить можно в любой момент.
                </p>
                <Tariffs currency="eur" busy={checkoutBusy} onPick={startStripe} />
                <button
                  type="button"
                  className="link-back"
                  onClick={() => setCardType(null)}
                  style={{ background: 'none', border: 0, color: '#7fb0ff', cursor: 'pointer', marginTop: 8 }}
                >
                  ← другой способ оплаты
                </button>
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
            // TRY-FIRST (по умолчанию): сначала ценность, без цены и карты. Оплата — позже
            // (PayBox в кабинете + dunning у конца триала). Снимает «платёжную стену» на входе.
            <>
              {refApplied && (
                <p className="lead" style={{ color: '#9fe3b4' }}>
                  🎁 Код приглашения принят — у вас <strong>2 недели бесплатно</strong>.
                </p>
              )}
              <p className="lead">
                {returning ? 'С возвращением ✅ ' : 'Почта подтверждена ✅ '}
                <strong>
                  Бесплатная неделя активна
                  {typeof trialDays === 'number' ? ` — осталось ${trialDays} дн` : ''}.
                </strong>{' '}
                Подключим MAX — это пара минут, карта не нужна.
              </p>
              <a href="/cabinet" className="pay-btn" style={{ textDecoration: 'none' }}>
                <span className="pay-btn-title">Перейти в кабинет → подключить MAX</span>
                <span className="pay-btn-sub">бесплатная неделя уже идёт</span>
              </a>
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setPayNow(true)}
                  style={{ background: 'none', border: 0, padding: 0, color: '#7fb0ff', cursor: 'pointer', font: 'inherit', fontSize: 14, textDecoration: 'underline', textUnderlineOffset: 4 }}
                >
                  Оформить подписку сейчас
                </button>
              </div>
            </>
          )
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
          {sessionEmail !== null && step === 'contact' && !showOther ? (
            <div>
              <p className="lead">
                Вы уже вошли{sessionEmail ? ` как ${sessionEmail}` : ''}.
              </p>
              <a href="/cabinet" className="pay-btn" style={{ textDecoration: 'none' }}>
                <span className="pay-btn-title">Перейти в кабинет</span>
              </a>
              <p className="fine">
                Не вы?{' '}
                <a
                  href="#"
                  style={{ color: '#7fb0ff' }}
                  onClick={(e) => {
                    e.preventDefault()
                    setShowOther(true)
                  }}
                >
                  Войти под другой почтой
                </a>
              </p>
            </div>
          ) : (
            <>
              {sessionEmail !== null && step === 'contact' && (
                <p className="fine" style={{ marginTop: 0 }}>
                  <a
                    href="#"
                    style={{ color: '#7fb0ff' }}
                    onClick={(e) => {
                      e.preventDefault()
                      setShowOther(false)
                    }}
                  >
                    ← Вернуться
                  </a>
                </p>
              )}
              <p className="lead">
                Введите почту — пришлём код. Есть аккаунт — войдёте, нет — заведём.
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
                placeholder="Код приглашения (если есть)"
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
        </>
      )}

      {error && (
        <p className="fine" style={{ color: '#e0506a' }}>
          {error}
        </p>
      )}

      {step === 'contact' && (sessionEmail === null || showOther) && (
        <p className="fine">
          Нажимая кнопку, вы соглашаетесь с обработкой персональных данных.
        </p>
      )}
    </div>
  )
}
