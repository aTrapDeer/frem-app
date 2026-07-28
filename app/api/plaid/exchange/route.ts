import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { exchangePublicToken, fetchAccounts, isPlaidConfigured, syncTransactions } from '@/lib/plaid'
import { isEncryptionConfigured } from '@/lib/encryption'
import { applySyncResult, createConnection, updateSyncCursor, upsertAccounts, type Entity } from '@/lib/bank-sync'

const VALID_ENTITIES: Entity[] = ['personal', 'business']

/**
 * Completes a Plaid Link flow: exchanges the public token, stores the encrypted
 * access token, and pulls the initial account list.
 */
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isPlaidConfigured()) {
      return NextResponse.json({ error: 'Plaid is not configured' }, { status: 500 })
    }

    // Refuse rather than persist a bank token we cannot encrypt
    if (!isEncryptionConfigured()) {
      return NextResponse.json(
        { error: 'Encryption is not configured', details: 'Set ENCRYPTION_KEY before linking accounts' },
        { status: 500 }
      )
    }

    const body = (await request.json()) as {
      publicToken?: string
      entity?: string
      entityLabel?: string | null
    }

    if (!body.publicToken) {
      return NextResponse.json({ error: 'publicToken is required' }, { status: 400 })
    }

    const entity: Entity = VALID_ENTITIES.includes(body.entity as Entity)
      ? (body.entity as Entity)
      : 'personal'

    const exchanged = await exchangePublicToken(body.publicToken)

    const connection = await createConnection(session.user.id, {
      provider: 'plaid',
      providerItemId: exchanged.itemId,
      institutionId: exchanged.institutionId,
      institutionName: exchanged.institutionName,
      accessToken: exchanged.accessToken,
      entity,
      entityLabel: body.entityLabel ?? null,
    })

    const accounts = await fetchAccounts(exchanged.accessToken)
    await upsertAccounts(
      session.user.id,
      connection.id,
      accounts,
      entity,
      body.entityLabel ?? null
    )

    // Pull transactions immediately. Without this the user lands on a connection
    // showing accounts but zero activity, with no indication anything is
    // missing. Plaid may still be preparing the full history at this point, so
    // whatever is ready now arrives now and the rest follows via webhook (or the
    // manual sync button in local development, where webhooks cannot reach us).
    let transactionsAdded = 0
    let historyPending = false

    try {
      const sync = await syncTransactions(exchanged.accessToken, null)
      const applied = await applySyncResult(session.user.id, connection.id, sync)
      await updateSyncCursor(session.user.id, connection.id, sync.nextCursor)

      transactionsAdded = applied.added
      // Plaid returns an empty first page while it assembles history
      historyPending = applied.added === 0
    } catch (error) {
      // Linking succeeded; a failed first sync is recoverable and must not
      // present as a failed link
      console.error('Initial sync failed, connection still linked:', error)
      historyPending = true
    }

    return NextResponse.json({
      connection: {
        id: connection.id,
        institutionName: connection.institution_name,
        entity: connection.entity,
        status: connection.status,
      },
      accountsLinked: accounts.length,
      transactionsAdded,
      historyPending,
    })
  } catch (error) {
    console.error('Error exchanging Plaid public token:', error)
    return NextResponse.json({ error: 'Failed to link account' }, { status: 500 })
  }
}
