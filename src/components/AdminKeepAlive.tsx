'use client'

import { useEffect } from 'react'

/** Продлевает админ-сессию при открытии /admin (скользящий срок — токен заново не вводить). */
export default function AdminKeepAlive() {
  useEffect(() => {
    fetch('/api/admin/refresh', { method: 'POST' }).catch(() => {})
  }, [])
  return null
}
