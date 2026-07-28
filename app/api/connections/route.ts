import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { deleteConnection, getBankAccounts, getConnection, getConnectionAccessToken, getConnections } from '@/lib/bank-sync'
import { removeItem } from '@/lib/plaid'

/**
 * Linked institutions and the accounts under them.
 * Access tokens are never included in the response.
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [connections, accounts] = await Promise.all([
      getConnections(session.user.id),
      getBankAccounts(session.user.id),
    ])

    return NextResponse.json({
      connections: connections.map(connection => ({
        id: connection.id,
        provider: connection.provider,
        institutionName: connection.institution_name,
        entity: connection.entity,
        entityLabel: connection.entity_label,
        status: connection.status,
        statusDetail: connection.status_detail,
        lastSyncedAt: connection.last_synced_at,
        accounts: accounts
          .filter(account => account.connection_id === connection.id)
          .map(account => ({
            id: account.id,
            name: account.name,
            mask: account.mask,
            type: account.account_type,
            subtype: account.account_subtype,
            currentBalance: account.current_balance,
            availableBalance: account.available_balance,
            entity: account.entity,
            entityLabel: account.entity_label,
            isExcluded: account.is_excluded,
          })),
      })),
    })
  } catch (error) {
    console.error('Error fetching connections:', error)
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
  }
}

/**
 * Unlinks an institution. Revokes the token at Plaid first so we stop being
 * billed for an Item nobody is using, then removes the local rows.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const connectionId = request.nextUrl.searchParams.get('id')

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 })
    }

    const connection = await getConnection(userId, connectionId)

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    if (connection.provider === 'plaid') {
      try {
        const accessToken = await getConnectionAccessToken(userId, connectionId)
        if (accessToken) await removeItem(accessToken)
      } catch (error) {
        // A failed revoke must not strand the row locally — log and continue
        console.error('Failed to revoke Plaid item, removing locally anyway:', error)
      }
    }

    await deleteConnection(userId, connectionId)

    return NextResponse.json({ message: 'Connection removed' })
  } catch (error) {
    console.error('Error deleting connection:', error)
    return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 })
  }
}
