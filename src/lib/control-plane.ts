/**
 * Регистрация пользователя + старт триала. Вариант A: пишем напрямую во встроенную БД сайта
 * (control-db). Сигнатуру оставляем прежней, чтобы verify-code не менялся.
 */
import { getDb } from './control-db'

export interface RegisterResult {
  ok: boolean
  userId?: number
  isNew?: boolean
  daysRemaining?: number
  error?: string
}

const TRIAL_DAYS = Number(process.env.TRIAL_DAYS ?? '7')

export async function registerUser(input: {
  email?: string
  phone?: string
  plan?: 'shared' | 'personal'
}): Promise<RegisterResult> {
  try {
    const db = getDb()
    const { user, isNew } = db.findOrCreateTrialUser({ ...input, trialDays: TRIAL_DAYS })
    return { ok: true, userId: user.id, isNew, daysRemaining: db.daysRemaining(user) }
  } catch (e) {
    console.error('[control-plane] не удалось создать пользователя:', e)
    return { ok: false, error: String(e) }
  }
}
