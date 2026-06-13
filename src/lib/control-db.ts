/**
 * БД пользователей/триалов/оплат — внутри сайта (Вариант A). Встроенный node:sqlite
 * (Node ≥ 24 — без флага). Файл БД на volume (CONTROL_DB). Инстанс кэшируется на globalThis,
 * чтобы переживать hot-reload в dev и жить один на процесс `next start`.
 *
 * Схема инлайнится строкой (а не читается из .sql), чтобы не зависеть от путей при сборке.
 */
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

export type Plan = 'shared' | 'personal'
export type Status = 'registered' | 'provisioning' | 'active' | 'suspended' | 'cancelled'
export type PaymentStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'cancelled'

export interface User {
  id: number
  email: string | null
  phone: string | null
  plan: Plan
  status: Status
  created_at: string
  payment_status: PaymentStatus
  payment_provider: string | null
  trial_ends_at: string | null
  current_period_end: string | null
  provider_customer_id: string | null
  provider_subscription_id: string | null
  updated_at: string
}

export interface Metrics {
  registered: number
  trialsStarted: number
  convertedEver: number
  currentlyPaying: number
  activeUsers: number
  trialToPaidPct: number
  cancelAfterFirstMonthPct: number
  crashesInWindow: number
  crashWindowDays: number
}

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT, phone TEXT,
  plan TEXT NOT NULL DEFAULT 'shared' CHECK (plan IN ('shared','personal')),
  status TEXT NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered','provisioning','active','suspended','cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  payment_status TEXT NOT NULL DEFAULT 'none'
    CHECK (payment_status IN ('none','trialing','active','past_due','cancelled')),
  payment_provider TEXT,
  trial_ends_at TEXT,
  current_period_end TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_email ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  type TEXT NOT NULL, detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
`

export class ControlDb {
  private readonly db: DatabaseSync

  constructor(file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    this.db = new DatabaseSync(file)
    this.db.exec(SCHEMA)
  }

  byId(id: number): User | undefined {
    return this.db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as unknown as User | undefined
  }

  byEmailOrPhone(value: string): User | undefined {
    return this.db
      .prepare(`SELECT * FROM users WHERE email = ? OR phone = ? LIMIT 1`)
      .get(value, value) as unknown as User | undefined
  }

  /**
   * Идемпотентная регистрация с триалом. Race-safe: уникальные индексы на email/phone +
   * перехват нарушения уникальности (если параллельный запрос успел вставить первым).
   * Email нормализуем в нижний регистр, чтобы case-варианты не плодили дубли.
   */
  findOrCreateTrialUser(input: { email?: string; phone?: string; plan?: Plan; trialDays?: number }): {
    user: User
    isNew: boolean
  } {
    const email = input.email ? input.email.trim().toLowerCase() : null
    const phone = input.phone ?? null
    const key = email ?? phone
    const existing = key ? this.byEmailOrPhone(key) : undefined
    if (existing) return { user: existing, isNew: false }

    let id: number
    try {
      id = (
        this.db
          .prepare(`INSERT INTO users (email, phone, plan) VALUES (?, ?, ?) RETURNING id`)
          .get(email, phone, input.plan ?? 'shared') as { id: number }
      ).id
    } catch (e) {
      // Проиграли гонку — кто-то вставил тот же контакт. Возвращаем существующего.
      const u = key ? this.byEmailOrPhone(key) : undefined
      if (u) return { user: u, isNew: false }
      throw e
    }
    this.logEvent(id, 'registered', input.plan ?? 'shared')
    const trialEnds = new Date(Date.now() + (input.trialDays ?? 7) * 86_400_000).toISOString()
    this.update(id, { payment_status: 'trialing', trial_ends_at: trialEnds })
    return { user: this.byId(id)!, isNew: true }
  }

  setPayment(
    userId: number,
    p: Partial<
      Pick<
        User,
        | 'payment_status'
        | 'payment_provider'
        | 'current_period_end'
        | 'provider_customer_id'
        | 'provider_subscription_id'
        | 'status'
      >
    >,
  ): void {
    this.update(userId, p)
    this.logEvent(userId, 'payment', p.payment_status ?? '')
  }

  markFirstPaid(userId: number): void {
    const seen = this.db
      .prepare(`SELECT 1 FROM events WHERE user_id = ? AND type = 'first_paid' LIMIT 1`)
      .get(userId)
    if (!seen) this.logEvent(userId, 'first_paid')
  }

  markCancelled(userId: number): void {
    this.update(userId, { status: 'cancelled', payment_status: 'cancelled' })
    this.logEvent(userId, 'cancelled')
  }

  recordCrash(userId: number | null = null, detail = ''): void {
    this.logEvent(userId, 'crash', detail)
  }

  daysRemaining(user: User): number {
    const end = user.current_period_end ?? user.trial_ends_at
    if (!end) return 0
    const ms = Date.parse(end) - Date.now()
    return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
  }

  getMetrics(crashWindowDays = 30): Metrics {
    const one = (sql: string, ...p: Array<string | number>) =>
      (this.db.prepare(sql).get(...p) as unknown as { n: number }).n
    const cutoff = new Date(Date.now() - crashWindowDays * 86_400_000).toISOString()
    const registered = one(`SELECT COUNT(*) n FROM users`)
    const trialsStarted = one(`SELECT COUNT(*) n FROM users WHERE payment_status != 'none'`)
    const convertedEver = one(`SELECT COUNT(DISTINCT user_id) n FROM events WHERE type='first_paid'`)
    const currentlyPaying = one(`SELECT COUNT(*) n FROM users WHERE payment_status='active'`)
    const activeUsers = one(`SELECT COUNT(*) n FROM users WHERE status='active'`)
    const cancelledAfterPaid = one(
      `SELECT COUNT(DISTINCT user_id) n FROM events WHERE type='cancelled'
        AND user_id IN (SELECT user_id FROM events WHERE type='first_paid')`,
    )
    const crashes = one(`SELECT COUNT(*) n FROM events WHERE type='crash' AND ts >= ?`, cutoff)
    const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)
    return {
      registered,
      trialsStarted,
      convertedEver,
      currentlyPaying,
      activeUsers,
      trialToPaidPct: pct(convertedEver, trialsStarted),
      cancelAfterFirstMonthPct: pct(cancelledAfterPaid, convertedEver),
      crashesInWindow: crashes,
      crashWindowDays,
    }
  }

  private update(userId: number, fields: Record<string, unknown>): void {
    const keys = Object.keys(fields)
    if (!keys.length) return
    const setSql = keys.map((k) => `${k} = ?`).join(', ')
    const values = keys.map((k) => fields[k] as string | number | null)
    this.db
      .prepare(
        `UPDATE users SET ${setSql}, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`,
      )
      .run(...values, userId)
  }

  private logEvent(userId: number | null, type: string, detail = ''): void {
    this.db.prepare(`INSERT INTO events (user_id, type, detail) VALUES (?, ?, ?)`).run(userId, type, detail)
  }
}

/** Кэшированный singleton (один на процесс). */
export function getDb(): ControlDb {
  const g = globalThis as unknown as { __controlDb?: ControlDb }
  if (!g.__controlDb) {
    const file = process.env.CONTROL_DB ?? path.join(process.cwd(), 'data', 'control.sqlite')
    g.__controlDb = new ControlDb(file)
  }
  return g.__controlDb
}
