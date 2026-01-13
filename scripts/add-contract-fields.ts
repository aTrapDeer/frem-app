/**
 * Migration Script: Add Contract/Schedule Fields to Income Sources
 * 
 * This script adds support for time-limited recurring income with:
 * - Start/End dates (already exist)
 * - Initial payment (signing bonus / down payment)
 * - Final payment (completion bonus)
 * - Final payment date (can differ from end date)
 * 
 * Usage: npx tsx scripts/add-contract-fields.ts
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

async function migrate() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║    Adding Contract/Schedule Fields to Income Sources       ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  try {
    // Check existing columns
    const tableInfo = await db.execute({ sql: 'PRAGMA table_info(income_sources)' })
    const existingColumns = tableInfo.rows.map(row => row.name as string)
    
    console.log('📋 Existing columns:', existingColumns.join(', '))
    console.log('')

    // Add new columns if they don't exist
    const newColumns = [
      { name: 'initial_payment', sql: 'ALTER TABLE income_sources ADD COLUMN initial_payment REAL DEFAULT 0 CHECK (initial_payment >= 0)' },
      { name: 'final_payment', sql: 'ALTER TABLE income_sources ADD COLUMN final_payment REAL DEFAULT 0 CHECK (final_payment >= 0)' },
      { name: 'final_payment_date', sql: 'ALTER TABLE income_sources ADD COLUMN final_payment_date TEXT' },
    ]

    for (const col of newColumns) {
      if (existingColumns.includes(col.name)) {
        console.log(`   ⏭️  ${col.name} already exists, skipping`)
      } else {
        await db.execute({ sql: col.sql })
        console.log(`   ✅ Added ${col.name}`)
      }
    }

    // Verify the changes
    console.log('\n📋 Verifying schema...\n')
    const updatedInfo = await db.execute({ sql: 'PRAGMA table_info(income_sources)' })
    
    console.log('   Current income_sources columns:')
    for (const row of updatedInfo.rows) {
      console.log(`   • ${row.name} (${row.type})${row.dflt_value ? ` DEFAULT ${row.dflt_value}` : ''}`)
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║               ✨ Migration Complete! ✨                    ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    console.log('New fields added:')
    console.log('  • initial_payment - Down payment/signing bonus at contract start')
    console.log('  • final_payment - Completion payment at contract end')
    console.log('  • final_payment_date - When final payment is expected')
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
