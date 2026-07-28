/**
 * Manual sync trigger.
 *
 * Runs the same path as the button and the cron, but from the terminal — useful
 * in local development where Plaid's webhooks cannot reach localhost, so there
 * is nothing to tell the app that history has finished assembling.
 *
 * Usage: npx tsx scripts/sync-now.ts
 */

import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const { db } = await import('../lib/turso')
  const { fetchAccounts, syncTransactions } = await import('../lib/plaid')
  const {
    applySyncResult,
    getConnectionAccessToken,
    updateSyncCursor,
    upsertAccounts,
  } = await import('../lib/bank-sync')

  const connections = await db.execute({
    sql: `SELECT id, user_id, institution_name, entity, entity_label, sync_cursor
          FROM bank_connections WHERE provider = 'plaid' AND status != 'disconnected'`,
  })

  if (connections.rows.length === 0) {
    console.log('\nNo connections to sync.\n')
    return
  }

  for (const row of connections.rows) {
    const record = row as Record<string, unknown>
    const connectionId = record.id as string
    const userId = record.user_id as string

    console.log(`\nSyncing ${record.institution_name}...`)

    const accessToken = await getConnectionAccessToken(userId, connectionId)
    if (!accessToken) {
      console.error('   ❌ no access token')
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
    console.log(`   accounts refreshed: ${accounts.length}`)

    const sync = await syncTransactions(accessToken, (record.sync_cursor as string | null) ?? null)
    const applied = await applySyncResult(userId, connectionId, sync)
    await updateSyncCursor(userId, connectionId, sync.nextCursor)

    console.log(`   +${applied.added} added  ~${applied.modified} modified  -${applied.removed} removed`)
    if (applied.skipped > 0) console.log(`   ${applied.skipped} skipped (unknown account)`)

    if (applied.added === 0) {
      console.log('   ℹ️  Plaid may still be assembling history — re-run in a minute or two')
    }
  }

  const total = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM bank_transactions' })
  console.log(`\nTotal transactions stored: ${(total.rows[0] as Record<string, unknown>).n}\n`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Sync failed:', error)
    process.exit(1)
  })
