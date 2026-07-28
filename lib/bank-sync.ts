import { db, generateUUID, getCurrentTimestamp } from '@/lib/turso'
import { encrypt, decrypt } from '@/lib/encryption'
import type { AccountBase, PlaidTransaction, TransactionSyncResult } from '@/lib/plaid'

/**
 * Domain layer for synced bank data.
 *
 * Every function takes `userId` and every statement filters on it. There is no
 * row-level security in Turso, so tenancy is enforced here or nowhere.
 */

export type Entity = 'personal' | 'business'

export type BankConnection = {
  id: string
  user_id: string
  provider: 'plaid' | 'mercury'
  provider_item_id: string
  institution_id: string | null
  institution_name: string
  entity: Entity
  entity_label: string | null
  status: 'active' | 'reauth_required' | 'error' | 'disconnected'
  status_detail: string | null
  sync_cursor: string | null
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export type BankAccount = {
  id: string
  user_id: string
  connection_id: string
  provider_account_id: string
  name: string
  official_name: string | null
  account_type: string
  account_subtype: string | null
  mask: string | null
  current_balance: number
  available_balance: number | null
  credit_limit: number | null
  currency: string
  entity: Entity
  entity_label: string | null
  is_excluded: boolean
  last_balance_at: string | null
}

export type BankTransaction = {
  id: string
  user_id: string
  account_id: string
  amount: number
  currency: string
  date: string
  name: string
  merchant_name: string | null
  provider_category: string | null
  pending: boolean
  entity: Entity
  entity_label: string | null
  category: string | null
  classification_source: 'default' | 'rule' | 'ai' | 'user'
  is_tax_deductible: boolean | null
  notes: string | null
}

function rowToConnection(row: Record<string, unknown>): BankConnection {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    provider: row.provider as BankConnection['provider'],
    provider_item_id: row.provider_item_id as string,
    institution_id: (row.institution_id as string | null) ?? null,
    institution_name: row.institution_name as string,
    entity: row.entity as Entity,
    entity_label: (row.entity_label as string | null) ?? null,
    status: row.status as BankConnection['status'],
    status_detail: (row.status_detail as string | null) ?? null,
    sync_cursor: (row.sync_cursor as string | null) ?? null,
    last_synced_at: (row.last_synced_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

function rowToAccount(row: Record<string, unknown>): BankAccount {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    connection_id: row.connection_id as string,
    provider_account_id: row.provider_account_id as string,
    name: row.name as string,
    official_name: (row.official_name as string | null) ?? null,
    account_type: row.account_type as string,
    account_subtype: (row.account_subtype as string | null) ?? null,
    mask: (row.mask as string | null) ?? null,
    current_balance: (row.current_balance as number) ?? 0,
    available_balance: (row.available_balance as number | null) ?? null,
    credit_limit: (row.credit_limit as number | null) ?? null,
    currency: (row.currency as string) ?? 'USD',
    entity: row.entity as Entity,
    entity_label: (row.entity_label as string | null) ?? null,
    is_excluded: Boolean(row.is_excluded),
    last_balance_at: (row.last_balance_at as string | null) ?? null,
  }
}

function rowToTransaction(row: Record<string, unknown>): BankTransaction {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    account_id: row.account_id as string,
    amount: row.amount as number,
    currency: (row.currency as string) ?? 'USD',
    date: row.date as string,
    name: row.name as string,
    merchant_name: (row.merchant_name as string | null) ?? null,
    provider_category: (row.provider_category as string | null) ?? null,
    pending: Boolean(row.pending),
    entity: row.entity as Entity,
    entity_label: (row.entity_label as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    classification_source: row.classification_source as BankTransaction['classification_source'],
    is_tax_deductible:
      row.is_tax_deductible === null || row.is_tax_deductible === undefined
        ? null
        : Boolean(row.is_tax_deductible),
    notes: (row.notes as string | null) ?? null,
  }
}

// =============================================
// Connections
// =============================================

export async function createConnection(
  userId: string,
  input: {
    provider: 'plaid' | 'mercury'
    providerItemId: string
    institutionId: string | null
    institutionName: string
    accessToken: string
    entity: Entity
    entityLabel?: string | null
  }
): Promise<BankConnection> {
  const id = generateUUID()
  const now = getCurrentTimestamp()

  await db.execute({
    sql: `INSERT INTO bank_connections
            (id, user_id, provider, provider_item_id, institution_id, institution_name,
             access_token_encrypted, entity, entity_label, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
          ON CONFLICT (user_id, provider, provider_item_id) DO UPDATE SET
            access_token_encrypted = excluded.access_token_encrypted,
            institution_name = excluded.institution_name,
            status = 'active',
            status_detail = NULL,
            updated_at = excluded.updated_at`,
    args: [
      id,
      userId,
      input.provider,
      input.providerItemId,
      input.institutionId,
      input.institutionName,
      encrypt(input.accessToken),
      input.entity,
      input.entityLabel ?? null,
      now,
      now,
    ],
  })

  const result = await db.execute({
    sql: 'SELECT * FROM bank_connections WHERE user_id = ? AND provider = ? AND provider_item_id = ?',
    args: [userId, input.provider, input.providerItemId],
  })

  return rowToConnection(result.rows[0] as Record<string, unknown>)
}

export async function getConnections(userId: string): Promise<BankConnection[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM bank_connections WHERE user_id = ? AND status != ? ORDER BY created_at DESC',
    args: [userId, 'disconnected'],
  })
  return result.rows.map(row => rowToConnection(row as Record<string, unknown>))
}

