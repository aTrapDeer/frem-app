import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getGoalMomentum } from '@/lib/goal-insights'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { momentum: await getGoalMomentum(session.user.id) },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Error building goal insights:', error)
    return NextResponse.json(
      { error: 'Failed to load goal insights' },
      { status: 500 }
    )
  }
}
