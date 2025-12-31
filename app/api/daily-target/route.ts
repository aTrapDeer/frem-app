import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { calculateDailyTarget } from '@/lib/database'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const targetData = await calculateDailyTarget(session.user.id)
    return NextResponse.json(targetData)
  } catch (error) {
    console.error('Error calculating daily target:', error)
    return NextResponse.json({ error: 'Failed to calculate daily target' }, { status: 500 })
  }
}