export async function getConnection(userId: string, connectionId: string): Promise<BankConnection | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM bank_connections WHERE id = ? AND user_id = ?',
    args: [connectionId, userId],
  })
  return result.rows.length > 0 ? rowToConnection(result.rows[0] as Record<string, unknown>) : null
}

/**
 * Returns the decrypted access token for a connection the user owns.
 * Never expose the return value of this function through an API response.
 */
export async function getConnectionAccessToken(userId: string, connectionId: string): Promise<string | null> {
  const result = await db.execute({
    sql: 'SELECT access_token_encrypted FROM bank_connections WHERE id = ? AND user_id = ?',
    args: [connectionId, userId],
  })

  if (result.rows.length === 0) return null
  return decrypt((result.rows[0] as Record<string, unknown>).access_token_encrypted as string)
}

export async function updateConnectionStatus(
  userId: string,
  connectionId: string,
  status: BankConnection['status'],
  detail?: string | null
): Promise<void> {
  await db.execute({
    sql: 'UPDATE bank_connections SET status = ?, status_detail = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    args: [status, detail ?? null, getCurrentTimestamp(), connectionId, userId],
  })
}

export async function updateSyncCursor(userId: string, connectionId: string, cursor: string): Promise<void> {
  const now = getCurrentTimestamp()
  await db.execute({
    sql: 'UPDATE bank_connections SET sync_cursor = ?, last_synced_at = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    args: [cursor, now, now, connectionId, userId],
  })
}

export async function deleteConnection(userId: string, connectionId: string): Promise<void> {
  // Accounts and transactions cascade via foreign keys
  await db.execute({
    sql: 'DELETE FROM bank_connections WHERE id = ? AND user_id = ?',
    args: [connectionId, userId],
  })
}

// =============================================
// Accounts
// =============================================

/**
 * Inserts or refreshes the accounts under a connection.
 *
 * Entity is only set on insert — a user who has re-tagged an account keeps that
 * choice across every future sync.
 */
export async function upsertAccounts(
  userId: string,
  connectionId: string,
  accounts: AccountBase[],
  defaultEntity: Entity,
  defaultEntityLabel: string | null
): Promise<void> {
  const now = getCurrentTimestamp()

  for (const account of accounts) {
    await db.execute({
      sql: `INSERT INTO bank_accounts
              (id, user_id, connection_id, provider_account_id, name, official_name,
               account_type, account_subtype, mask, current_balance, available_balance,
               credit_limit, currency, entity, entity_label, last_balance_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (user_id, provider_account_id) DO UPDATE SET
              name = excluded.name,
              official_name = excluded.official_name,
              current_balance = excluded.current_balance,
              available_balance = excluded.available_balance,
              credit_limit = excluded.credit_limit,
              last_balance_at = excluded.last_balance_at,
              updated_at = excluded.updated_at`,
      args: [
        generateUUID(),
        userId,
        connectionId,
        account.account_id,
        account.name,
        account.official_name ?? null,
        account.type,
        account.subtype ?? null,
        account.mask ?? null,
        account.balances.current ?? 0,
        account.balances.available ?? null,
        account.balances.limit ?? null,
        account.balances.iso_currency_code ?? 'USD',
        defaultEntity,
        defaultEntityLabel,
        now,
        now,
        now,
      ],
    })
  }
}

