/**
 * Отправка транзакционной почты через Resend. Домен vestochka.uk уже верифицирован.
 * Ключ — в .env.local (RESEND_API_KEY), отправитель — RESEND_FROM.
 */
import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!_resend) _resend = new Resend(key)
  return _resend
}

const FROM = process.env.RESEND_FROM ?? 'Весточка <noreply@vestochka.uk>'

/** Письмо с кодом подтверждения регистрации/входа. */
export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const resend = getResend()
  if (!resend) {
    // Приватность: код печатаем ТОЛЬКО в dev (локальный поток). В production отсутствие
    // ключа — конфиг-ошибка; НЕ печатаем OTP в логи (риск захвата аккаунта).
    if (process.env.NODE_ENV === 'production') throw new Error('RESEND_API_KEY не задан')
    console.log(`[email:dev] код для ${to}: ${code}`)
    return
  }
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Код для входа в Весточку: ${code}`,
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:440px;margin:0 auto;color:#0f1b2d">
        <h1 style="font-size:20px;margin:0 0 8px">Весточка</h1>
        <p style="font-size:15px;color:#33415c;margin:0 0 20px">Ваш код подтверждения:</p>
        <div style="font-size:34px;font-weight:800;letter-spacing:6px;color:#1763ff;background:#f1f6ff;border-radius:12px;padding:18px;text-align:center">${code}</div>
        <p style="font-size:13px;color:#8a98ad;margin:20px 0 0">Код действует 10 минут. Если вы не запрашивали вход — просто игнорируйте письмо.</p>
      </div>`,
    text: `Весточка. Код подтверждения: ${code}. Действует 10 минут.`,
  })
}

const SITE = process.env.SITE_URL ?? 'https://vestochka.uk'

function wrap(inner: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:460px;margin:0 auto;color:#0f1b2d">
    <h1 style="font-size:20px;margin:0 0 14px">Весточка</h1>${inner}
    <a href="${SITE}/cabinet" style="display:inline-block;margin-top:18px;background:#1763ff;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700">Оформить подписку</a>
    <p style="font-size:12px;color:#8a98ad;margin-top:20px">Весточка — MAX в вашем Telegram.</p>
  </div>`
}

async function send(to: string, subject: string, html: string, text: string): Promise<void> {
  const resend = getResend()
  if (!resend) {
    // Приватность: email-адрес печатаем ТОЛЬКО в dev. В production молча не отправляем
    // (письма dunning не критичны для входа), не светим контакт в логи.
    if (process.env.NODE_ENV !== 'production') console.log(`[email:dev] -> ${to}: ${subject}`)
    return
  }
  await resend.emails.send({ from: FROM, to, subject, html, text })
}

/** Напоминание: триал скоро закончится. */
export async function sendTrialEndingEmail(to: string, daysLeft: number): Promise<void> {
  const d = daysLeft === 1 ? '1 день' : `${daysLeft} дня`
  await send(
    to,
    `Бесплатная неделя заканчивается через ${d}`,
    wrap(
      `<p style="font-size:15px;color:#33415c">Ваша бесплатная неделя в Весточке заканчивается через <b>${d}</b>. Чтобы сообщения из MAX продолжали приходить в Telegram, оформите подписку.</p>`,
    ),
    `Бесплатная неделя заканчивается через ${d}. Оформите подписку: ${SITE}/cabinet`,
  )
}

/** Напоминание в grace: сообщения приходят, но нужна подписка, чтобы их видеть. */
export async function sendGraceEmail(to: string): Promise<void> {
  await send(
    to,
    'Вам приходят сообщения в MAX — оформите подписку',
    wrap(
      `<p style="font-size:15px;color:#33415c">Бесплатный период закончился. Сообщения из MAX продолжают приходить, но чтобы их видеть в Telegram, нужна подписка. Оформите её — и доступ вернётся сразу.</p>`,
    ),
    `Сообщения приходят в MAX, но нужна подписка, чтобы их видеть: ${SITE}/cabinet`,
  )
}
