/**
 * Migration script to add urgency_score column to financial_goals table
 * 
 * Run with: npx tsx scripts/add-urgency-score.ts
 */

import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

async function migrate() {
  console.log('Adding urgency_score column to financial_goals table...')
  
  try {
    // Add urgency_score column with default value of 3 (medium)
    await db.execute(`
      ALTER TABLE financial_goals 
      ADD COLUMN urgency_score INTEGER DEFAULT 3
    `)
    
    console.log('✅ Successfully added urgency_score column')
    
    // Update any null values to default
    await db.execute(`
      UPDATE financial_goals 
      SET urgency_score = 3 
      WHERE urgency_score IS NULL
    `)
    
    console.log('✅ Set default urgency_score for existing goals')
    
  } catch (error: any) {
    if (error.message?.includes('duplicate column name')) {
      console.log('ℹ️ Column urgency_score already exists, skipping...')
    } else {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
  }
  
  console.log('✅ Migration complete!')
  process.exit(0)
}

migrate()








