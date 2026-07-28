/**
 * Bank Sync Status
 *
 * Shows what the last sync actually landed: connections, accounts, transactions,
 * and whether access tokens are stored encrypted.
 *
 * Read-only — never modifies anything.
 *
 * Usage: npx tsx scripts/check-bank-sync.ts
 */

import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local')
  process.exit(1)
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const money = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║                     Bank Sync Status                       ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  const connections = await db.execute({
    sql: `SELECT id, institution_name, provider, entity, entity_label, status,
                 last_synced_at, sync_cursor, access_token_encrypted
          FROM bank_connections ORDER BY created_at`,
  })

  console.log(`CONNECTIONS: ${connections.rows.length}\n`)

  for (const row of connections.rows) {
    const record = row as Record<string, unknown>
    const token = String(record.access_token_encrypted ?? '')
    // Encrypted payloads are "v1:iv:tag:ciphertext"; a raw Plaid token starts "access-"
    const encrypted = token.startsWith('v1:')

    console.log(`  ${record.institution_name}`)
    console.log(`    provider   : ${record.provider}`)
    console.log(`    entity     : ${record.entity}${record.entity_label ? ` (${record.entity_label})` : ''}`)
    console.log(`    status     : ${record.status}`)
    console.log(`    cursor     : ${record.sync_cursor ? 'set' : 'not set'}`)
    console.log(`    last synced: ${record.last_synced_at ?? 'never'}`)
    console.log(`    token       : ${encrypted ? '🔒 encrypted' : '⚠️  NOT ENCRYPTED'}`)
    console.log('')
  }

  const accounts = await db.execute({
    sql: `SELECT name, mask, account_type, account_subtype, current_balance, entity
          FROM bank_accounts ORDER BY account_type, name`,
  })

  console.log(`ACCOUNTS: ${accounts.rows.length}\n`)

  for (const row of accounts.rows) {
    const record = row as Record<string, unknown>
    const label = `${record.name}${record.mask ? ` ····${record.mask}` : ''}`
    const kind = String(record.account_subtype ?? record.account_type)
    console.log(
      `  ${label.slice(0, 30).padEnd(32)}${kind.padEnd(14)}` +
      `${money(Number(record.current_balance)).padStart(12)}  ${record.entity}`
    )
  }

  const summary = await db.execute({
    sql: 'SELECT COUNT(*) AS n, MIN(date) AS first, MAX(date) AS last FROM bank_transactions',
  })
  const stats = summary.rows[0] as Record<string, unknown>

  console.log(`\nTRANSACTIONS: ${stats.n}`)
  if (Number(stats.n) > 0) {
    console.log(`  date range: ${stats.first} → ${stats.last}\n`)

    const recent = await db.execute({
      sql: `SELECT date, name, amount, provider_category, entity, pending
            FROM bank_transactions ORDER BY date DESC, created_at DESC LIMIT 10`,
    })

    console.log('  Most recent:')
    for (const row of recent.rows) {
      const record = row as Record<string, unknown>
      const amount = Number(record.amount)
      // Plaid convention: positive is money leaving the account
      const direction = amount >= 0 ? '−' : '+'
      console.log(
        `    ${record.date}  ${String(record.name).slice(0, 26).padEnd(28)}` +
        `${(direction + money(Math.abs(amount))).padStart(11)}  ` +
        `${String(record.provider_category ?? '').slice(0, 18).padEnd(20)}${record.entity}` +
        `${record.pending ? '  (pending)' : ''}`
      )
    }

    const byEntity = await db.execute({
      sql: 'SELECT entity, COUNT(*) AS n FROM bank_transactions GROUP BY entity',
    })
    console.log('\n  By entity:')
    for (const row of byEntity.rows) {
      const record = row as Record<string, unknown>
      console.log(`    ${String(record.entity).padEnd(12)}${record.n}`)
    }
  }

  console.log('')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Check failed:', error)
    process.exit(1)
  })
