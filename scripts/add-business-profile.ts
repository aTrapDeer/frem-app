/**
 * Migration Script: Business Profiles
 *
 * Usage: npx tsx scripts/add-business-profile.ts
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

async function migrate() {
  console.log('Creating business_profiles...')

  try {
    await db.execute({
      sql: `CREATE TABLE IF NOT EXISTS business_profiles (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
              business_type TEXT NOT NULL
                CHECK (business_type IN ('sole_prop','llc','llc_s_corp','s_corp','c_corp','partnership')),
              payment_forms TEXT NOT NULL DEFAULT '[]',
              ownership_percentage REAL NOT NULL DEFAULT 100
                CHECK (ownership_percentage > 0 AND ownership_percentage <= 100),
              notes TEXT,
              created_at TEXT DEFAULT (datetime('now')),
              updated_at TEXT DEFAULT (datetime('now'))
            )`,
    })

    const info = await db.execute({ sql: 'PRAGMA table_info(business_profiles)' })
    const columns = new Set(
      info.rows.map(row => String((row as Record<string, unknown>).name))
    )
    const expected = [
      'id',
      'user_id',
      'business_type',
      'payment_forms',
      'ownership_percentage',
      'notes',
      'created_at',
      'updated_at',
    ]
    const missing = expected.filter(column => !columns.has(column))
    if (missing.length > 0) {
      throw new Error(`business_profiles is missing columns: ${missing.join(', ')}`)
    }

    console.log('business_profiles is ready')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
