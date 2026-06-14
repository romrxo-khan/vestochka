import { NextResponse } from 'next/server'
import { getDb, type OnboardState } from '@/lib/control-db'
import { botAuthorized } from '@/lib/bot-auth'

export const runtime = 'nodejs'

const STATES: OnboardState[] = [
  'IDLE',
  'QUEUED',
  'LOADING',
  'PHONE_REQUIRED',
  'SOLVING_CAPTCHA',
  'HUMAN_CAPTCHA_REQUIRED',
  'CODE_REQUIRED',
  'PASSWORD_REQUIRED',
  'NAME_REQUIRED',
  'ONLINE',
  'ERROR',
]

/**
 * POST { userId, state, detail?, captchaImage? } (x-bot-token) — контейнер
 * сообщает своё состояние. captchaImage (base64) — только для HUMAN_CAPTCHA_REQUIRED.
 */
export async function POST(req: Request) {
  if (!botAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  let body: { userId?: number; state?: string; detail?: string; captchaImage?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }
  const userId = Number(body.userId)
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ ok: false, error: 'bad_user' }, { status: 400 })
  }
  if (!body.state || !STATES.includes(body.state as OnboardState)) {
    return NextResponse.json({ ok: false, error: 'bad_state' }, { status: 400 })
  }
  getDb().onbReport(userId, body.state as OnboardState, body.detail, body.captchaImage)
  return NextResponse.json({ ok: true })
}
