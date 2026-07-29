/**
 * Reset the setup wizard for a user, keeping everything else.
 *
 * Clears setup_completed_at and setup_state so the login gate fires again.
 * Bank connections, accounts, transactions, goals, budgets — all untouched.
 * Optionally dedupes income sources that the wizard's double-post bug created
 * (identical name + entity, keeping the most recent row).
 *
 * Usage: npx tsx scripts/reset-wizard.ts <email> [--dedupe-income]
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function main() {
  const email = process.argv[2]
  const dedupe = process.argv.includes('--dedupe-income')

  if (!email) {
    console.error('Usage: npx tsx scripts/reset-wizard.ts <email> [--dedupe-income]')
    process.exit(1)
  }

  const { db } = await import('../lib/turso')

  const user = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email] })
  if (user.rows.length === 0) {
    console.error(`No user with email ${email}`)
    process.exit(1)
  }
  const userId = (user.rows[0] as Record<string, unknown>).id as string

  await db.execute({
    sql: 'UPDATE user_settings SET setup_completed_at = NULL, setup_state = NULL WHERE user_id = ?',
    args: [userId],
  })
  console.log('✅ wizard reset — the gate fires on the next fresh session')

  if (dedupe) {
    // Keep the newest row per (name, entity); soft-end the older duplicates
    const result = await db.execute({
      sql: `UPDATE income_sources SET status = 'ended', updated_at = datetime('now')
            WHERE user_id = ? AND status = 'active' AND id NOT IN (
              SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                  PARTITION BY name, entity ORDER BY created_at DESC
                ) AS rank FROM income_sources WHERE user_id = ? AND status = 'active'
              ) WHERE rank = 1
            )`,
      args: [userId, userId],
    })
    console.log(`✅ income dedupe: ${result.rowsAffected} duplicate row(s) ended`)
  }

  const remaining = await db.execute({
    sql: "SELECT name, estimated_monthly_mid FROM income_sources WHERE user_id = ? AND status = 'active'",
    args: [userId],
  })
  console.log('\nActive income sources now:')
  for (const row of remaining.rows as Array<Record<string, unknown>>) {
    console.log(`  ${String(row.name).padEnd(30)}$${Number(row.estimated_monthly_mid).toFixed(0)}/mo`)
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
