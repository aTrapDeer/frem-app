/**
 * Migration Script: Entity on Plan Tables
 *
 * income_sources and recurring_expenses had no entity, so "business surplus"
 * could only ever come from synced transactions — the plan side had no way to
 * express that an income source is LLC revenue rather than personal wages.
 *
 * Existing rows default to personal, matching how goals defaulted, so nothing
 * changes for data entered before the split existed.
 *
 * Usage: npx tsx scripts/add-plan-entity.ts
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
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║               Adding Entity to Plan Tables                 ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  try {
    for (const table of ['income_sources', 'recurring_expenses']) {
      await addColumnIfMissing(
        table,
        'entity',
        `entity TEXT NOT NULL DEFAULT 'personal' CHECK (entity IN ('personal', 'business'))`
      )
      await addColumnIfMissing(table, 'entity_label', 'entity_label TEXT')
    }

    await db.execute({
      sql: 'CREATE INDEX IF NOT EXISTS idx_income_sources_entity ON income_sources(user_id, entity, status)',
    })
    console.log('   ✅ idx_income_sources_entity')

    await db.execute({
      sql: 'CREATE INDEX IF NOT EXISTS idx_recurring_expenses_entity ON recurring_expenses(user_id, entity, status)',
    })
    console.log('   ✅ idx_recurring_expenses_entity')

    console.log('\n📋 Current split:\n')
    for (const table of ['financial_goals', 'income_sources', 'recurring_expenses']) {
      const rows = await db.execute({ sql: `SELECT entity, COUNT(*) AS n FROM ${table} GROUP BY entity` })
      const summary = rows.rows
        .map(row => {
          const record = row as Record<string, unknown>
          return `${record.entity}=${record.n}`
        })
        .join('  ')
      console.log(`   ${table.padEnd(22)}${summary || '(empty)'}`)
    }

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