export async function getBankAccounts(userId: string): Promise<BankAccount[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY entity, name',
    args: [userId],
  })
  return result.rows.map(row => rowToAccount(row as Record<string, unknown>))
}

/**
 * Re-tags an account and its transactions.
 *
 * Two accounts at the same institution can belong to different entities — a
 * personal and a business account at the same bank arrive under one connection
 * and cannot be distinguished automatically. Retagging must cascade, or history
 * keeps the entity the account happened to have when it was first synced.
 *
 * Transactions the user classified by hand are left alone.
 */
export async function updateAccountEntity(
  userId: string,
  accountId: string,
  entity: Entity,
  entityLabel: string | null
): Promise<{ transactionsRetagged: number }> {
  const now = getCurrentTimestamp()

  const updated = await db.execute({
    sql: 'UPDATE bank_accounts SET entity = ?, entity_label = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    args: [entity, entityLabel, now, accountId, userId],
  })

  if (updated.rowsAffected === 0) {
    throw new Error('Account not found or not owned by this user')
  }

  const retagged = await db.execute({
    sql: `UPDATE bank_transactions
          SET entity = ?, entity_label = ?, updated_at = ?
          WHERE account_id = ? AND user_id = ? AND classification_source != 'user'`,
    args: [entity, entityLabel, now, accountId, userId],
  })

  return { transactionsRetagged: retagged.rowsAffected }
}

/** Hides an account from totals and projections without unlinking it. */
export async function setAccountExcluded(
  userId: string,
  accountId: string,
  isExcluded: boolean
): Promise<void> {
  await db.execute({
    sql: 'UPDATE bank_accounts SET is_excluded = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    args: [isExcluded ? 1 : 0, getCurrentTimestamp(), accountId, userId],
  })
}

// =============================================
// Transactions
// =============================================

type AccountLookup = Map<string, { id: string; entity: Entity; entityLabel: string | null }>

async function buildAccountLookup(userId: string, connectionId: string): Promise<AccountLookup> {
  const result = await db.execute({
    sql: 'SELECT id, provider_account_id, entity, entity_label FROM bank_accounts WHERE user_id = ? AND connection_id = ?',
    args: [userId, connectionId],
  })

  const lookup: AccountLookup = new Map()
  for (const row of result.rows) {
    const record = row as Record<string, unknown>
    lookup.set(record.provider_account_id as string, {
      id: record.id as string,
      entity: record.entity as Entity,
      entityLabel: (record.entity_label as string | null) ?? null,
    })
  }
  return lookup
}

function primaryCategory(transaction: PlaidTransaction): string | null {
  return transaction.personal_finance_category?.primary ?? transaction.category?.[0] ?? null
}

function detailedCategory(transaction: PlaidTransaction): string | null {
  return transaction.personal_finance_category?.detailed ?? transaction.category?.join(' > ') ?? null
}

/**
 * Applies one sync result to the ledger.
 *
 * Transactions inherit their account's entity on insert. Updates deliberately
 * leave `entity`, `category` and `is_tax_deductible` alone when the user set
 * them — provider data must never silently undo a human classification.
 */
