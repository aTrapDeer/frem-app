import { NextResponse } from 'next/server'
import { db } from '@/lib/turso'
import { fetchAccounts, syncTransactions } from '@/lib/plaid'
import {
  applySyncResult,
  getConnectionAccessToken,
  updateConnectionStatus,
  updateSyncCursor,
  upsertAccounts,
} from '@/lib/bank-sync'
import { pruneRateLimits } from '@/lib/rate-limit'

/**
 * End-of-day sync across every active connection.
 *
 * A backstop, not the primary path: webhooks deliver new transactions as they
 * land. This catches items whose webhook never arrived, and gives every
 * connection a known-good daily floor.
 *
 * Scheduled from vercel.json. Vercel sends the cron secret as a Bearer token.
 */

export const maxDuration = 300

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET

  // Without a configured secret this endpoint would be an open trigger for
  // billable Plaid calls, so refuse rather than run unprotected
  if (!secret) return false

  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()

  const connections = await db.execute({
    sql: `SELECT id, user_id, institution_name, entity, entity_label, sync_cursor
          FROM bank_connections
          WHERE provider = 'plaid' AND status IN ('active', 'error')
          ORDER BY last_synced_at ASC NULLS FIRST`,
  })

  const results: Array<{
    connectionId: string
    institution: string
    added?: number
    modified?: number
    removed?: number
    error?: string
  }> = []

  for (const row of connections.rows) {
    const record = row as Record<string, unknown>
    const connectionId = record.id as string
    const userId = record.user_id as string
    const institution = String(record.institution_name)

    try {
      const accessToken = await getConnectionAccessToken(userId, connectionId)
      if (!accessToken) {
        results.push({ connectionId, institution, error: 'Missing access token' })
        continue
      }

      const accounts = await fetchAccounts(accessToken)
      await upsertAccounts(
        userId,
        connectionId,
        accounts,
        record.entity as 'personal' | 'business',
        (record.entity_label as string | null) ?? null
      )

      const sync = await syncTransactions(accessToken, (record.sync_cursor as string | null) ?? null)
      const applied = await applySyncResult(userId, connectionId, sync)

      // Advance the cursor only after every page has been written
      await updateSyncCursor(userId, connectionId, sync.nextCursor)
      await updateConnectionStatus(userId, connectionId, 'active', null)

      results.push({ connectionId, institution, ...applied })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[cron/daily-sync] ${institution} failed:`, message)

      // Leave the cursor untouched so the next run replays this window
      await updateConnectionStatus(userId, connectionId, 'error', message)
      results.push({ connectionId, institution, error: message })
    }
  }

  // Housekeeping: expired rate-limit windows are never read again
  await pruneRateLimits().catch(error => console.error('[cron/daily-sync] prune failed:', error))

  const totalAdded = results.reduce((sum, entry) => sum + (entry.added ?? 0), 0)
  const failed = results.filter(entry => entry.error).length

  console.log(
    `[cron/daily-sync] ${connections.rows.length} connections, +${totalAdded} transactions, ` +
    `${failed} failed, ${Date.now() - startedAt}ms`
  )

  return NextResponse.json({
    connections: connections.rows.length,
    totalAdded,
    failed,
    durationMs: Date.now() - startedAt,
    results,
  })
}
