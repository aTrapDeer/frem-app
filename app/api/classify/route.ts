import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  aiClassifyMerchants,
  classifyBatch,
  createRuleFromDecision,
  merchantKey,
  recordMerchantCategory,
} from '@/lib/classification'
import {
  AI_CLASSIFY_LIMIT,
  checkRateLimit,
  rateLimitHeaders,
} from '@/lib/rate-limit'
import { db, getCurrentTimestamp } from '@/lib/turso'
import type { Entity } from '@/lib/bank-sync'

type StoredTransaction = {
  id: string
  name: string
  merchantName: string | null
  amount: number
  date: string
  category: string | null
  providerCategory: string | null
  entity: Entity
  classificationSource: 'default' | 'rule' | 'ai' | 'user'
}

type ClassificationGroup = {
  merchantKey: string
  displayName: string
  count: number
  totalSpent: number
  totalReceived: number
  category: string | null
  entity: Entity
  classificationSource: StoredTransaction['classificationSource']
  transactionIds: string[]
  latestDate: string
}

const VALID_ENTITIES: Entity[] = ['personal', 'business']

export const dynamic = 'force-dynamic'
export const revalidate = 0

function toStoredTransaction(row: Record<string, unknown>): StoredTransaction {
  return {
    id: String(row.id),
    name: String(row.name),
    merchantName: typeof row.merchant_name === 'string' ? row.merchant_name : null,
    amount: Number(row.amount),
    date: String(row.date),
    category: typeof row.category === 'string' ? row.category : null,
    providerCategory:
      typeof row.provider_category === 'string' ? row.provider_category : null,
    entity: row.entity as Entity,
    classificationSource:
      row.classification_source as StoredTransaction['classificationSource'],
  }
}

function mostCommon<T>(values: T[]): T {
  const counts = new Map<T, number>()
  let winner = values[0]
  let winnerCount = 0

  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1
    counts.set(value, count)
    if (count > winnerCount) {
      winner = value
      winnerCount = count
    }
  }

  return winner
}

function toCents(value: number): number {
  return Math.round(value * 100) / 100
}

function groupTransactions(transactions: StoredTransaction[]): ClassificationGroup[] {
  const grouped = new Map<string, StoredTransaction[]>()

  for (const transaction of transactions) {
    const key = merchantKey(transaction.merchantName ?? transaction.name)
    const existing = grouped.get(key) ?? []
    existing.push(transaction)
    grouped.set(key, existing)
  }

  return [...grouped.entries()]
    .map(([key, rows]) => {
      const displayNames = rows.map(row => row.merchantName ?? row.name)
      return {
        merchantKey: key,
        displayName: mostCommon(displayNames),
        count: rows.length,
        totalSpent: toCents(
          rows.reduce((sum, row) => sum + Math.max(0, row.amount), 0)
        ),
        totalReceived: toCents(
          rows.reduce((sum, row) => sum + Math.abs(Math.min(0, row.amount)), 0)
        ),
        category: mostCommon(rows.map(row => row.category)),
        entity: mostCommon(rows.map(row => row.entity)),
        classificationSource: mostCommon(
          rows.map(row => row.classificationSource)
        ),
        transactionIds: rows.map(row => row.id),
        latestDate: rows.reduce(
          (latest, row) => (row.date > latest ? row.date : latest),
          rows[0].date
        ),
      }
    })
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.displayName.localeCompare(right.displayName)
    )
}

