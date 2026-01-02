import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { calculateGoalProjections } from '@/lib/database'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projections = await calculateGoalProjections(session.user.id)
    
    return NextResponse.json(projections)
  } catch (error) {
    console.error('Error fetching projections:', error)
    return NextResponse.json({ error: 'Failed to calculate projections' }, { status: 500 })
  }
}



