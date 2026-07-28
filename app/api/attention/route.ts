import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAttentionItems } from '@/lib/attention'

/**
 * Data that has drifted and needs a human decision — lapsed contracts still
 * counting as income, balances old enough to be doubtful, goals whose progress
 * has stopped moving while their deadline keeps approaching.
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const items = await getAttentionItems(session.user.id)

    return NextResponse.json({
      items,
      counts: {
        total: items.length,
        warnings: items.filter(item => item.severity === 'warning').length,
      },
    })
  } catch (error) {
    console.error('Error building attention items:', error)
    return NextResponse.json({ error: 'Failed to load attention items' }, { status: 500 })
  }
}
