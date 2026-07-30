/**
 * Migration: name column for manual accounts.
 *
 * investment_accounts rows were created by the wizard as anonymous type+balance
 * pairs. Managing them from the Accounts page needs a human name — "Charles
 * Schwab Brokerage" — so rows are recognisable in a list.
 *
 * Usage: npx tsx scripts/add-investment-labels.ts
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

async function migrate() {
  const info = await db.execute({ sql: 'PRAGMA table_info(investment_accounts)' })
  const columns = info.rows.map(row => String((row as Record<string, unknown>).name))

  if (columns.includes('label')) {
    console.log('⏭️  investment_accounts.label already exists')
    return
  }

  await db.execute({ sql: 'ALTER TABLE investment_accounts ADD COLUMN label TEXT NULL' })
  console.log('✅ investment_accounts.label added')
}

migrate()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  })
