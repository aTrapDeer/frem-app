import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { setAccountExcluded, updateAccountEntity, type Entity } from '@/lib/bank-sync'

const VALID_ENTITIES: Entity[] = ['personal', 'business']

/**
 * Re-tags a single synced account.
 *
 * Needed because one institution can hold accounts belonging to different
 * entities — a personal and a business account at the same bank link as one
 * connection, so the entity cannot be inferred per account.
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as {
      accountId?: string
      entity?: string
      entityLabel?: string | null
      isExcluded?: boolean
    } | null

    if (!body?.accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    if (body.isExcluded !== undefined) {
      await setAccountExcluded(session.user.id, body.accountId, body.isExcluded)
    }

    if (body.entity === undefined) {
      return NextResponse.json({ message: 'Account updated' })
    }

    if (!VALID_ENTITIES.includes(body.entity as Entity)) {
      return NextResponse.json(
        { error: `entity must be one of: ${VALID_ENTITIES.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await updateAccountEntity(
      session.user.id,
      body.accountId,
      body.entity as Entity,
      body.entityLabel ?? null
    )

    return NextResponse.json({
      message: 'Account updated',
      transactionsRetagged: result.transactionsRetagged,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (message.includes('not owned')) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    console.error('Error updating bank account:', error)
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }
}
