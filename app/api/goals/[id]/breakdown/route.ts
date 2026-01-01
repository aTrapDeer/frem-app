import { auth } from '@/auth'
import { getGoalBreakdown } from '@/lib/database'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    
    const breakdown = await getGoalBreakdown(id, session.user.id)
    
    return Response.json(breakdown)
  } catch (error) {
    console.error('Error fetching goal breakdown:', error)
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch goal breakdown' 
    }, { status: 500 })
  }
}

