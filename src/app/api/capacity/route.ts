import { NextResponse } from 'next/server'
import { capacity } from '@/lib/capacity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Публичная сводка ёмкости для плашки на регистрации (без чувствительных деталей). */
export async function GET() {
  const c = capacity()
  return NextResponse.json({ full: c.full, free: c.free })
}
