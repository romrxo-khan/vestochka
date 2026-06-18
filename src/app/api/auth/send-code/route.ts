import { NextRequest, NextResponse } from 'next/server'
import { issueCode, cooldownLeft, isValidContact, normalizeContact } from '@/lib/otp'
import { sendVerificationEmail } from '@/lib/email'
import { sendPhoneCode } from '@/lib/sms'
import { guardSendCode, clientIp } from '@/lib/ratelimit'
import { verifyTurnstile } from '@/lib/turnstile'
import { REG_COOKIE, signSession, verifySession } from '@/lib/reg-session'
import { capacity } from '@/lib/capacity'
import { getDb } from '@/lib/control-db'

export const runtime = 'nodejs'

/**
 * POST { channel, contact, captchaToken? } → отправляет код (email — Resend, phone — SMS.RU).
 *
 * Две ветки, выбор по наличию валидной reg-сессии (куки) на этот контакт:
 *  • СВЕЖАЯ выдача (сессии нет): капча обязательна + кулдаун. Ставим reg-куку.
 *  • ПОВТОР («Отправить заново», сессия есть): без капчи, но под кулдауном и лимитами.
 *    Привязка к куке не даёт чужому клиенту слать коды на чужой номер (анти-бомбинг)
 *    и не превращает эндпоинт в оракул регистрации.
 *
 * Ответ всегда одинаковой формы {ok:true} — без раскрытия деталей доставки.
 */
export async function POST(req: NextRequest) {
  let body: { channel?: string; contact?: string; captchaToken?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  const channel = body.channel === 'phone' ? 'phone' : body.channel === 'email' ? 'email' : null
  if (!channel || !body.contact) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
  }

  const contact = normalizeContact(channel, body.contact)
  if (!isValidContact(channel, contact)) {
    const error = channel === 'phone' ? 'phone_not_ru' : 'invalid_contact'
    return NextResponse.json({ ok: false, error }, { status: 400 })
  }

  const ip = clientIp(req)
  const isResend = verifySession(req.cookies.get(REG_COOKIE)?.value, contact)

  // Стоп новым регистрациям при заполнении мест. Вход СУЩЕСТВУЮЩИХ юзеров (и повтор кода) — разрешён.
  if (!isResend && !getDb().byEmailOrPhone(contact) && capacity().full) {
    return NextResponse.json({ ok: false, error: 'at_capacity' }, { status: 503 })
  }

  const tooMany = () => {
    const guard = guardSendCode({ ip, contact, channel })
    if (guard.ok) return null
    return NextResponse.json(
      { ok: false, error: 'rate_limited', retryAfterSec: guard.retryAfterSec },
      { status: 429, headers: { 'retry-after': String(guard.retryAfterSec) } },
    )
  }

  const onCooldown = () => {
    const left = cooldownLeft(contact)
    if (left <= 0) return null
    return NextResponse.json({ ok: false, error: 'cooldown', retryAfterSec: left }, { status: 429 })
  }

  async function deliver(code: string): Promise<NextResponse | null> {
    try {
      if (channel === 'email') {
        await sendVerificationEmail(contact, code)
      } else {
        const r = await sendPhoneCode(contact, code)
        if (!r.ok) return NextResponse.json({ ok: false, error: 'sms_failed' }, { status: 502 })
      }
    } catch (e) {
      console.error('[send-code] отправка не удалась:', e)
      return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 502 })
    }
    return null
  }

  const ok = () => {
    const res = NextResponse.json({ ok: true, contact })
    // Обновляем/ставим reg-сессию (привязка повторов к этому браузеру).
    res.cookies.set(REG_COOKIE, signSession(contact), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    })
    return res
  }

  // Повтор (есть валидная сессия) — без капчи; свежая выдача — капча обязательна.
  if (!isResend && !(await verifyTurnstile(body.captchaToken, ip))) {
    return NextResponse.json({ ok: false, error: 'captcha_failed' }, { status: 403 })
  }

  return tooMany() ?? onCooldown() ?? (await deliver(issueCode(contact))) ?? ok()
}
