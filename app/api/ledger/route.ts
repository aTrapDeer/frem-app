import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { findInternalTransfers, findPossibleDuplicates, getBudgetVsActual, getEntitySurplus, getLedger } from '@/lib/ledger'
import type { Entity } from '@/lib/bank-sync'

const VALID_ENTITIES: Entity[] = ['personal', 'business']

/**
 * The unified ledger.
 *
 * `view=actual`   entries, synced and manual, with possible duplicates flagged
 * `view=variance` plan against actuals for the month
 * `view=surplus`  entity-scoped surplus pools
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const params = request.nextUrl.searchParams

    const view = params.get('view') ?? 'actual'
    const entityParam = params.get('entity')
    const entity = VALID_ENTITIES.includes(entityParam as Entity) ? (entityParam as Entity) : undefined

    const monthParam = params.get('month')
    // Parsed as local time so a YYYY-MM does not slip to the previous month
    const monthDate = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date()

    if (view === 'variance') {
      return NextResponse.json(await getBudgetVsActual(userId, monthDate, entity))
    }

    if (view === 'surplus') {
      return NextResponse.json(await getEntitySurplus(userId, monthDate))
    }

    const entries = await getLedger(userId, {
      entity,
      startDate: params.get('startDate') ?? undefined,
      endDate: params.get('endDate') ?? undefined,
      limit: Math.min(Number(params.get('limit') ?? 250) || 250, 1000),
    })

    // Matched pairs of money moving between the user's own linked accounts —
    // shown labelled rather than hidden, so the list still reconciles against
    // a bank statement
    const internalTransferIds = [...findInternalTransfers(entries)]

    return NextResponse.json({
      entries,
      internalTransferIds,
      duplicates: findPossibleDuplicates(entries),
      counts: {
        total: entries.length,
        synced: entries.filter(entry => entry.source === 'synced').length,
        manual: entries.filter(entry => entry.source === 'manual').length,
        needsReview: entries.filter(
          entry => entry.source === 'synced' && !entry.category
        ).length,
      },
    })
  } catch (error) {
    console.error('Error building ledger:', error)
    return NextResponse.json({ error: 'Failed to load ledger' }, { status: 500 })
  }
}
