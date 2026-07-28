import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { exchangePublicToken, fetchAccounts, isPlaidConfigured } from '@/lib/plaid'
import { isEncryptionConfigured } from '@/lib/encryption'
import { createConnection, upsertAccounts, type Entity } from '@/lib/bank-sync'

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

    return NextResponse.json({
      connection: {
        id: connection.id,
        institutionName: connection.institution_name,
        entity: connection.entity,
        status: connection.status,
      },
      accountsLinked: accounts.length,
    })
  } catch (error) {
    console.error('Error exchanging Plaid public token:', error)
    return NextResponse.json({ error: 'Failed to link account' }, { status: 500 })
  }
}
