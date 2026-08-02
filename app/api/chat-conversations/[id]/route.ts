import { auth } from '@/auth'
import {
  deleteConversation,
  getConversation,
  renameConversation,
} from '@/lib/chat-history'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const result = await getConversation(session.user.id, id)
    if (!result) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    return Response.json(result)
  } catch (error) {
    console.error('Error loading chat conversation:', error)
    return Response.json(
      { error: 'Failed to load chat conversation' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: unknown = await request.json().catch(() => null)
    const titleValue =
      body && typeof body === 'object'
        ? (body as Record<string, unknown>).title
        : undefined

    if (typeof titleValue !== 'string') {
      return Response.json({ error: 'Title must be a string' }, { status: 400 })
    }

    const title = titleValue.trim()
    if (!title || title.length > 80) {
      return Response.json(
        { error: 'Title must be between 1 and 80 characters' },
        { status: 400 }
      )
    }

    const { id } = await params
    const renamed = await renameConversation(session.user.id, id, title)
    if (!renamed) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error renaming chat conversation:', error)
    return Response.json(
      { error: 'Failed to rename chat conversation' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await deleteConversation(session.user.id, id)
    return Response.json({ success: true })
  } catch (error) {
    console.error('Error deleting chat conversation:', error)
    return Response.json(
      { error: 'Failed to delete chat conversation' },
      { status: 500 }
    )
  }
}
