/**
 * Migration Script: Setup Wizard
 *
 * Adds resumable setup fields plus manually entered investments and debts.
 *
 * Usage: npx tsx scripts/add-setup-wizard.ts
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
    console.log(`   ${table}.${column} already exists`)
    return
  }

  await db.execute({ sql: `ALTER TABLE ${table} ADD COLUMN ${definition}` })
  console.log(`   Added ${table}.${column}`)
}

const tables = [
  {
    name: 'investment_accounts',
    sql: `CREATE TABLE IF NOT EXISTS investment_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_type TEXT NOT NULL CHECK (account_type IN ('401k','ira','roth','brokerage','hsa','other')),
      balance REAL NOT NULL DEFAULT 0 CHECK (balance >= 0),
      risk_profile TEXT NOT NULL DEFAULT 'index' CHECK (risk_profile IN ('conservative','index','aggressive')),
      entity TEXT NOT NULL DEFAULT 'personal' CHECK (entity IN ('personal','business')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
  },
  {
    name: 'liabilities',
    sql: `CREATE TABLE IF NOT EXISTS liabilities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('credit_card','student_loan','auto_loan','mortgage','personal_loan','other')),
      balance REAL NOT NULL DEFAULT 0 CHECK (balance >= 0),
      interest_rate REAL NULL CHECK (interest_rate IS NULL OR (interest_rate >= 0 AND interest_rate <= 100)),
      entity TEXT NOT NULL DEFAULT 'personal' CHECK (entity IN ('personal','business')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
  },
]

const indexes = [
  {
    name: 'idx_investment_accounts_user',
    sql: 'CREATE INDEX IF NOT EXISTS idx_investment_accounts_user ON investment_accounts(user_id)',
  },
  {
    name: 'idx_liabilities_user',
    sql: 'CREATE INDEX IF NOT EXISTS idx_liabilities_user ON liabilities(user_id)',
  },
]

async function migrate() {
  console.log('Adding setup wizard data model...')

  try {
    await addColumnIfMissing('user_settings', 'earning_types', 'earning_types TEXT NULL')
    await addColumnIfMissing(
      'user_settings',
      'filing_status',
      `filing_status TEXT NULL CHECK (filing_status IN ('single','married_joint'))`
    )
    await addColumnIfMissing('user_settings', 'tax_state', 'tax_state TEXT NULL')
    await addColumnIfMissing(
      'user_settings',
      'setup_completed_at',
      'setup_completed_at TEXT NULL'
    )
    await addColumnIfMissing('user_settings', 'setup_state', 'setup_state TEXT NULL')

    for (const table of tables) {
      await db.execute({ sql: table.sql })
      console.log(`   Ready: ${table.name}`)
    }

    for (const index of indexes) {
      await db.execute({ sql: index.sql })
      console.log(`   Ready: ${index.name}`)
    }

    console.log('Setup wizard migration complete')
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