async function loadReviewTransactions(userId: string): Promise<StoredTransaction[]> {
  const result = await db.execute({
    sql: `SELECT id, name, merchant_name, amount, date, category,
                 provider_category, entity, classification_source
          FROM bank_transactions
          WHERE user_id = ?
            AND classification_source != 'user'
            AND owner_pay_type IS NULL
          ORDER BY date DESC`,
    args: [userId],
  })

  return result.rows.map(row =>
    toStoredTransaction(row as Record<string, unknown>)
  )
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const transactions = await loadReviewTransactions(session.user.id)
    const groups = groupTransactions(transactions)

    return NextResponse.json(
      {
        groups,
        counts: {
          totalGroups: groups.length,
          uncategorized: groups.filter(group => group.category === null).length,
          transactions: transactions.length,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Error loading classification queue:', error)
    return NextResponse.json(
      { error: 'Failed to load classification queue' },
      { status: 500 }
    )
  }
}

async function autoClassify(userId: string) {
  const result = await db.execute({
    sql: `SELECT id, name, merchant_name, amount, date, category,
                 provider_category, entity, classification_source
          FROM bank_transactions
          WHERE user_id = ?
            AND classification_source = 'default'
            AND owner_pay_type IS NULL
          ORDER BY date DESC`,
    args: [userId],
  })
  const transactions = result.rows.map(row =>
    toStoredTransaction(row as Record<string, unknown>)
  )
  const batch = await classifyBatch(
    userId,
    transactions.map(transaction => ({
      id: transaction.id,
      name: transaction.name,
      merchantName: transaction.merchantName,
      providerCategory: transaction.providerCategory,
    }))
  )
  const resolved = { rules: 0, merchantMap: 0, plaid: 0, ai: 0 }
  const now = getCurrentTimestamp()

  for (const transaction of transactions) {
    const classification = batch.results.get(transaction.id)
    if (!classification) continue

    if (classification.source === 'rule') {
      await db.execute({
        sql: `UPDATE bank_transactions
              SET category = COALESCE(?, category),
                  entity = COALESCE(?, entity),
                  entity_label = COALESCE(?, entity_label),
                  is_tax_deductible = COALESCE(?, is_tax_deductible),
                  classification_source = 'rule',
                  updated_at = ?
              WHERE id = ? AND user_id = ?
                AND classification_source = 'default'
                AND owner_pay_type IS NULL`,
        args: [
          classification.category,
          classification.entity,
          classification.entityLabel,
          classification.isTaxDeductible === null
            ? null
            : classification.isTaxDeductible
              ? 1
              : 0,
          now,
          transaction.id,
          userId,
        ],
      })
      resolved.rules += 1
      continue
    }

    if (classification.source === 'merchant_map' && classification.category) {
      await db.execute({
        sql: `UPDATE bank_transactions
              SET category = ?, classification_source = 'ai', updated_at = ?
              WHERE id = ? AND user_id = ?
                AND classification_source = 'default'
                AND owner_pay_type IS NULL`,
        args: [classification.category, now, transaction.id, userId],
      })
      resolved.merchantMap += 1
      continue
    }

    if (
      classification.source === 'plaid' &&
      classification.category &&
      transaction.category === null
    ) {
      await db.execute({
        sql: `UPDATE bank_transactions
              SET category = ?, updated_at = ?
              WHERE id = ? AND user_id = ?
                AND category IS NULL
                AND classification_source = 'default'
                AND owner_pay_type IS NULL`,
        args: [classification.category, now, transaction.id, userId],
      })
      resolved.plaid += 1
    }
  }

  const aiCategories = await aiClassifyMerchants(batch.unresolved)

  for (const transaction of transactions) {
    const classification = batch.results.get(transaction.id)
    if (classification?.source !== 'unknown') continue

    const key = merchantKey(transaction.merchantName ?? transaction.name)
    const category = aiCategories.get(key)
    if (!category) continue

    await db.execute({
      sql: `UPDATE bank_transactions
            SET category = ?, classification_source = 'ai', updated_at = ?
            WHERE id = ? AND user_id = ?
              AND classification_source = 'default'
              AND owner_pay_type IS NULL`,
      args: [category, now, transaction.id, userId],
    })
    resolved.ai += 1
  }

  const unresolvedTransactions = transactions.filter(transaction => {
    const classification = batch.results.get(transaction.id)
    if (classification?.source !== 'unknown') return false
    const key = merchantKey(transaction.merchantName ?? transaction.name)
    return !aiCategories.has(key)
  })

  return {
    resolved,
    stillUnknown: unresolvedTransactions.length,
    remainingMerchants: new Set(
      unresolvedTransactions.map(transaction =>
        merchantKey(transaction.merchantName ?? transaction.name)
      )
    ).size,
  }
}

async function setMerchantClassification(
  userId: string,
  targetKey: string,
  category: string,
  entity?: Entity
): Promise<number> {
  const result = await db.execute({
    sql: `SELECT id, name, merchant_name
          FROM bank_transactions
          WHERE user_id = ? AND owner_pay_type IS NULL`,
    args: [userId],
  })
  const matching = result.rows
    .map(row => row as Record<string, unknown>)
    .filter(row =>
      merchantKey(
        typeof row.merchant_name === 'string'
          ? row.merchant_name
          : String(row.name)
      ) === targetKey
    )

  const now = getCurrentTimestamp()
  for (const row of matching) {
    await db.execute({
      sql: `UPDATE bank_transactions
            SET category = ?,
                entity = COALESCE(?, entity),
                classification_source = 'user',
                updated_at = ?
            WHERE id = ? AND user_id = ? AND owner_pay_type IS NULL`,
      args: [category, entity ?? null, now, String(row.id), userId],
    })
  }

  const representative = matching[0]
  if (representative) {
    const name = String(representative.name)
    const merchantName =
      typeof representative.merchant_name === 'string'
        ? representative.merchant_name
        : null

    await createRuleFromDecision(
      userId,
      { name, merchantName },
      { category, entity }
    )
    await recordMerchantCategory(
      targetKey,
      category,
      'user',
      merchantName ?? name
    )
  }

  return matching.length
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as {
      action?: unknown
      merchantKey?: unknown
      category?: unknown
      entity?: unknown
    } | null

    if (body?.action === 'auto') {
      const rateLimit = await checkRateLimit(
        session.user.id,
        AI_CLASSIFY_LIMIT
      )
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            details: `Try again after ${rateLimit.resetAt.toISOString()}`,
          },
          { status: 429, headers: rateLimitHeaders(rateLimit) }
        )
      }

      return NextResponse.json(await autoClassify(session.user.id))
    }

    if (body?.action === 'set') {
      // The client may send a raw merchant name instead of a precomputed key —
      // normalisation must happen server-side so the two can never drift
      if (
        (typeof body.merchantKey !== 'string' || body.merchantKey.trim().length === 0) &&
        typeof (body as { merchantName?: unknown }).merchantName === 'string'
      ) {
        body.merchantKey = merchantKey(String((body as { merchantName?: unknown }).merchantName))
      }

      if (
        typeof body.merchantKey !== 'string' ||
        body.merchantKey.trim().length === 0
      ) {
        return NextResponse.json(
          { error: 'merchantKey or merchantName is required' },
          { status: 400 }
        )
      }

      if (
        typeof body.category !== 'string' ||
        body.category.trim().length === 0 ||
        body.category.trim().length > 60
      ) {
        return NextResponse.json(
          { error: 'category must be between 1 and 60 characters' },
          { status: 400 }
        )
      }

      if (
        body.entity !== undefined &&
        (typeof body.entity !== 'string' ||
          !VALID_ENTITIES.includes(body.entity as Entity))
      ) {
        return NextResponse.json(
          { error: `entity must be one of: ${VALID_ENTITIES.join(', ')}` },
          { status: 400 }
        )
      }

      const updated = await setMerchantClassification(
        session.user.id,
        body.merchantKey,
        body.category.trim(),
        body.entity as Entity | undefined
      )
      return NextResponse.json({ updated })
    }

    return NextResponse.json(
      { error: 'action must be "auto" or "set"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error classifying transactions:', error)
    return NextResponse.json(
      { error: 'Failed to classify transactions' },
      { status: 500 }
    )
  }
}
