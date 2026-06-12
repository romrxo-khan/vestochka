'use client'

import { useState } from 'react'

/** Окно регистрации/входа. React-состояние переключателя — можно ставить несколько на странице. */
export default function RegisterCard() {
  const [method, setMethod] = useState<'phone' | 'email'>('phone')

  return (
    <div className="cta" id="register">
      <span className="eyebrow" style={{ color: '#7fb0ff' }}>
        Начать пользоваться
      </span>
      <div className="head">Регистрация</div>
      <p className="lead">Телефон или почта — и MAX у вас в Telegram. Пары минут хватит.</p>

      <div className="seg">
        <button
          type="button"
          className={method === 'phone' ? 'on' : ''}
          onClick={() => setMethod('phone')}
        >
          По телефону
        </button>
        <button
          type="button"
          className={method === 'email' ? 'on' : ''}
          onClick={() => setMethod('email')}
        >
          По почте
        </button>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        {method === 'phone' ? (
          <input
            type="tel"
            name="phone"
            placeholder="Номер телефона, +7…"
            autoComplete="tel"
            inputMode="tel"
          />
        ) : (
          <input type="email" name="email" placeholder="Электронная почта" autoComplete="email" />
        )}
        <button type="submit">Получить доступ</button>
      </form>

      <p className="fine">
        Нажимая кнопку, вы соглашаетесь с обработкой персональных данных. Уже есть аккаунт?{' '}
        <a href="#" style={{ color: '#7fb0ff' }}>
          Войти
        </a>
      </p>
    </div>
  )
}
