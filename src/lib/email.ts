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
    // Dev без ключа — печатаем код в консоль, чтобы поток можно было пройти локально.
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
