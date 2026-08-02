import { z } from 'zod'

/**
 * Request validation for API routes.
 *
 * Two jobs: reject malformed input before it reaches the database, and bound the
 * size of anything that gets forwarded to a paid API. Routes previously accepted
 * whatever JSON arrived — including unbounded strings that were passed straight
 * to OpenAI.
 */

// =============================================
// Shared primitives
// =============================================

/** App-generated identifiers are UUIDs; anything else is not ours. */
export const uuidSchema = z.string().uuid('Expected a valid id')

/**
 * Money. Rejects NaN and Infinity, which JSON.parse happily produces from some
 * inputs and SQLite will store without complaint.
 */
export const amountSchema = z
  .number()
  .finite('Amount must be a real number')
  .min(-1_000_000_000)
  .max(1_000_000_000)

export const positiveAmountSchema = amountSchema.positive('Amount must be greater than zero')

/** Calendar date, no timezone. Matches how dates are stored. */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date as YYYY-MM-DD')

export const entitySchema = z.enum(['personal', 'business'])

// =============================================
// AI routes
// =============================================

/**
 * Caps on anything forwarded to OpenAI.
 *
 * These are the difference between a bounded per-request cost and a user (or a
 * bug) looping unbounded input through a paid model.
 */
export const MAX_CHAT_MESSAGE_LENGTH = 4000
export const MAX_HISTORY_MESSAGES = 20
export const MAX_HISTORY_MESSAGE_LENGTH = 4000

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  // History is context, not a contract: an over-long stored reply gets
  // truncated for the model rather than failing the whole request
  content: z
    .string()
    .min(1)
    .transform(value => (value.length > MAX_HISTORY_MESSAGE_LENGTH ? value.slice(0, MAX_HISTORY_MESSAGE_LENGTH) : value)),
})

export const chatRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(MAX_CHAT_MESSAGE_LENGTH, `Message must be under ${MAX_CHAT_MESSAGE_LENGTH} characters`),
  // Long conversations keep their newest turns; the oldest fall off instead
  // of the request being rejected once a chat outgrows the window
  conversationHistory: z
    .array(chatMessageSchema)
    .optional()
    .default([])
    .transform(history => history.slice(-MAX_HISTORY_MESSAGES)),
})

export type ChatRequest = z.infer<typeof chatRequestSchema>

// =============================================
// Domain routes
// =============================================

export const transactionCreateSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: positiveAmountSchema,
  description: z.string().max(500).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  transaction_date: dateSchema.optional(),
})

export const transactionUpdateSchema = z.object({
  id: uuidSchema,
  type: z.enum(['income', 'expense']).optional(),
  amount: positiveAmountSchema.optional(),
  description: z.string().max(500).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
})

export const goalCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  target_amount: positiveAmountSchema,
  current_amount: amountSchema.min(0).optional(),
  category: z.string().max(100).optional().nullable(),
  deadline: dateSchema,
  start_date: dateSchema.optional().nullable(),
  interest_rate: z.number().finite().min(0).max(100).optional().nullable(),
  priority: z.number().int().min(1).max(5).optional(),
  urgency_score: z.number().int().min(1).max(10).optional(),
})

export const goalUpdateSchema = goalCreateSchema
  .partial()
  .extend({ id: uuidSchema })

export const connectionEntitySchema = z.object({
  publicToken: z.string().min(1, 'publicToken is required'),
  entity: entitySchema.optional().default('personal'),
  entityLabel: z.string().max(120).optional().nullable(),
})

// =============================================
// Route helper
// =============================================

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; details: string[] }

/**
 * Parses and validates a JSON request body.
 *
 * Returns a result rather than throwing so routes can respond with 400 and a
 * useful message instead of a 500 with a stack trace.
 */
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<ValidationResult<T>> {
  let raw: unknown

  try {
    raw = await request.json()
  } catch {
    return { ok: false, error: 'Invalid JSON body', details: [] }
  }

  const parsed = schema.safeParse(raw)

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Validation failed',
      details: parsed.error.issues.map(issue => {
        const path = issue.path.join('.')
        return path ? `${path}: ${issue.message}` : issue.message
      }),
    }
  }

  return { ok: true, data: parsed.data }
}
