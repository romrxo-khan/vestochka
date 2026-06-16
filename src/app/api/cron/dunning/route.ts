import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getDb, DUNNING_GRACE_DAYS } from '@/lib/control-db'
import { notifyTrialEnding, notifyGrace, notifySuspended } from '@/lib/notify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GRACE_DAYS = DUNNING_GRACE_DAYS
const REMIND_WITHIN_DAYS = 3

function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET
  const got =
    req.headers.get('x-cron-secret') ?? new URL(req.url).searchParams.get('secret') ?? ''
  if (!expected) return false
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * Ежедневный прогон жизненного цикла подписки:
 *  1) триал кончается ≤3 дн → напоминание (≤1/день);
 *  2) триал истёк → grace (4 дня) + первое письмо «сообщения ждут»;
 *  3) в grace → ежедневное напоминание;
 *  4) grace истёк → suspend + флаг сноса MAX-профиля (провижинер заберёт).
 */
async function run(req: Request): Promise<NextResponse> {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  const db = getDb()
  const out = { trialReminders: 0, movedToGrace: 0, graceReminders: 0, suspended: 0 }

  // Уведомления идут в Telegram (основной канал) + email, если указан — см. lib/notify.
  for (const u of db.trialEndingSoon(REMIND_WITHIN_DAYS)) {
    await notifyTrialEnding(u, db.daysRemaining(u)).catch(() => {})
    db.markReminded(u.id)
    out.trialReminders++
  }

  for (const u of db.moveExpiredTrialsToGrace(GRACE_DAYS)) {
    await notifyGrace(u).catch(() => {})
    db.markReminded(u.id)
    out.movedToGrace++
  }

  // Сюда же попадают юзеры с провалом рекуррента (startGrace выставил past_due + grace_until).
  for (const u of db.graceReminders()) {
    await notifyGrace(u).catch(() => {})
    db.markReminded(u.id)
    out.graceReminders++
  }

  const suspended = db.expireGrace()
  out.suspended = suspended.length
  for (const u of suspended) {
    await notifySuspended(u).catch(() => {})
    // Провижинер читает teardown_pending и сносит профиль.
  }
  if (suspended.length) console.log(`[dunning] suspend+teardown: ${suspended.map((u) => u.id).join(',')}`)

  return NextResponse.json({ ok: true, ...out })
}

export async function POST(req: Request) {
  return run(req)
}
export async function GET(req: Request) {
  return run(req)
}
