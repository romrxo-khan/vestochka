import { NextResponse } from 'next/server'
import { getDb } from '@/lib/control-db'
import { cabinetUser } from '@/lib/cabinet-session'

export const runtime = 'nodejs'

/** GET — текущее состояние онбординга для пользователя кабинета. */
export async function GET() {
  const user = await cabinetUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const row = getDb().onbGet(user.id)
  return NextResponse.json({
    ok: true,
    state: row?.state ?? 'IDLE',
    detail: row?.detail ?? null,
    captchaImage: row?.captcha_image ?? null,
    awaitingInput: Boolean(row?.pending_kind), // ввод ещё не забран контейнером
  })
}

/**
 * POST — действия кабинета:
 *   { action: 'start' }                       — начать/перезапустить онбординг;
 *   { action: 'input', kind, value }          — передать ввод (phone/code/password/name/captcha).
 * Для kind='phone' дополнительно закрепляем MAX-номер (анти-абуз: один номер = один аккаунт).
 */
export async function POST(req: Request) {
  const user = await cabinetUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  let body: { action?: string; kind?: string; value?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }
  const db = getDb()

  if (body.action === 'start') {
    db.onbStart(user.id)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'input') {
    const kind = body.kind
    const value = (body.value ?? '').trim()
    if (!kind || !value) {
      return NextResponse.json({ ok: false, error: 'missing_input' }, { status: 400 })
    }
    if (!['phone', 'code', 'password', 'name', 'captcha', 'resend'].includes(kind)) {
      return NextResponse.json({ ok: false, error: 'bad_kind' }, { status: 400 })
    }
    if (kind === 'phone') {
      const claim = db.claimMaxPhone(user.id, value)
      if (!claim.ok) {
        const message =
          claim.reason === 'taken'
            ? 'Этот номер MAX уже используется в другом аккаунте.'
            : 'Некорректный номер. Нужен российский мобильный (+7 9XX…).'
        return NextResponse.json({ ok: false, error: claim.reason, message }, { status: 409 })
      }
      db.onbSetInput(user.id, 'phone', claim.phone)
      return NextResponse.json({ ok: true })
    }
    db.onbSetInput(user.id, kind as 'code' | 'password' | 'name' | 'captcha' | 'resend', value)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: false, error: 'bad_action' }, { status: 400 })
}
