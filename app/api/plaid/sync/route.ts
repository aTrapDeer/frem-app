import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { BANK_SYNC_LIMIT, checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { fetchAccounts, syncTransactions } from '@/lib/plaid'
import {
  applySyncResult,
  getConnection,
  getConnectionAccessToken,
  getConnections,
  updateConnectionStatus,
  updateSyncCursor,
  upsertAccounts,
} from '@/lib/bank-sync'

type SyncSummary = {
  connectionId: string
  institutionName: string
  added: number
  modified: number
  removed: number
  skipped: number
  error?: string
}

/**
 * Pulls new transactions for one connection, or every connection when no id is
 * given. Balances refresh alongside so account totals stay current.
 */
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Plaid bills per call; a sync loop would be expensive
    const rateLimit = await checkRateLimit(userId, BANK_SYNC_LIMIT)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          details: `Try again after ${rateLimit.resetAt.toISOString()}`,
        },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    const body = (await request.json().catch(() => ({}))) as { connectionId?: string }

    // Scoped lookup: a connectionId belonging to someone else resolves to null
    const connections = body.connectionId
      ? [await getConnection(userId, body.connectionId)].filter(
          (connection): connection is NonNullable<typeof connection> => connection !== null
        )
      : await getConnections(userId)

    if (connections.length === 0) {
      return NextResponse.json(
        { error: body.connectionId ? 'Connection not found' : 'No connections to sync' },
        { status: body.connectionId ? 404 : 400 }
      )
    }

    const summaries: SyncSummary[] = []

    for (const connection of connections) {
      const summary: SyncSummary = {
        connectionId: connection.id,
        institutionName: connection.institution_name,
        added: 0,
        modified: 0,
        removed: 0,
        skipped: 0,
      }

      try {
        const accessToken = await getConnectionAccessToken(userId, connection.id)

        if (!accessToken) {
          summary.error = 'Missing access token'
          summaries.push(summary)
          continue
        }

        // Refresh accounts first so incoming transactions always find their
        // account row, and balances reflect this sync
        const accounts = await fetchAccounts(accessToken)
        await upsertAccounts(
          userId,
          connection.id,
          accounts,
          connection.entity,
          connection.entity_label
        )

        const result = await syncTransactions(accessToken, connection.sync_cursor)
        const applied = await applySyncResult(userId, connection.id, result)

        // Only advance the cursor once every page has been written
        await updateSyncCursor(userId, connection.id, result.nextCursor)

        if (connection.status !== 'active') {
          await updateConnectionStatus(userId, connection.id, 'active', null)
        }

        Object.assign(summary, applied)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Sync failed for connection ${connection.id}:`, message)

        // Leave the cursor untouched so the next attempt replays this window
        await updateConnectionStatus(userId, connection.id, 'error', message)
        summary.error = message
      }

      summaries.push(summary)
    }

    return NextResponse.json({ synced: summaries })
  } catch (error) {
    console.error('Error syncing bank data:', error)
    return NextResponse.json({ error: 'Failed to sync' }, { status: 500 })
  }
}