export async function applySyncResult(
  userId: string,
  connectionId: string,
  result: TransactionSyncResult
): Promise<{ added: number; modified: number; removed: number; skipped: number }> {
  const accounts = await buildAccountLookup(userId, connectionId)
  const now = getCurrentTimestamp()

  let skipped = 0

  const upsert = async (transaction: PlaidTransaction) => {
    const account = accounts.get(transaction.account_id)

    if (!account) {
      // Transaction for an account we haven't stored (e.g. a newly added account
      // mid-sync). Skipping is safe: the next sync sees it after accounts refresh.
      skipped += 1
      return
    }

    await db.execute({
      sql: `INSERT INTO bank_transactions
              (id, user_id, account_id, connection_id, provider_transaction_id, amount, currency,
               date, authorized_date, name, merchant_name, provider_category,
               provider_category_detailed, payment_channel, pending, entity, entity_label,
               classification_source, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'default', ?, ?)
            ON CONFLICT (user_id, provider_transaction_id) DO UPDATE SET
              amount = excluded.amount,
              date = excluded.date,
              authorized_date = excluded.authorized_date,
              name = excluded.name,
              merchant_name = excluded.merchant_name,
              provider_category = excluded.provider_category,
              provider_category_detailed = excluded.provider_category_detailed,
              payment_channel = excluded.payment_channel,
              pending = excluded.pending,
              entity = CASE WHEN bank_transactions.classification_source = 'user'
                            THEN bank_transactions.entity ELSE excluded.entity END,
              updated_at = excluded.updated_at`,
      args: [
        generateUUID(),
        userId,
        account.id,
        connectionId,
        transaction.transaction_id,
        transaction.amount,
        transaction.iso_currency_code ?? 'USD',
        transaction.date,
        transaction.authorized_date ?? null,
        transaction.name,
        transaction.merchant_name ?? null,
        primaryCategory(transaction),
        detailedCategory(transaction),
        transaction.payment_channel ?? null,
        transaction.pending ? 1 : 0,
        account.entity,
        account.entityLabel,
        now,
        now,
      ],
    })
  }

  for (const transaction of result.added) await upsert(transaction)
  for (const transaction of result.modified) await upsert(transaction)

  for (const removal of result.removed) {
    await db.execute({
      sql: 'DELETE FROM bank_transactions WHERE user_id = ? AND provider_transaction_id = ?',
      args: [userId, removal.transaction_id],
    })
  }

  return {
    added: result.added.length,
    modified: result.modified.length,
    removed: result.removed.length,
    skipped,
  }
}

export async function getBankTransactions(
  userId: string,
  options: { entity?: Entity; startDate?: string; endDate?: string; limit?: number } = {}
): Promise<BankTransaction[]> {
  let sql = 'SELECT * FROM bank_transactions WHERE user_id = ?'
  const args: (string | number)[] = [userId]

  if (options.entity) {
    sql += ' AND entity = ?'
    args.push(options.entity)
  }
  if (options.startDate) {
    sql += ' AND date >= ?'
    args.push(options.startDate)
  }
  if (options.endDate) {
    sql += ' AND date <= ?'
    args.push(options.endDate)
  }

  sql += ' ORDER BY date DESC, created_at DESC LIMIT ?'
  args.push(options.limit ?? 250)

  const result = await db.execute({ sql, args })
  return result.rows.map(row => rowToTransaction(row as Record<string, unknown>))
}

/**
 * Records a user's manual classification. Marks the row as user-owned so future
 * syncs stop overwriting it.
 */
export async function classifyTransaction(
  userId: string,
  transactionId: string,
  updates: { entity?: Entity; entityLabel?: string | null; category?: string | null; isTaxDeductible?: boolean | null }
): Promise<void> {
  const fields: string[] = ['classification_source = ?', 'updated_at = ?']
  const args: (string | number | null)[] = ['user', getCurrentTimestamp()]

  if (updates.entity !== undefined) {
    fields.push('entity = ?')
    args.push(updates.entity)
  }
  if (updates.entityLabel !== undefined) {
    fields.push('entity_label = ?')
    args.push(updates.entityLabel)
  }
  if (updates.category !== undefined) {
    fields.push('category = ?')
    args.push(updates.category)
  }
  if (updates.isTaxDeductible !== undefined) {
    fields.push('is_tax_deductible = ?')
    args.push(updates.isTaxDeductible === null ? null : updates.isTaxDeductible ? 1 : 0)
  }

  args.push(transactionId, userId)

  await db.execute({
    sql: `UPDATE bank_transactions SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    args,
  })
}
