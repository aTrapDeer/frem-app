import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { buildGoalBrief } from '@/lib/goal-insights'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const result = await buildGoalBrief(session.user.id, id)

    if (!result) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Error building goal brief:', error)
    return NextResponse.json(
      { error: 'Failed to build goal brief' },
      { status: 500 }
    )
  }
}
