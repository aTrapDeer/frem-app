import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getUserSettings, updateUserSettings } from '@/lib/database'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await getUserSettings(session.user.id)
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate bank_reserve_type if provided
    if (body.bank_reserve_type && !['amount', 'percentage'].includes(body.bank_reserve_type)) {
      return NextResponse.json({ error: 'bank_reserve_type must be "amount" or "percentage"' }, { status: 400 })
    }

    // Validate bank_reserve_amount if provided
    if (body.bank_reserve_amount !== undefined && (typeof body.bank_reserve_amount !== 'number' || body.bank_reserve_amount < 0)) {
      return NextResponse.json({ error: 'bank_reserve_amount must be a non-negative number' }, { status: 400 })
    }

    const settings = await updateUserSettings(session.user.id, body)
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}

