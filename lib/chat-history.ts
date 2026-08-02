import { db, generateUUID } from '@/lib/turso'

export type ChatMessageRole = 'user' | 'assistant'

export interface ChatConversationSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

export interface ChatConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  role: ChatMessageRole
  content: string
  createdAt: string
}

export interface ConversationWithMessages {
  conversation: ChatConversation
  messages: ChatMessage[]
}

interface MessageToAppend {
  role: ChatMessageRole
  content: string
}

function conversationFromRow(row: Record<string, unknown>): ChatConversation {
  return {
    id: String(row.id),
    title: String(row.title),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function messageFromRow(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id),
    role: String(row.role) as ChatMessageRole,
    content: String(row.content),
    createdAt: String(row.created_at),
  }
}

export async function listConversations(
  userId: string
): Promise<ChatConversationSummary[]> {
  const result = await db.execute({
    sql: `SELECT
            c.id,
            c.title,
            c.created_at,
            c.updated_at,
            COUNT(m.id) AS message_count
          FROM chat_conversations c
          LEFT JOIN chat_messages m
            ON m.conversation_id = c.id
            AND m.user_id = ?
          WHERE c.user_id = ?
          GROUP BY c.id, c.title, c.created_at, c.updated_at
          ORDER BY c.updated_at DESC
          LIMIT 100`,
    args: [userId, userId],
  })

  return result.rows.map(row => {
    const record = row as Record<string, unknown>
    return {
      ...conversationFromRow(record),
      messageCount: Number(record.message_count),
    }
  })
}

export async function getConversation(
  userId: string,
  id: string
): Promise<ConversationWithMessages | null> {
  const conversationResult = await db.execute({
    sql: `SELECT id, title, created_at, updated_at
          FROM chat_conversations
          WHERE id = ? AND user_id = ?
          LIMIT 1`,
    args: [id, userId],
  })

  const conversationRow = conversationResult.rows[0]
  if (!conversationRow) return null

  const messagesResult = await db.execute({
    sql: `SELECT id, role, content, created_at
          FROM chat_messages
          WHERE conversation_id = ? AND user_id = ?
          ORDER BY created_at ASC, rowid ASC`,
    args: [id, userId],
  })

  return {
    conversation: conversationFromRow(conversationRow as Record<string, unknown>),
    messages: messagesResult.rows.map(row =>
      messageFromRow(row as Record<string, unknown>)
    ),
  }
}

export async function createConversation(
  userId: string,
  title: string
): Promise<ChatConversation> {
  const id = generateUUID()

  await db.execute({
    sql: `INSERT INTO chat_conversations (id, user_id, title)
          VALUES (?, ?, ?)`,
    args: [id, userId, title],
  })

  const result = await db.execute({
    sql: `SELECT id, title, created_at, updated_at
          FROM chat_conversations
          WHERE id = ? AND user_id = ?
          LIMIT 1`,
    args: [id, userId],
  })

  const row = result.rows[0]
  if (!row) throw new Error('Created conversation could not be loaded')
  return conversationFromRow(row as Record<string, unknown>)
}

export async function renameConversation(
  userId: string,
  id: string,
  title: string
): Promise<boolean> {
  const result = await db.execute({
    sql: `UPDATE chat_conversations
          SET title = ?, updated_at = datetime('now')
          WHERE id = ? AND user_id = ?`,
    args: [title, id, userId],
  })

  return result.rowsAffected > 0
}

export async function deleteConversation(
  userId: string,
  id: string
): Promise<boolean> {
  const results = await db.batch(
    [
      {
        sql: `DELETE FROM chat_messages
              WHERE conversation_id = ? AND user_id = ?`,
        args: [id, userId],
      },
      {
        sql: `DELETE FROM chat_conversations
              WHERE id = ? AND user_id = ?`,
        args: [id, userId],
      },
    ],
    'write'
  )

  return results[1].rowsAffected > 0
}

export async function appendMessages(
  userId: string,
  conversationId: string,
  messages: MessageToAppend[]
): Promise<boolean> {
  if (messages.length === 0) return false

  const statements = messages.map(message => ({
    sql: `INSERT INTO chat_messages (id, conversation_id, user_id, role, content)
          SELECT ?, id, user_id, ?, ?
          FROM chat_conversations
          WHERE id = ? AND user_id = ?`,
    args: [
      generateUUID(),
      message.role,
      message.content,
      conversationId,
      userId,
    ],
  }))

  const results = await db.batch(
    [
      ...statements,
      {
        sql: `UPDATE chat_conversations
              SET updated_at = datetime('now')
              WHERE id = ? AND user_id = ?`,
        args: [conversationId, userId],
      },
    ],
    'write'
  )

  return results[results.length - 1].rowsAffected > 0
}

export function titleFromMessage(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return 'New chat'
  if (normalized.length <= 48) return normalized

  const prefix = normalized.slice(0, 48)
  if (normalized[48] === ' ') return prefix.trimEnd()

  const lastSpace = prefix.lastIndexOf(' ')
  return lastSpace > 0 ? prefix.slice(0, lastSpace) : prefix
}
