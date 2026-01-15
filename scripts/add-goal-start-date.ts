import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

async function migrate() {
  console.log('Adding start_date column to financial_goals table...')

  try {
    await db.execute(`
      ALTER TABLE financial_goals
      ADD COLUMN start_date TEXT
    `)

    console.log('✅ Successfully added start_date column')
  } catch (error: any) {
    if (error.message?.includes('duplicate column name')) {
      console.log('ℹ️ Column start_date already exists, skipping...')
    } else {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
  }

  console.log('✅ Migration complete!')
  process.exit(0)
}

migrate()

