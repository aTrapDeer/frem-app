import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { executeChatAction, parseChatAction } from '@/lib/chat-actions'
import { appendMessages } from '@/lib/chat-history'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Executes a coach-proposed action AFTER the user pressed Confirm. */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as {
      type?: string
      params?: unknown
      conversationId?: string
    } | null
    if (!body?.type || body.params === undefined) {
      return NextResponse.json({ error: 'type and params are required' }, { status: 400 })
    }

    // Re-validate through the same schema gate the proposal came from
    const action = parseChatAction(body.type, JSON.stringify(body.params))
    if (!action) {
      return NextResponse.json({ error: 'Unknown or invalid action' }, { status: 400 })
    }

    const summary = await executeChatAction(session.user.id, action)

    // The outcome belongs to the conversation record
    if (typeof body.conversationId === 'string' && body.conversationId) {
      await appendMessages(session.user.id, body.conversationId, [
        { role: 'assistant', content: `✓ ${summary}` },
      ]).catch(() => {})
    }

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('Error executing chat action:', error)
    const message = error instanceof Error ? error.message : 'Action failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
