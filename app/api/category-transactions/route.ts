import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { Entity } from '@/lib/bank-sync'
import { toAppCategory } from '@/lib/budget'
import { getLedger } from '@/lib/ledger'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Transactions belonging to one app category for one month — the web view's food. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = request.nextUrl.searchParams
    const category = params.get('category')?.toLowerCase().trim()
    if (!category) {
      return NextResponse.json({ error: 'category is required' }, { status: 400 })
    }

    const monthParam = params.get('month')
    const monthDate = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date()
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const entityParam = params.get('entity')
    const entity: Entity | undefined =
      entityParam === 'personal' || entityParam === 'business' ? entityParam : undefined

    const entries = await getLedger(session.user.id, {
      entity,
      startDate: iso(start),
      endDate: iso(end),
      limit: 2000,
    })

    const transactions = entries
      .filter(
        entry =>
          entry.type === 'expense' &&
          toAppCategory(entry.category, entry.detailedCategory, `${entry.merchantName ?? ''} ${entry.description}`) === category
      )
      .map(entry => ({
        id: entry.id,
        date: entry.date,
        description: entry.description,
        merchantName: entry.merchantName,
        amount: entry.amount,
        entity: entry.entity,
        source: entry.source,
      }))

    return NextResponse.json(
      { category, month: iso(start).slice(0, 7), transactions },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Error loading category transactions:', error)
    return NextResponse.json({ error: 'Failed to load category transactions' }, { status: 500 })
  }
}
