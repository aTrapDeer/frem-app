/**
 * Migration Script: Goal Account Links
 *
 * Adds optional account linkage and balance allocation fields to financial goals.
 *
 * Usage: npx tsx scripts/add-goal-links.ts
 */

import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local')
  process.exit(1)
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function addColumnIfMissing(table: string, column: string, definition: string) {
  const info = await db.execute({ sql: `PRAGMA table_info(${table})` })
  const existing = info.rows.map(row => String((row as Record<string, unknown>).name))

  if (existing.includes(column)) {
    console.log(`Skipping ${table}.${column}; it already exists`)
    return
  }

  await db.execute({ sql: `ALTER TABLE ${table} ADD COLUMN ${definition}` })
  console.log(`Added ${table}.${column}`)
}

async function migrate() {
  try {
    await addColumnIfMissing(
      'financial_goals',
      'linked_account_id',
      'linked_account_id TEXT'
    )
    await addColumnIfMissing(
      'financial_goals',
      'linked_account_kind',
      "linked_account_kind TEXT CHECK (linked_account_kind IN ('bank','investment'))"
    )
    await addColumnIfMissing(
      'financial_goals',
      'allocation_percent',
      'allocation_percent REAL CHECK (allocation_percent > 0 AND allocation_percent <= 100)'
    )

    console.log('Goal account link migration complete')
  } catch (error) {
    console.error('Goal account link migration failed:', error)
    process.exit(1)
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Goal account link migration failed:', error)
    process.exit(1)
  })
