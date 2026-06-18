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
  const crm = getDb().crmRows()
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

      <h2 style={{ fontSize: 16, margin: '32px 0 4px' }}>Пользователи — воронка ({crm.length})</h2>
      <p style={{ color: '#5b6b82', margin: '0 0 14px', fontSize: 12 }}>
        Этап = где сейчас юзер: Регистрация → Telegram → MAX → Группа → Настроен → Оплатил.
      </p>
      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e6ebf2', borderRadius: 14 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, minWidth: 760 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#5b6b82', background: '#f1f4f9' }}>
              {['Почта', 'Этап', 'Статус', 'Триал', 'TG', 'MAX', 'Группа', 'Настроен', 'Оплачивал', 'Создан'].map(
                (h) => (
                  <th key={h} style={{ padding: '10px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {crm.map((r) => {
              const yn = (b: boolean) => (b ? <span style={{ color: '#13a05a' }}>✅</span> : <span style={{ color: '#c2ccda' }}>—</span>)
              const stageColor =
                r.stage === 'Оплатил' ? '#13a05a'
                  : r.stage === 'Приостановлен' || r.stage === 'Нужна оплата' ? '#d6453b'
                    : r.stage === 'Регистрация' ? '#8a98ad' : '#1763ff'
              const statusRu: Record<string, string> = {
                active: 'Активна', trialing: 'Триал', past_due: 'Просрочена', cancelled: 'Отменена', none: '—',
              }
              return (
                <tr key={r.id} style={{ borderTop: '1px solid #eef1f6' }}>
                  <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{r.email ?? '—'}</td>
                  <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                    <span style={{ color: stageColor, fontWeight: 700 }}>{r.stage}</span>
                  </td>
                  <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{statusRu[r.paymentStatus] ?? r.paymentStatus}</td>
                  <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                    {r.paymentStatus === 'trialing' ? `${r.daysRemaining} дн.` : '—'}
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>{yn(r.tgLinked)}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>{yn(r.maxLinked)}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>{yn(r.groupOk)}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>{yn(r.setupDone)}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>{yn(r.everPaid)}</td>
                  <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: '#8a98ad' }}>
                    {r.createdAt.slice(0, 10)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}
