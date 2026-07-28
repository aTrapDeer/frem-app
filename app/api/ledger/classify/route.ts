import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { classifyTransaction, type Entity } from '@/lib/bank-sync'
import { applyRulesToExisting, createRuleFromDecision } from '@/lib/classification'

const VALID_ENTITIES: Entity[] = ['personal', 'business']

/**
 * Records a classification decision.
 *
 * The decision is applied to the transaction, then optionally saved as a rule
 * so the same merchant is never asked about again — and replayed over existing
 * history, since a decision that only applies going forward leaves the past
 * wrong.
 */
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as {
      transactionId?: string
      name?: string
      merchantName?: string | null
      entity?: string
      entityLabel?: string | null
      category?: string | null
      isTaxDeductible?: boolean | null
      createRule?: boolean
    } | null

    if (!body?.transactionId) {
      return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
    }

    if (body.entity !== undefined && !VALID_ENTITIES.includes(body.entity as Entity)) {
      return NextResponse.json(
        { error: `entity must be one of: ${VALID_ENTITIES.join(', ')}` },
        { status: 400 }
      )
    }

    await classifyTransaction(session.user.id, body.transactionId, {
      entity: body.entity as Entity | undefined,
      entityLabel: body.entityLabel,
      category: body.category,
      isTaxDeductible: body.isTaxDeductible,
    })

    let rulesApplied = 0

    // Remembering the decision is the whole point of the cascade — without it
    // every recurring merchant gets asked about forever
    if (body.createRule && body.name) {
      await createRuleFromDecision(
        session.user.id,
        { name: body.name, merchantName: body.merchantName },
        {
          entity: body.entity as Entity | undefined,
          entityLabel: body.entityLabel,
          category: body.category,
          isTaxDeductible: body.isTaxDeductible,
        }
      )
      rulesApplied = await applyRulesToExisting(session.user.id)
    }

    return NextResponse.json({ message: 'Classified', rulesApplied })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not owned') || message.includes('not found')) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    console.error('Error classifying transaction:', error)
    return NextResponse.json({ error: 'Failed to classify' }, { status: 500 })
  }
}
