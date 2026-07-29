import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFinancialOverview } from '@/lib/overview'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(await getFinancialOverview(session.user.id), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Error building financial overview:', error)
    return NextResponse.json(
      { error: 'Failed to load financial overview' },
      { status: 500 }
    )
  }
}
