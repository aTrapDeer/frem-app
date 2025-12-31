/**
 * Migration: Add Income Sources Table
 * 
 * This script adds the income_sources table for tracking:
 * - Regular bi-weekly/monthly income
 * - Variable commission-based income with high/low/frequency calculations
 * 
 * Usage: npx tsx scripts/add-income-sources.ts
 */

import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
  process.exit(1)
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function migrate() {
  console.log('🚀 Adding Income Sources table...\n')

  try {
    // Create income_sources table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS income_sources (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        
        -- Income type: 'salary', 'hourly', 'commission', 'freelance', 'other'
        income_type TEXT NOT NULL CHECK (income_type IN ('salary', 'hourly', 'commission', 'freelance', 'other')),
        
        -- Payment frequency: 'weekly', 'biweekly', 'semimonthly', 'monthly', 'variable'
        pay_frequency TEXT NOT NULL CHECK (pay_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly', 'variable')),
        
        -- Base amount (for salary/hourly - the guaranteed amount per pay period)
        base_amount REAL DEFAULT 0 CHECK (base_amount >= 0),
        
        -- For hourly: hours per week
        hours_per_week REAL DEFAULT 0 CHECK (hours_per_week >= 0),
        
        -- Commission fields (only used when income_type = 'commission')
        is_commission_based INTEGER DEFAULT 0,
        commission_high REAL DEFAULT 0 CHECK (commission_high >= 0),
        commission_low REAL DEFAULT 0 CHECK (commission_low >= 0),
        commission_frequency_per_period REAL DEFAULT 0 CHECK (commission_frequency_per_period >= 0),
        
        -- Calculated monthly estimates (updated when source is saved)
        estimated_monthly_low REAL DEFAULT 0,
        estimated_monthly_mid REAL DEFAULT 0,
        estimated_monthly_high REAL DEFAULT 0,
        
        -- Status
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
        start_date TEXT,
        end_date TEXT,
        
        -- Metadata
        is_primary INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    console.log('✅ Created income_sources table')

    // Create indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_income_sources_user_status 
      ON income_sources(user_id, status)
    `)
    console.log('✅ Created indexes')

    // Update user_settings to track if user has commission job
    await db.execute(`
      ALTER TABLE user_settings ADD COLUMN has_commission_income INTEGER DEFAULT 0
    `).catch(() => {
      console.log('ℹ️  has_commission_income column already exists or table not found')
    })

    console.log('\n✨ Migration complete!')
    console.log('\nNext steps:')
    console.log('  1. Restart your dev server: npm run dev')
    console.log('  2. The income sources feature is now available')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrate()

