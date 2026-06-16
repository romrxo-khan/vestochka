/**
 * Единая точка уведомлений жизненного цикла подписки (dunning).
 *
 * Канал: Telegram-бот — ОСНОВНОЙ (юзер им и так пользуется), email — дублёр, если указан.
 * Каждое уведомление шлётся в оба канала независимо; падение одного не мешает другому.
 */
import type { User } from './control-db'
import { notifyTelegram } from './telegram-notify'
import { sendTrialEndingEmail, sendGraceEmail } from './email'

const SITE = process.env.SITE_URL ?? 'https://vestochka.uk'
const CABINET = `${SITE}/cabinet`

/** Триал скоро закончится (за `days` дней). */
export async function notifyTrialEnding(u: User, days: number): Promise<void> {
  const d = days === 1 ? '1 день' : `${days} дня`
  if (u.tg_user_id) {
    await notifyTelegram(
      u.tg_user_id,
      `⏳ Бесплатная неделя в Весточке заканчивается через ${d}.\nЧтобы сообщения из MAX продолжали приходить в Telegram — оформите подписку: ${CABINET}`,
    )
  }
  if (u.email) await sendTrialEndingEmail(u.email, days).catch(() => {})
}

/** Доступ приостановлен «мягко» (grace): подписка не активна, сообщения копятся. */
export async function notifyGrace(u: User): Promise<void> {
  if (u.tg_user_id) {
    await notifyTelegram(
      u.tg_user_id,
      `📨 Подписка Весточки сейчас не активна. Сообщения из MAX продолжают приходить, но не пересылаются в Telegram.\nПродлите подписку / обновите оплату — и доступ вернётся сразу: ${CABINET}`,
    )
  }
  if (u.email) await sendGraceEmail(u.email).catch(() => {})
}

/** Списание подписки не прошло (рекуррент) — сразу после отказа провайдера. */
export async function notifyPaymentFailed(u: User, graceDays: number): Promise<void> {
  const d = graceDays === 1 ? '1 день' : `${graceDays} дня`
  if (u.tg_user_id) {
    await notifyTelegram(
      u.tg_user_id,
      `⚠️ Не удалось списать оплату подписки Весточки.\nОбновите карту в кабинете в течение ${d}, иначе пересылка из MAX приостановится: ${CABINET}`,
    )
  }
  if (u.email) await sendGraceEmail(u.email).catch(() => {})
}

/** Доступ полностью приостановлен (grace истёк, профиль сносится). */
export async function notifySuspended(u: User): Promise<void> {
  if (u.tg_user_id) {
    await notifyTelegram(
      u.tg_user_id,
      `⛔ Доступ к Весточке приостановлен — оплата так и не поступила.\nПродлите подписку, и пересылка из MAX вернётся: ${CABINET}`,
    )
  }
  if (u.email) await sendGraceEmail(u.email).catch(() => {})
}

/** Оплата получена после простоя — доступ восстановлен. */
export async function notifyReactivated(u: User): Promise<void> {
  if (u.tg_user_id) {
    await notifyTelegram(
      u.tg_user_id,
      `✅ Оплата получена — подписка активна, пересылка из MAX восстановлена. Спасибо!`,
    )
  }
}
