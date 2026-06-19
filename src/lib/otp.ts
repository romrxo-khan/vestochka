/**
 * Одноразовые коды (OTP) для регистрации/входа по email или телефону.
 *
 * Хранилище — В БД (`otp_codes`), переживает редеплой контейнера. Раньше был in-memory Map,
 * из-за чего любая пересборка/рестарт стирала висящие коды → юзер в процессе регистрации
 * получал «код истёк/неверный» и не мог войти. Храним только ХЭШ кода (не сам код). Лимит
 * попыток и кулдауны (на свежую выдачу и на повтор) — защита от подбора и скрутки.
 *
 * «Повтор» (кнопка SMS / «отправить заново») ВСЕГДА выдаёт НОВЫЙ код — старый инвалидируется.
 */
import crypto from 'node:crypto'
import { getDb } from './control-db'

const TTL_MS = 10 * 60_000 // код живёт 10 минут
const COOLDOWN_MS = 60_000 // не чаще одной отправки в минуту (каждая SMS — деньги)
const MAX_ATTEMPTS = 5
const SECRET = process.env.OTP_SECRET ?? 'dev-otp-secret-change-me'

function hashCode(contact: string, code: string): string {
  return crypto.createHmac('sha256', SECRET).update(`${contact}:${code}`).digest('hex')
}

/** Нормализует контакт, чтобы ключ был стабильным. */
export function normalizeContact(channel: 'email' | 'phone', raw: string): string {
  if (channel === 'email') return raw.trim().toLowerCase()
  // телефон → E.164 РФ. Приводим частые формы ввода к +7XXXXXXXXXX:
  let d = raw.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1) // 8XXXXXXXXXX → 7XXXXXXXXXX
  if (d.length === 10 && d.startsWith('9')) d = '7' + d // 9XXXXXXXXX (без кода страны) → 7…
  return '+' + d
}

/**
 * Телефон принимаем ТОЛЬКО российский мобильный: +7 9XX XXX-XX-XX.
 * Это и аудитория сервиса, и защита от SMS-pumping на дорогие зарубежные номера.
 * `+79` отсекает заодно Казахстан (+77), который тоже в зоне +7.
 * Иностранные пользователи регистрируются по email.
 */
export function isValidContact(channel: 'email' | 'phone', value: string): boolean {
  if (channel === 'email') return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
  return /^\+79\d{9}$/.test(value)
}

/** Сколько секунд осталось до возможности отправки (0 — можно). */
export function cooldownLeft(contact: string): number {
  const e = getDb().otpGet(contact)
  if (!e) return 0
  const left = COOLDOWN_MS - (Date.now() - e.lastSentAt)
  return left > 0 ? Math.ceil(left / 1000) : 0
}

/** Выдаёт НОВЫЙ код и возвращает его (чтобы отправить). Старый код инвалидируется. */
export function issueCode(contact: string): string {
  const now = Date.now()
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  getDb().otpSet(contact, {
    hash: hashCode(contact, code),
    expiresAt: now + TTL_MS,
    attempts: 0,
    lastSentAt: now,
  })
  return code
}

export type VerifyResult = { ok: true } | { ok: false; reason: 'expired' | 'mismatch' | 'too_many' }

export function verifyCode(contact: string, code: string): VerifyResult {
  const db = getDb()
  const e = db.otpGet(contact)
  if (!e || Date.now() > e.expiresAt) {
    db.otpDelete(contact)
    return { ok: false, reason: 'expired' }
  }
  if (e.attempts >= MAX_ATTEMPTS) {
    db.otpDelete(contact)
    return { ok: false, reason: 'too_many' }
  }
  db.otpBumpAttempt(contact)
  if (hashCode(contact, code) !== e.hash) return { ok: false, reason: 'mismatch' }
  db.otpDelete(contact) // одноразовый
  return { ok: true }
}
