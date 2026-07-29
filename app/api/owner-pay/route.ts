import { NextResponse } from 'next/server'
import type { InStatement } from '@libsql/client'
import { auth } from '@/auth'
import { findOwnerPayCandidates, getLedger } from '@/lib/ledger'
import { db, getCurrentTimestamp } from '@/lib/turso'
import type { Entity } from '@/lib/bank-sync'

type OwnerPayType = 'pending' | 'salary' | 'distribution'
type OwnerPayDecision = Exclude<OwnerPayType, 'pending'> | 'not_owner_pay'

const VALID_TYPES: OwnerPayDecision[] = ['salary', 'distribution', 'not_owner_pay']

function isOwnerPayDecision(value: unknown): value is OwnerPayDecision {
  return typeof value === 'string' && VALID_TYPES.some(type => type === value)
}

function ownerPayStartDate(asOf: Date): string {
  const start = new Date(asOf)
  start.setFullYear(start.getFullYear() - 1)
  return start.toISOString().split('T')[0]
}

function markedTransaction(row: Record<string, unknown>) {
  const plaidAmount = Number(row.amount)
  const signedAmount = -plaidAmount

  return {
    id: String(row.id),
    date: String(row.date),
    description: String(row.name),
    merchantName: (row.merchant_name as string | null) ?? null,
    signedAmount,
    amount: Math.abs(plaidAmount),
    type: plaidAmount > 0 ? ('expense' as const) : ('income' as const),
    category: (row.category as string | null) ?? null,
    entity: row.entity as Entity,
    entityLabel: (row.entity_label as string | null) ?? null,
    accountId: String(row.account_id),
    classificationSource: (row.classification_source as string | null) ?? null,
    ownerPayType: row.owner_pay_type as OwnerPayType,
  }
}

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const asOf = new Date()
    const [entries, marked] = await Promise.all([
      getLedger(userId, {
        startDate: ownerPayStartDate(asOf),
        endDate: asOf.toISOString().split('T')[0],
        limit: 10_000,
      }),
      db.execute({
        sql: `SELECT id, account_id, date, name, merchant_name, amount, category,
                     entity, entity_label, classification_source, owner_pay_type
              FROM bank_transactions
              WHERE user_id = ? AND owner_pay_type IS NOT NULL
              ORDER BY date DESC`,
        args: [userId],
      }),
    ])

    return NextResponse.json({
      candidates: findOwnerPayCandidates(entries),
      marked: marked.rows.map(row => markedTransaction(row as Record<string, unknown>)),
    })
  } catch (error) {
    console.error('Error loading owner pay:', error)
    return NextResponse.json({ error: 'Failed to load owner pay' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as {
      transactionIds?: unknown
      type?: unknown
    } | null

    const rawTransactionIds: unknown[] | null = Array.isArray(body?.transactionIds)
      ? body.transactionIds
      : null

    if (
      !rawTransactionIds ||
      rawTransactionIds.length < 1 ||
      rawTransactionIds.length > 2 ||
      rawTransactionIds.some(id => typeof id !== 'string' || id.length === 0)
    ) {
      return NextResponse.json(
        { error: 'transactionIds must contain one or two transaction IDs' },
        { status: 400 }
      )
    }

    const transactionIds = [
      ...new Set(rawTransactionIds.filter((id): id is string => typeof id === 'string')),
    ]

    if (!isOwnerPayDecision(body?.type)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const userId = session.user.id
    const type = body.type
    const updatedAt = getCurrentTimestamp()
    const statements: InStatement[] = transactionIds.map(transactionId =>
      type === 'not_owner_pay'
        ? {
            sql: `UPDATE bank_transactions
                  SET owner_pay_type = NULL, updated_at = ?
                  WHERE id = ? AND user_id = ?`,
            args: [updatedAt, transactionId, userId],
          }
        : {
            sql: `UPDATE bank_transactions
                  SET owner_pay_type = ?, category = 'OWNER_PAY',
                      classification_source = 'user', updated_at = ?
                  WHERE id = ? AND user_id = ?`,
            args: [type, updatedAt, transactionId, userId],
          }
    )

    const results = await db.batch(statements, 'write')
    const updated = results.reduce((sum, result) => sum + result.rowsAffected, 0)

    return NextResponse.json({ updated, type })
  } catch (error) {
    console.error('Error updating owner pay:', error)
    return NextResponse.json({ error: 'Failed to update owner pay' }, { status: 500 })
  }
}
