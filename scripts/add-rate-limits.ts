/**
 * Migration Script: Rate Limit Table
 *
 * Backs lib/rate-limit.ts. Shared state is required because serverless requests
 * land on different instances, so an in-process counter cannot bound usage.
 *
 * Usage: npx tsx scripts/add-rate-limits.ts
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
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║              Adding Rate Limit Table                       ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  try {
    await db.execute({
      sql: `CREATE TABLE IF NOT EXISTS rate_limits (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        bucket TEXT NOT NULL,
        window_start TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id, bucket, window_start)
      )`,
    })
    console.log('   ✅ rate_limits')

    await db.execute({
      sql: 'CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start)',
    })
    console.log('   ✅ idx_rate_limits_window')

    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║               ✨ Migration Complete! ✨                    ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')
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
