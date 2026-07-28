/**
 * Disconnect a bank connection.
 *
 * Revokes the access token at Plaid first so the Item is released (Items count
 * against your plan limit even when unused), then removes the local rows.
 * Accounts and transactions cascade via foreign keys.
 *
 * Usage:
 *   npx tsx scripts/disconnect-bank.ts --list
 *   npx tsx scripts/disconnect-bank.ts --all
 *   npx tsx scripts/disconnect-bank.ts <connection-id>
 */

import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const { db } = await import('../lib/turso')
  const { decrypt } = await import('../lib/encryption')

  const arg = process.argv[2]

  const connections = await db.execute({
    sql: `SELECT c.id, c.user_id, c.institution_name, c.provider, c.access_token_encrypted,
                 (SELECT COUNT(*) FROM bank_accounts a WHERE a.connection_id = c.id) AS accounts,
                 (SELECT COUNT(*) FROM bank_transactions t WHERE t.connection_id = c.id) AS transactions
          FROM bank_connections c ORDER BY c.created_at`,
  })

  if (connections.rows.length === 0) {
    console.log('\nNo connections found.\n')
    return
  }

  console.log(`\nCONNECTIONS (${connections.rows.length}):\n`)
  for (const row of connections.rows) {
    const record = row as Record<string, unknown>
    console.log(`  ${record.id}`)
    console.log(`    ${record.institution_name} — ${record.accounts} accounts, ${record.transactions} transactions\n`)
  }

  if (!arg || arg === '--list') {
    console.log('Pass a connection id, or --all, to disconnect.\n')
    return
  }

  const targets = connections.rows.filter(row => {
    const record = row as Record<string, unknown>
    return arg === '--all' || record.id === arg
  })

  if (targets.length === 0) {
    console.error(`No connection matching "${arg}"\n`)
    process.exit(1)
  }

  for (const row of targets) {
    const record = row as Record<string, unknown>
    const name = String(record.institution_name)

    console.log(`Disconnecting ${name}...`)

    if (record.provider === 'plaid') {
      try {
        const { removeItem } = await import('../lib/plaid')
        await removeItem(decrypt(String(record.access_token_encrypted)))
        console.log('   ✅ revoked at Plaid (Item released)')
      } catch (error) {
        // A sandbox token is invalid in production and vice versa; removing the
        // local row is still correct
        const message = error instanceof Error ? error.message : String(error)
        console.log(`   ⚠️  Plaid revoke failed (${message.slice(0, 80)})`)
        console.log('      Removing locally anyway')
      }
    }

    await db.execute({
      sql: 'DELETE FROM bank_connections WHERE id = ? AND user_id = ?',
      args: [record.id as string, record.user_id as string],
    })
    console.log(`   ✅ removed locally (${record.accounts} accounts, ${record.transactions} transactions cascaded)\n`)
  }

  const remaining = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM bank_connections' })
  const accounts = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM bank_accounts' })
  const transactions = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM bank_transactions' })

  console.log('Remaining:')
  console.log(`  connections : ${(remaining.rows[0] as Record<string, unknown>).n}`)
  console.log(`  accounts    : ${(accounts.rows[0] as Record<string, unknown>).n}`)
  console.log(`  transactions: ${(transactions.rows[0] as Record<string, unknown>).n}\n`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Failed:', error)
    process.exit(1)
  })
