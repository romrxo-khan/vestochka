import type Stripe from 'stripe'
import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { getStripe, stripeConfigured } from '@/lib/stripe'
import { getDb, type User } from '@/lib/control-db'
import { REG_COOKIE, verifySession } from '@/lib/reg-session'
import { signLinkToken } from '@/lib/link-token'
import MaxConnect from '@/components/MaxConnect'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Кабинет — Весточка', robots: { index: false } }

function plural(n: number): string {
  return n === 1 ? 'день' : n >= 2 && n <= 4 ? 'дня' : 'дней'
}

/**
 * Кабинет. Идентификация: session_id (редирект Stripe) ИЛИ кука подтверждённой почты (free-trial).
 * Состояние берём из НАШЕЙ БД. Шаги: связать Telegram (deep-link) → подключить MAX.
 */
export default async function CabinetPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  const db = getDb()
  let user: User | undefined

  if (session_id && stripeConfigured()) {
    try {
      const s = (await getStripe().checkout.sessions.retrieve(session_id)) as Stripe.Checkout.Session
      const ref = s.client_reference_id ?? s.metadata?.app_user_id
      if (ref) user = db.byId(Number(ref))
    } catch {
      /* истёкшая/чужая сессия */
    }
  }
  if (!user) {
    // По куке verify-code: достаём подтверждённую почту и находим аккаунт.
    const cookie = (await cookies()).get(REG_COOKIE)?.value
    // verifySession проверяет подпись и привязку к контакту — перебираем не нужно: контакт в куке.
    // Достаём контакт из самой куки (она подписана под этот контакт), сверяя через verifySession.
    if (cookie) {
      const contact = decodeContact(cookie)
      if (contact && verifySession(cookie, contact)) user = db.byEmailOrPhone(contact)
    }
  }

  const days = user ? db.daysRemaining(user) : 0
  const ps = user?.payment_status
  const botUser = process.env.NEXT_PUBLIC_BOT_USERNAME
  const tgLinked = Boolean(user?.tg_user_id)
  const linkUrl = user && botUser ? `https://t.me/${botUser}?start=${signLinkToken(user.id)}` : null

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
          {!user
            ? 'Доступ'
            : ps === 'active'
              ? 'Подписка активна'
              : ps === 'trialing'
                ? 'Бесплатная неделя'
                : ps === 'past_due'
                  ? 'Нужна подписка'
                  : 'Доступ приостановлен'}
        </h1>
        <p className="sub">
          {!user ? (
            <>Откройте кабинет по ссылке из письма-подтверждения.</>
          ) : ps === 'trialing' ? (
            <>
              Бесплатно — осталось <strong>{days}</strong> {plural(days)}. Дальше оформите подписку,
              чтобы продолжить.
            </>
          ) : ps === 'active' ? (
            <>
              Активна, осталось <strong>{days}</strong> {plural(days)} до продления.
            </>
          ) : ps === 'past_due' ? (
            <>Бесплатный период закончился. Оформите подписку — доступ вернётся сразу.</>
          ) : (
            <>Доступ приостановлен за неоплату. Оформите подписку, чтобы вернуть.</>
          )}
        </p>
      </div>

      {user && (
        <>
          <section className="cta" style={{ marginTop: 8 }}>
            <span className="eyebrow" style={{ color: '#7fb0ff' }}>
              Шаг 1
            </span>
            <div className="head">Подключите Telegram</div>
            <p className="lead">
              {tgLinked
                ? 'Telegram подключён ✅ Сообщения и уведомления будут приходить в бота.'
                : 'Откройте нашего бота — туда будут приходить сообщения из MAX и напоминания.'}
            </p>
            {!tgLinked &&
              (linkUrl ? (
                <a
                  className="pay-btn"
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <span className="pay-btn-title">Открыть бота в Telegram</span>
                  <span className="pay-btn-sub">откроется в новой вкладке — привяжем автоматически</span>
                </a>
              ) : (
                <p className="fine">Бот скоро будет доступен здесь.</p>
              ))}
          </section>

          <section className="cta" style={{ marginTop: 16 }}>
            <span className="eyebrow" style={{ color: '#7fb0ff' }}>
              Шаг 2
            </span>
            <div className="head">Подключите MAX</div>
            <p className="lead">
              Введите номер телефона MAX. По нему подключим ваш аккаунт — сообщения будут приходить в
              Telegram. Нет MAX? Зарегистрируем прямо здесь.
            </p>
            <MaxConnect sessionId={session_id ?? ''} canConnect={Boolean(user)} />
          </section>
        </>
      )}

      <footer>
        <span>
          <Link href="/">На главную</Link> · <Link href="/blog">Блог</Link>
        </span>
        <span>Поддержка — ответим на почту регистрации.</span>
      </footer>
    </div>
  )
}

/** Достаёт контакт из тела подписанной reg-куки (base64url(contact|exp).sig). */
function decodeContact(token: string): string | null {
  const b64 = token.split('.')[0]
  if (!b64) return null
  try {
    return Buffer.from(b64, 'base64url').toString().split('|')[0] || null
  } catch {
    return null
  }
}
