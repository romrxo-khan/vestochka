import { cookies } from 'next/headers'
import { REG_COOKIE, verifySession } from './reg-session'
import { getDb, type User } from './control-db'

/** Достаёт контакт из тела подписанной reg-куки (base64url(contact|exp).sig). */
function decodeContact(token: string): string | null {
  const b64 = token.split('.')[0]
  if (!b64) return null
  try {
    return Buffer.from(b64, 'base64url').toString().split('|')[0] || null
  } catch {
    return null
  }
}

/** Текущий пользователь кабинета по подтверждённой reg-куке, иначе null. */
export async function cabinetUser(): Promise<User | null> {
  const cookie = (await cookies()).get(REG_COOKIE)?.value
  if (!cookie) return null
  const contact = decodeContact(cookie)
  if (!contact || !verifySession(cookie, contact)) return null
  return getDb().byEmailOrPhone(contact) ?? null
}
