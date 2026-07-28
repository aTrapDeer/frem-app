/**
 * Migration Script: Bank Sync (Plaid + Mercury) and Entity Ledger
 *
 * Adds the foundation for automatic transaction ingest:
 * - bank_connections     One link to an institution (a Plaid Item, or Mercury API key)
 * - bank_accounts        Individual accounts discovered under a connection
 * - bank_transactions    Ingested transactions, deduped on the provider's own ID
 *
 * Every table carries entity tagging (personal / business) so the same ledger can
 * answer both "what did I spend" and "what did the LLC spend".
 *
 * Usage: npx tsx scripts/add-bank-sync.ts
 */

import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env.local')
  process.exit(1)
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const createTableStatements = [
  {
    name: 'bank_connections',
    sql: `CREATE TABLE IF NOT EXISTS bank_connections (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK (provider IN ('plaid', 'mercury')),
      -- Plaid item_id, or a stable identifier for the Mercury organization
      provider_item_id TEXT NOT NULL,
      institution_id TEXT,
      institution_name TEXT NOT NULL,
      -- AES-256-GCM ciphertext from lib/encryption.ts. NEVER store plaintext here.
      access_token_encrypted TEXT NOT NULL,
      -- Default entity applied to accounts discovered under this connection
      entity TEXT NOT NULL DEFAULT 'personal' CHECK (entity IN ('personal', 'business')),
      -- Which business, when a user has more than one (e.g. the LLC vs a side entity)
      entity_label TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reauth_required', 'error', 'disconnected')),
      status_detail TEXT,
      -- Plaid /transactions/sync cursor for incremental pulls
      sync_cursor TEXT,
      last_synced_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, provider, provider_item_id)
    )`,
  },
  {
    name: 'bank_accounts',
    sql: `CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      connection_id TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      official_name TEXT,
      -- Plaid types: depository, credit, loan, investment, other
      account_type TEXT NOT NULL,
      account_subtype TEXT,
      mask TEXT,
      -- Deliberately NOT constrained to >= 0: credit cards and loans are negative.
      -- The existing financial_accounts table got this wrong and cannot hold debt.
      current_balance REAL DEFAULT 0,
      available_balance REAL,
      credit_limit REAL,
      currency TEXT DEFAULT 'USD',
      entity TEXT NOT NULL DEFAULT 'personal' CHECK (entity IN ('personal', 'business')),
      entity_label TEXT,
      -- Excluded accounts stay synced but drop out of totals and projections
      is_excluded INTEGER NOT NULL DEFAULT 0,
      last_balance_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE,
      UNIQUE (user_id, provider_account_id)
    )`,
  },
  {
    name: 'bank_transactions',
    sql: `CREATE TABLE IF NOT EXISTS bank_transactions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      connection_id TEXT NOT NULL,
      provider_transaction_id TEXT NOT NULL,
      -- Positive = money out, negative = money in (Plaid's sign convention, kept
      -- as-is so raw data always matches the provider and stays auditable)
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      date TEXT NOT NULL,
      authorized_date TEXT,
      name TEXT NOT NULL,
      merchant_name TEXT,
      -- Provider's own categorisation, kept separate from ours
      provider_category TEXT,
      provider_category_detailed TEXT,
      payment_channel TEXT,
      pending INTEGER NOT NULL DEFAULT 0,
      -- Our classification layer
      entity TEXT NOT NULL DEFAULT 'personal' CHECK (entity IN ('personal', 'business')),
      entity_label TEXT,
      category TEXT,
      -- How entity/category were decided, so we never overwrite a human decision
      classification_source TEXT NOT NULL DEFAULT 'default'
        CHECK (classification_source IN ('default', 'rule', 'ai', 'user')),
      is_tax_deductible INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE,
      UNIQUE (user_id, provider_transaction_id)
    )`,
  },
]

const createIndexStatements = [
  {
    name: 'idx_bank_connections_user',
    sql: 'CREATE INDEX IF NOT EXISTS idx_bank_connections_user ON bank_connections(user_id, status)',
  },
  {
    name: 'idx_bank_accounts_user',
    sql: 'CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON bank_accounts(user_id, entity)',
  },
  {
    name: 'idx_bank_accounts_connection',
    sql: 'CREATE INDEX IF NOT EXISTS idx_bank_accounts_connection ON bank_accounts(connection_id)',
  },
  {
    // The hot path: "all of this user's transactions in a date range"
    name: 'idx_bank_transactions_user_date',
    sql: 'CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_date ON bank_transactions(user_id, date DESC)',
  },
  {
    name: 'idx_bank_transactions_account',
    sql: 'CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(account_id, date DESC)',
  },
  {
    // Entity-scoped reporting: personal vs business P&L
    name: 'idx_bank_transactions_entity',
    sql: 'CREATE INDEX IF NOT EXISTS idx_bank_transactions_entity ON bank_transactions(user_id, entity, date DESC)',
  },
]

async function migrate() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║        Adding Bank Sync + Entity Ledger Tables             ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  try {
    console.log('📦 Creating tables...\n')
    for (const statement of createTableStatements) {
      await db.execute({ sql: statement.sql })
      console.log(`   ✅ ${statement.name}`)
    }

    console.log('\n🔍 Creating indexes...\n')
    for (const statement of createIndexStatements) {
      await db.execute({ sql: statement.sql })
      console.log(`   ✅ ${statement.name}`)
    }

    console.log('\n📋 Verifying schema...\n')
    for (const statement of createTableStatements) {
      const info = await db.execute({ sql: `PRAGMA table_info(${statement.name})` })
      console.log(`   ${statement.name}: ${info.rows.length} columns`)
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║               ✨ Migration Complete! ✨                    ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    console.log('Next steps:')
    console.log('  1. Add ENCRYPTION_KEY to .env.local (openssl rand -base64 32)')
    console.log('  2. Add PLAID_CLIENT_ID / PLAID_SECRET / PLAID_ENV=sandbox')
    console.log('  3. Link a sandbox institution from the app')
    console.log('')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  })
