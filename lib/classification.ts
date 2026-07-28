import { db, generateUUID, getCurrentTimestamp } from '@/lib/turso'
import type { Entity } from '@/lib/bank-sync'

/**
 * Transaction classification.
 *
 * Cost discipline is the whole design. Resolution is attempted cheapest-first,
 * and every answer that cost something is written back so it is never paid for
 * twice:
 *
 *   1. User rules      — their own decisions, replayed        free
 *   2. Merchant map    — learned, shared across accounts      free
 *   3. Plaid category  — already on the transaction           free, ~90% coverage
 *   4. AI             — genuinely unknown merchants only     costs money, batched
 *   5. Ask the user    — low confidence only                 costs attention
 *
 * Plaid supplies a spending category for most transactions. What it cannot know
 * is personal vs business — that is user-specific, and it is what rules exist
 * to capture.
 */

export type ClassificationSource = 'rule' | 'merchant_map' | 'plaid' | 'ai' | 'unknown'

export type Classification = {
  category: string | null
  entity: Entity | null
  entityLabel: string | null
  isTaxDeductible: boolean | null
  source: ClassificationSource
  confidence: number
}

export type TransactionRule = {
  id: string
  user_id: string
  match_value: string
  match_type: 'exact' | 'contains' | 'starts_with'
  entity: Entity | null
  entity_label: string | null
  category: string | null
  is_tax_deductible: boolean | null
  priority: number
  times_applied: number
}

export type ClassifiableTransaction = {
  id?: string
  name: string
  merchantName?: string | null
  providerCategory?: string | null
}

/**
 * Reduces a merchant string to a stable lookup key.
 *
 * Bank descriptors carry noise that differs per transaction — store numbers,
 * dates, reference ids — so "UBER 072515 SF**POOL**" and "UBER 063015 SF**POOL**"
 * must collapse to the same merchant or the map never gets a hit.
 */
