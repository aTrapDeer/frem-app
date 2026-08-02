import { auth } from '@/auth'
import { listConversations } from '@/lib/chat-history'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversations = await listConversations(session.user.id)
    return Response.json({ conversations })
  } catch (error) {
    console.error('Error listing chat conversations:', error)
    return Response.json(
      { error: 'Failed to list chat conversations' },
      { status: 500 }
    )
  }
}
