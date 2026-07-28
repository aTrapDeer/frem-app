/**
 * Migration Script: Entity-Scoped Goals + Transaction Classification
 *
 * Three additions:
 *
 * 1. financial_goals.entity — business money cannot fund a personal goal
 *    directly; it has to leave the company as salary or a distribution first,
 *    which is a taxable event. Scoping goals by entity keeps the two surplus
 *    pools separate so projections stop implying impossible transfers.
 *
 * 2. transaction_rules — a user's own classification decisions, replayed
 *    automatically. Classifying "Tectra Inc" once should apply forever, across
 *    every account.
 *
 * 3. merchant_categories — a learned merchant → category map, so a merchant is
 *    only ever resolved once. This is what keeps AI classification cost near
 *    zero: the model is consulted for genuinely unknown merchants and the answer
 *    is cached permanently.
 *
 * Usage: npx tsx scripts/add-classification.ts
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

const tables = [
  {
    name: 'transaction_rules',
    sql: `CREATE TABLE IF NOT EXISTS transaction_rules (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      -- Lowercased merchant or description fragment to match against
      match_value TEXT NOT NULL,
      match_type TEXT NOT NULL DEFAULT 'contains' CHECK (match_type IN ('exact', 'contains', 'starts_with')),
      -- What to apply when it matches. NULL means "leave this field alone".
      entity TEXT CHECK (entity IN ('personal', 'business')),
      entity_label TEXT,
      category TEXT,
      is_tax_deductible INTEGER,
      -- Higher priority wins when several rules match
      priority INTEGER NOT NULL DEFAULT 0,
      -- How often this rule has fired, for showing the user what is doing work
      times_applied INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, match_value, match_type)
    )`,
  },
  {
    name: 'merchant_categories',
    sql: `CREATE TABLE IF NOT EXISTS merchant_categories (
      id TEXT PRIMARY KEY NOT NULL,
      -- Normalised merchant name. Deliberately NOT scoped to a user: merchant
      -- names are not personal data, and sharing them means each merchant is
      -- resolved once rather than once per user. Amounts and account linkage
      -- are never stored here.
      merchant_key TEXT NOT NULL UNIQUE,
      display_name TEXT,
      category TEXT NOT NULL,
      -- plaid | ai | user  — where this mapping came from
      source TEXT NOT NULL DEFAULT 'plaid' CHECK (source IN ('plaid', 'ai', 'user')),
      confidence REAL NOT NULL DEFAULT 1.0,
      -- Usage count; a mapping seen many times is more trustworthy
      hit_count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'spending_estimates',
    sql: `CREATE TABLE IF NOT EXISTS spending_estimates (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      -- What the user said they spend, before any real data arrived
      monthly_estimate REAL NOT NULL CHECK (monthly_estimate >= 0),
      entity TEXT NOT NULL DEFAULT 'personal' CHECK (entity IN ('personal', 'business')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, category, entity)
    )`,
  },
]

const indexes = [
  {
    name: 'idx_transaction_rules_user',
    sql: 'CREATE INDEX IF NOT EXISTS idx_transaction_rules_user ON transaction_rules(user_id, priority DESC)',
  },
  {
    name: 'idx_merchant_categories_key',
    sql: 'CREATE INDEX IF NOT EXISTS idx_merchant_categories_key ON merchant_categories(merchant_key)',
  },
  {
    name: 'idx_goals_entity',
    sql: 'CREATE INDEX IF NOT EXISTS idx_goals_entity ON financial_goals(user_id, entity, status)',
  },
]

async function migrate() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║       Entity-Scoped Goals + Transaction Classification     ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  try {
    console.log('📦 Adding columns...\n')

    // Existing goals default to personal, which is what they were implicitly
    await addColumnIfMissing(
      'financial_goals',
      'entity',
      `entity TEXT NOT NULL DEFAULT 'personal' CHECK (entity IN ('personal', 'business'))`
    )
    await addColumnIfMissing('financial_goals', 'entity_label', 'entity_label TEXT')

    console.log('\n📦 Creating tables...\n')
    for (const table of tables) {
      await db.execute({ sql: table.sql })
      console.log(`   ✅ ${table.name}`)
    }

    console.log('\n🔍 Creating indexes...\n')
    for (const index of indexes) {
      await db.execute({ sql: index.sql })
      console.log(`   ✅ ${index.name}`)
    }

    const goals = await db.execute({ sql: 'SELECT entity, COUNT(*) AS n FROM financial_goals GROUP BY entity' })
    console.log('\n📋 Goals by entity:')
    for (const row of goals.rows) {
      const record = row as Record<string, unknown>
      console.log(`   ${String(record.entity).padEnd(12)}${record.n}`)
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
