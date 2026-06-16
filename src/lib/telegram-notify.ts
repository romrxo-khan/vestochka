/**
 * Отправка сообщения пользователю в Telegram от имени общего бота (для dunning-уведомлений).
 *
 * Сайт шлёт напрямую через Bot API (`sendMessage`) по сохранённому tg_user_id. Нужен
 * TELEGRAM_BOT_TOKEN в окружении сайта (тот же токен, что у роутера/бота). Без токена —
 * dev-режим: печатаем в консоль, поток не падает.
 */
const TOKEN = process.env.TELEGRAM_BOT_TOKEN

/** Шлёт текст в личку tgUserId. Возвращает true при успехе. Никогда не бросает. */
export async function notifyTelegram(tgUserId: number, text: string): Promise<boolean> {
  if (!TOKEN) {
    console.log(`[tg:dev] -> ${tgUserId}: ${text}`)
    return false
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: tgUserId, text, disable_web_page_preview: true }),
    })
    if (!res.ok) {
      console.error(`[tg-notify] ${tgUserId}: HTTP ${res.status}`)
      return false
    }
    return true
  } catch (e) {
    console.error('[tg-notify]', (e as Error)?.message ?? e)
    return false
  }
}
