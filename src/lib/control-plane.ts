/**
 * Клиент control-plane API (центральный узел). Сайт зовёт его, чтобы создать пользователя
 * и стартовать триал после подтверждения контакта.
 *
 * env:
 *   CONTROL_API_URL   — базовый URL API (например http://control-plane:8092). Если не задан —
 *                       вызовы пропускаются (dev без запущенного API), чтобы поток не падал.
 *   CONTROL_API_TOKEN — общий секрет (заголовок x-api-token).
 */
export interface RegisterResult {
  ok: boolean
  userId?: number
  isNew?: boolean
  status?: string
  paymentStatus?: string
  trialEndsAt?: string | null
  daysRemaining?: number
  skipped?: boolean
  error?: string
}

export async function registerUser(input: {
  email?: string
  phone?: string
  plan?: 'shared' | 'personal'
}): Promise<RegisterResult> {
  const base = process.env.CONTROL_API_URL
  if (!base) {
    console.log('[control-plane] CONTROL_API_URL не задан — регистрация в БД пропущена (dev)')
    return { ok: true, skipped: true }
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/register`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-token': process.env.CONTROL_API_TOKEN ?? '',
      },
      body: JSON.stringify(input),
    })
    const data = (await res.json().catch(() => null)) as RegisterResult | null
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error ?? `http ${res.status}` }
    }
    return data
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
