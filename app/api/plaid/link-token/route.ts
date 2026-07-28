import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createLinkToken, isPlaidConfigured } from '@/lib/plaid'

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isPlaidConfigured()) {
      return NextResponse.json(
        { error: 'Plaid is not configured', details: 'Set PLAID_CLIENT_ID and PLAID_SECRET' },
        { status: 500 }
      )
    }

    const linkToken = await createLinkToken(session.user.id)
    return NextResponse.json({ linkToken })
  } catch (error) {
    console.error('Error creating Plaid link token:', error)
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 })
  }
}
