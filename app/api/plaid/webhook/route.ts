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

/**
 * Plaid webhook receiver.
 *
 * Plaid pushes here when an Item changes, which is why the app does not poll:
 * banks post transactions once or twice a day, so polling burns calls to learn
 * nothing. The daily cron exists only as a backstop for webhooks that never
 * arrive.
 *
 * This endpoint is unauthenticated by necessity — Plaid calls it. It is safe
 * because the body is treated purely as a signal: the item_id is used to look
 * up a connection we already own, and the data itself is then fetched from
 * Plaid using our own stored credentials. Nothing in the payload is trusted as
 * data.
 */

type PlaidWebhook = {
  webhook_type?: string
  webhook_code?: string
  item_id?: string
  error?: { error_code?: string; error_message?: string } | null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as PlaidWebhook | null

    if (!body?.item_id) {
      return NextResponse.json({ error: 'Missing item_id' }, { status: 400 })
    }

    const { webhook_type: type, webhook_code: code, item_id: itemId } = body

    // Resolve the item to a connection WE own. An unknown item_id is ignored
    // rather than trusted.
    const result = await db.execute({
      sql: 'SELECT id, user_id, entity, entity_label, sync_cursor FROM bank_connections WHERE provider_item_id = ? AND provider = ?',
      args: [itemId, 'plaid'],
    })

    if (result.rows.length === 0) {
      // Acknowledge so Plaid stops retrying an item we no longer hold
      console.warn('[plaid/webhook] Unknown item_id, ignoring:', itemId)
      return NextResponse.json({ received: true })
    }

    const record = result.rows[0] as Record<string, unknown>
    const connectionId = record.id as string
    const userId = record.user_id as string

    console.log(`[plaid/webhook] ${type}/${code} for ${connectionId}`)

    // The user must re-authenticate; syncing will not fix it
    if (type === 'ITEM' && code === 'ERROR') {
      await updateConnectionStatus(
        userId,
        connectionId,
        'reauth_required',
        body.error?.error_message ?? 'Plaid reported an item error'
      )
      return NextResponse.json({ received: true })
    }

    if (type === 'ITEM' && code === 'PENDING_EXPIRATION') {
      await updateConnectionStatus(userId, connectionId, 'reauth_required', 'Consent is expiring soon')
      return NextResponse.json({ received: true })
    }

    // The only code that means "there is new data to pull"
    if (type !== 'TRANSACTIONS') {
      return NextResponse.json({ received: true })
    }

    const accessToken = await getConnectionAccessToken(userId, connectionId)
    if (!accessToken) {
      return NextResponse.json({ received: true })
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
    await updateSyncCursor(userId, connectionId, sync.nextCursor)

    console.log(`[plaid/webhook] applied +${applied.added} ~${applied.modified} -${applied.removed}`)

    return NextResponse.json({ received: true, ...applied })
  } catch (error) {
    console.error('[plaid/webhook] Failed:', error)
    // Return 200 so Plaid does not retry a request that will fail identically;
    // the daily cron will pick up whatever was missed
    return NextResponse.json({ received: true, error: 'Processing failed' })
  }
}
