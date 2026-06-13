'use client'

import { useEffect, useRef } from 'react'

/**
 * Виджет Cloudflare Turnstile. Рендерится только если задан публичный site key
 * (NEXT_PUBLIC_TURNSTILE_SITE_KEY). Иначе ничего не показывает и сразу отдаёт пустой токен —
 * чтобы локально без ключей поток регистрации работал (бэкенд без секрета капчу не требует).
 *
 * Токен одноразовый — после каждой отправки кода зовём reset через ключ `resetSignal`.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
    }
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export default function Turnstile({
  onToken,
  resetSignal,
}: {
  onToken: (token: string) => void
  resetSignal: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    if (!SITE_KEY) {
      onToken('') // капча выключена — пустой токен, бэкенд пропустит
      return
    }
    const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    function renderWidget() {
      if (!ref.current || !window.turnstile || widgetId.current) return
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: SITE_KEY,
        callback: (token: string) => onToken(token),
        'error-callback': () => onToken(''),
        'expired-callback': () => onToken(''),
        theme: 'light',
      })
    }
    if (window.turnstile) {
      renderWidget()
    } else if (!document.querySelector(`script[src="${SRC}"]`)) {
      const s = document.createElement('script')
      s.src = SRC
      s.async = true
      s.defer = true
      s.onload = renderWidget
      document.head.appendChild(s)
    } else {
      // скрипт уже грузится — дождёмся
      const t = setInterval(() => {
        if (window.turnstile) {
          clearInterval(t)
          renderWidget()
        }
      }, 200)
      return () => clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Сброс виджета после использования токена (он одноразовый).
  useEffect(() => {
    if (resetSignal > 0 && widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current)
      onToken('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal])

  if (!SITE_KEY) return null
  return <div ref={ref} style={{ marginBottom: 12 }} />
}
