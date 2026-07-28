/**
 * Database Status
 *
 * Lists the tables that exist and their row counts. Useful for confirming a
 * migration landed, and for seeing at a glance which schema version is live.
 *
 * Read-only — never modifies anything.
 *
 * Usage: npx tsx scripts/db-status.ts
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

/** Tables added by the bank-sync and rate-limit migrations. */
const EXPECTED_NEW_TABLES = ['bank_connections', 'bank_accounts', 'bank_transactions', 'rate_limits']

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                      Database Status                       ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  console.log(`   ${process.env.TURSO_DATABASE_URL}\n`)

  const tables = await db.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  })

  const names = tables.rows.map(row => String((row as Record<string, unknown>).name))

  console.log(`   Tables (${names.length}):\n`)

  for (const name of names) {
    const count = await db.execute({ sql: `SELECT COUNT(*) AS c FROM "${name}"` })
    const rows = Number((count.rows[0] as Record<string, unknown>).c)
    const marker = EXPECTED_NEW_TABLES.includes(name) ? ' ← new' : ''
    console.log(`   ${name.padEnd(30)} ${String(rows).padStart(6)} rows${marker}`)
  }

  const missing = EXPECTED_NEW_TABLES.filter(name => !names.includes(name))

  if (missing.length > 0) {
    console.log(`\n   ⚠️  Not yet created: ${missing.join(', ')}`)
    console.log('   Run: npx tsx scripts/add-bank-sync.ts')
    console.log('        npx tsx scripts/add-rate-limits.ts')
  } else {
    console.log('\n   ✅ All expected tables present')
  }

  console.log('')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Status check failed:', error)
    process.exit(1)
  })
