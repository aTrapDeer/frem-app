/**
 * Migration Script: Owner Pay Classification
 *
 * Cross-entity transfers can be salary or owner distributions rather than
 * internal movement. This nullable marker keeps unconfirmed candidates distinct
 * from decisions the user has made.
 *
 * Usage: npx tsx scripts/add-owner-pay.ts
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

async function addColumnIfMissing(table: string, column: string, definition: string) {
  const info = await db.execute({ sql: `PRAGMA table_info(${table})` })
  const existing = info.rows.map(row => String((row as Record<string, unknown>).name))

  if (existing.includes(column)) {
    console.log(`   ⏭️  ${table}.${column} already exists`)
    return
  }

  await db.execute({ sql: `ALTER TABLE ${table} ADD COLUMN ${definition}` })
  console.log(`   ✅ ${table}.${column}`)
}

async function migrate() {
  console.log('Adding owner-pay classification...')

  try {
    await addColumnIfMissing(
      'bank_transactions',
      'owner_pay_type',
      "owner_pay_type TEXT NULL CHECK (owner_pay_type IN ('pending','salary','distribution'))"
    )

    console.log('\n✨ Migration complete!')
    console.log('Run with: npx tsx scripts/add-owner-pay.ts')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  })
