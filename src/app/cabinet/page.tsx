import type Stripe from 'stripe'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getStripe, stripeConfigured } from '@/lib/stripe'
import MaxConnect from '@/components/MaxConnect'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Кабинет — Весточка', robots: { index: false } }

function daysLeft(unix: number | null | undefined): number {
  if (!unix) return 0
  const ms = unix * 1000 - Date.now()
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}

/**
 * Личный кабинет после привязки карты. Идентификация — по session_id из редиректа Stripe.
 * Показывает статус (триал/дни) и шаг подключения MAX (тут же анти-абуз по номеру).
 */
export default async function CabinetPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  let userId: number | null = null
  let status: Stripe.Subscription.Status | null = null
  let days = 0
  let trialing = false

  if (session_id && stripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(session_id, {
        expand: ['subscription'],
      })
      const ref = session.client_reference_id ?? session.metadata?.app_user_id
      userId = ref ? Number(ref) : null
      const sub = session.subscription as Stripe.Subscription | null
      if (sub) {
        status = sub.status
        trialing = sub.status === 'trialing'
        const end = sub.trial_end ?? (sub as unknown as { current_period_end?: number }).current_period_end
        days = daysLeft(end)
      }
    } catch {
      /* истёкшая/чужая сессия — покажем нейтральный кабинет */
    }
  }

  return (
    <div className="wrap">
      <header>
        <div className="top">
          <Link href="/" className="mark" style={{ textDecoration: 'none' }}>
            Весточка<b>.</b>
          </Link>
        </div>
      </header>

      <div className="hero" style={{ paddingBottom: 24 }}>
        <span className="eyebrow">Кабинет</span>
        <h1>
          {trialing ? 'Карта привязана' : status === 'active' ? 'Подписка активна' : 'Доступ'}
        </h1>
        <p className="sub">
          {trialing ? (
            <>
              Бесплатная неделя активна — осталось <strong>{days}</strong>{' '}
              {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}. Списание произойдёт по окончании,
              если не отменить.
            </>
          ) : status === 'active' ? (
            <>
              Подписка активна, осталось <strong>{days}</strong>{' '}
              {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} до продления.
            </>
          ) : (
            <>Чтобы открыть кабинет, перейдите по ссылке из подтверждения.</>
          )}
        </p>
      </div>

      <section className="cta" style={{ marginTop: 8 }}>
        <span className="eyebrow" style={{ color: '#7fb0ff' }}>
          Подключение
        </span>
        <div className="head">Подключите MAX</div>
        <p className="lead">
          Введите номер телефона, которым вы пользуетесь в MAX. По нему мы подключим ваш аккаунт к
          Telegram — сообщения будут приходить вам в бота.
        </p>
        <MaxConnect sessionId={session_id ?? ''} canConnect={Boolean(userId)} />
      </section>

      <footer>
        <span>
          <Link href="/">На главную</Link> · <Link href="/blog">Блог</Link>
        </span>
        <span>Поддержка — ответим на почту регистрации.</span>
      </footer>
    </div>
  )
}
