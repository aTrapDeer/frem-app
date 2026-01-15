import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

async function migrate() {
  console.log('Adding interest_rate column to financial_goals table...')

  try {
    await db.execute(`
      ALTER TABLE financial_goals
      ADD COLUMN interest_rate REAL
    `)

    console.log('✅ Successfully added interest_rate column')
  } catch (error: any) {
    if (error.message?.includes('duplicate column name')) {
      console.log('ℹ️ Column interest_rate already exists, skipping...')
    } else {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
  }

  console.log('✅ Migration complete!')
  process.exit(0)
}

migrate()