export function merchantKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[0-9]{3,}/g, ' ')          // reference numbers, store ids
    .replace(/[*#]+/g, ' ')              // padding characters banks add
    .replace(/\b(inc|llc|ltd|co|corp)\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// =============================================
// Rules
// =============================================

function rowToRule(row: Record<string, unknown>): TransactionRule {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    match_value: row.match_value as string,
    match_type: row.match_type as TransactionRule['match_type'],
    entity: (row.entity as Entity | null) ?? null,
    entity_label: (row.entity_label as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    is_tax_deductible:
      row.is_tax_deductible === null || row.is_tax_deductible === undefined
        ? null
        : Boolean(row.is_tax_deductible),
    priority: Number(row.priority ?? 0),
    times_applied: Number(row.times_applied ?? 0),
  }
}

export async function getRules(userId: string): Promise<TransactionRule[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM transaction_rules WHERE user_id = ? ORDER BY priority DESC, created_at ASC',
    args: [userId],
  })
  return result.rows.map(row => rowToRule(row as Record<string, unknown>))
}

export function ruleMatches(rule: TransactionRule, transaction: ClassifiableTransaction): boolean {
  const haystack = `${transaction.merchantName ?? ''} ${transaction.name}`.toLowerCase()
  const needle = rule.match_value.toLowerCase()

  if (rule.match_type === 'exact') return haystack.trim() === needle
  if (rule.match_type === 'starts_with') return haystack.trim().startsWith(needle)
  return haystack.includes(needle)
}

/**
 * Creates a rule from a decision the user just made, so the same merchant is
 * never asked about twice.
 */
export async function createRuleFromDecision(
  userId: string,
  transaction: ClassifiableTransaction,
  decision: { entity?: Entity; entityLabel?: string | null; category?: string | null; isTaxDeductible?: boolean | null }
): Promise<void> {
  const matchValue = merchantKey(transaction.merchantName || transaction.name)
  if (!matchValue) return

  const now = getCurrentTimestamp()

  await db.execute({
    sql: `INSERT INTO transaction_rules
            (id, user_id, match_value, match_type, entity, entity_label, category,
             is_tax_deductible, priority, created_at, updated_at)
          VALUES (?, ?, ?, 'contains', ?, ?, ?, ?, 10, ?, ?)
          ON CONFLICT (user_id, match_value, match_type) DO UPDATE SET
            entity = COALESCE(excluded.entity, transaction_rules.entity),
            entity_label = excluded.entity_label,
            category = COALESCE(excluded.category, transaction_rules.category),
            is_tax_deductible = COALESCE(excluded.is_tax_deductible, transaction_rules.is_tax_deductible),
            updated_at = excluded.updated_at`,
    args: [
      generateUUID(),
      userId,
      matchValue,
      decision.entity ?? null,
      decision.entityLabel ?? null,
      decision.category ?? null,
      decision.isTaxDeductible === null || decision.isTaxDeductible === undefined
        ? null
        : decision.isTaxDeductible
          ? 1
          : 0,
      now,
      now,
    ],
  })
}

// =============================================
// Merchant map
// =============================================

export async function lookupMerchants(keys: string[]): Promise<Map<string, string>> {
  if (keys.length === 0) return new Map()

  const placeholders = keys.map(() => '?').join(', ')
  const result = await db.execute({
    sql: `SELECT merchant_key, category FROM merchant_categories WHERE merchant_key IN (${placeholders})`,
    args: keys,
  })

  const map = new Map<string, string>()
  for (const row of result.rows) {
    const record = row as Record<string, unknown>
    map.set(record.merchant_key as string, record.category as string)
  }
  return map
}

/**
 * Records a merchant → category mapping so it is resolved once, permanently.
 * A `user` source always wins over an `ai` guess.
 */
export async function recordMerchantCategory(
  key: string,
  category: string,
  source: 'plaid' | 'ai' | 'user',
  displayName?: string | null
): Promise<void> {
  if (!key || !category) return

  const now = getCurrentTimestamp()

  await db.execute({
    sql: `INSERT INTO merchant_categories (id, merchant_key, display_name, category, source, hit_count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, ?)
          ON CONFLICT (merchant_key) DO UPDATE SET
            hit_count = hit_count + 1,
            category = CASE
              WHEN excluded.source = 'user' THEN excluded.category
              WHEN merchant_categories.source = 'user' THEN merchant_categories.category
              ELSE excluded.category
            END,
            source = CASE
              WHEN excluded.source = 'user' THEN 'user'
              ELSE merchant_categories.source
            END,
            updated_at = excluded.updated_at`,
    args: [generateUUID(), key, displayName ?? null, category, source, now, now],
  })
}

// =============================================
// The cascade
// =============================================

/**
 * Classifies a batch of transactions without any network calls.
 *
 * Returns the resolved classifications plus the merchants that could not be
 * resolved locally — those are the only ones worth sending to a model.
 */
export async function classifyBatch(
  userId: string,
  transactions: ClassifiableTransaction[]
): Promise<{
  results: Map<string, Classification>
  unresolved: Array<{ key: string; displayName: string }>
}> {
  const rules = await getRules(userId)

  const keys = [...new Set(
    transactions
      .map(transaction => merchantKey(transaction.merchantName || transaction.name))
      .filter(Boolean)
  )]
  const merchantMap = await lookupMerchants(keys)

  const results = new Map<string, Classification>()
  const unresolved = new Map<string, string>()

  for (const transaction of transactions) {
    const identifier = transaction.id ?? transaction.name
    const key = merchantKey(transaction.merchantName || transaction.name)

    // 1. User rules — highest priority first, and the first match wins
    const rule = rules.find(candidate => ruleMatches(candidate, transaction))
    if (rule) {
      results.set(identifier, {
        category: rule.category,
        entity: rule.entity,
        entityLabel: rule.entity_label,
        isTaxDeductible: rule.is_tax_deductible,
        source: 'rule',
        confidence: 1,
      })
      continue
    }

    // 2. Learned merchant map
    const mapped = merchantMap.get(key)
    if (mapped) {
      results.set(identifier, {
        category: mapped,
        entity: null,
        entityLabel: null,
        isTaxDeductible: null,
        source: 'merchant_map',
        confidence: 0.9,
      })
      continue
    }

    // 3. Plaid's own category — free and already present
    if (transaction.providerCategory) {
      results.set(identifier, {
        category: transaction.providerCategory,
        entity: null,
        entityLabel: null,
        isTaxDeductible: null,
        source: 'plaid',
        confidence: 0.8,
      })
      continue
    }

    // 4. Nothing local resolved it — a model is the only remaining option
    results.set(identifier, {
      category: null,
      entity: null,
      entityLabel: null,
      isTaxDeductible: null,
      source: 'unknown',
      confidence: 0,
    })

    if (key) unresolved.set(key, transaction.merchantName || transaction.name)
  }

  return {
    results,
    unresolved: [...unresolved.entries()].map(([key, displayName]) => ({ key, displayName })),
  }
}

/**
 * Replays a user's rules over transactions already stored.
 *
 * Called after a new rule is created so the decision applies retroactively, not
 * just to future syncs. Never touches rows the user classified by hand.
 */
export async function applyRulesToExisting(userId: string): Promise<number> {
  const rules = await getRules(userId)
  if (rules.length === 0) return 0

  const stored = await db.execute({
    sql: `SELECT id, name, merchant_name FROM bank_transactions
          WHERE user_id = ? AND classification_source != 'user'`,
    args: [userId],
  })

  const now = getCurrentTimestamp()
  let updated = 0

  for (const row of stored.rows) {
    const record = row as Record<string, unknown>
    const transaction: ClassifiableTransaction = {
      id: record.id as string,
      name: record.name as string,
      merchantName: (record.merchant_name as string | null) ?? null,
    }

    const rule = rules.find(candidate => ruleMatches(candidate, transaction))
    if (!rule) continue

    await db.execute({
      sql: `UPDATE bank_transactions
            SET entity = COALESCE(?, entity),
                entity_label = ?,
                category = COALESCE(?, category),
                is_tax_deductible = COALESCE(?, is_tax_deductible),
                classification_source = 'rule',
                updated_at = ?
            WHERE id = ? AND user_id = ?`,
      args: [
        rule.entity,
        rule.entity_label,
        rule.category,
        rule.is_tax_deductible === null ? null : rule.is_tax_deductible ? 1 : 0,
        now,
        transaction.id as string,
        userId,
      ],
    })

    updated += 1
  }

  return updated
}
