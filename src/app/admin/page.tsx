import { cookies } from 'next/headers'
import { getDb } from '@/lib/control-db'
import { ADMIN_COOKIE, verifyAdminSession } from '@/lib/admin-auth'
import { capacity } from '@/lib/capacity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Дашборд метрик. Авторизация по httpOnly-куке (логин: /api/admin/login?token=…). */
export default async function AdminPage() {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value
  if (!verifyAdminSession(session)) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: 40, color: '#33415c' }}>
        <p>
          Доступ закрыт. Войдите: <code>/api/admin/login?token=…</code>
        </p>
      </main>
    )
  }

  const m = getDb().getMetrics()
  const cap = capacity()
  const cards: Array<[string, string | number, string?]> = [
    [
      'Места (занято / всего)',
      `${cap.used} / ${cap.total}`,
      `${cap.running} агентов запущено · свободно ${cap.free}${cap.full ? ' · ⛔ ПОЛНО' : cap.pct >= 80 ? ' · ⚠️ почти полно' : ''}`,
    ],
    ['Зарегистрировались', m.registered],
    ['Начали триал', m.trialsStarted, 'ввели карту/почту'],
    ['Платят сейчас', m.currentlyPaying],
    ['Конверсия триал→оплата', `${m.trialToPaidPct}%`, `${m.convertedEver} из ${m.trialsStarted}`],
    ['Отмен после 1-го платного', `${m.cancelAfterFirstMonthPct}%`, 'churn'],
    [`Падений за ${m.crashWindowDays} дн.`, m.crashesInWindow],
    ['Активные сейчас', m.activeUsers],
  ]

  return (
    <main style={{ fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto', background: '#f6f8fb', minHeight: '100vh', padding: 32, color: '#0f1b2d' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Весточка — ключевые показатели</h1>
      <p style={{ color: '#5b6b82', margin: '0 0 24px', fontSize: 13 }}>Обновляется при перезагрузке.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
        {cards.map(([label, value, hint]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e6ebf2', borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#1763ff' }}>{value}</div>
            <div style={{ fontSize: 13, color: '#33415c', marginTop: 4 }}>{label}</div>
            {hint && <div style={{ fontSize: 11, color: '#8a98ad', marginTop: 2 }}>{hint}</div>}
          </div>
        ))}
      </div>
    </main>
  )
}
