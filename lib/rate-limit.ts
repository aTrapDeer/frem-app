import { db, generateUUID, getCurrentTimestamp } from '@/lib/turso'

/**
 * Fixed-window rate limiting, backed by Turso.
 *
 * Deliberately not in-memory: on Vercel each request may hit a different
 * instance, so a per-process counter would let a caller multiply their quota by
 * however many instances happen to be warm. The database is the only shared
 * state available.
 *
 * Fixed windows allow a burst across a boundary (up to 2x the limit in the worst
 * case). That is acceptable here — the goal is bounding runaway cost, not
 * precise fairness.
 */

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  /** When the current window ends. */
  resetAt: Date
}

export type RateLimitRule = {
  /** Distinguishes independent budgets, e.g. 'ai-chat' vs 'ai-report'. */
  bucket: string
  limit: number
  windowSeconds: number
}

/** Per-user budgets for the routes that cost real money. */
export const AI_CHAT_LIMIT: RateLimitRule = { bucket: 'ai-chat', limit: 40, windowSeconds: 60 * 60 }
export const AI_REPORT_LIMIT: RateLimitRule = { bucket: 'ai-report', limit: 10, windowSeconds: 60 * 60 }
export const AI_CLASSIFY_LIMIT: RateLimitRule = { bucket: 'ai-classify', limit: 10, windowSeconds: 3600 }
export const BANK_SYNC_LIMIT: RateLimitRule = { bucket: 'bank-sync', limit: 20, windowSeconds: 60 * 60 }

function windowStartFor(rule: RateLimitRule, now: Date): Date {
  const windowMs = rule.windowSeconds * 1000
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs)
}

/**
 * Consumes one unit from the caller's budget.
 *
 * Fails open: if the rate-limit table is missing or the query errors, the
 * request proceeds. A limiter that breaks the whole app when it has a problem is
 * worse than one that occasionally lets a request through.
 */
export async function checkRateLimit(
  userId: string,
  rule: RateLimitRule,
  now: Date = new Date()
): Promise<RateLimitResult> {
  const windowStart = windowStartFor(rule, now)
  const resetAt = new Date(windowStart.getTime() + rule.windowSeconds * 1000)

  try {
    // Atomic increment: the unique constraint makes concurrent requests collapse
    // onto one row rather than each inserting their own
    await db.execute({
      sql: `INSERT INTO rate_limits (id, user_id, bucket, window_start, count, updated_at)
            VALUES (?, ?, ?, ?, 1, ?)
            ON CONFLICT (user_id, bucket, window_start) DO UPDATE SET
              count = count + 1,
              updated_at = excluded.updated_at`,
      args: [generateUUID(), userId, rule.bucket, windowStart.toISOString(), getCurrentTimestamp()],
    })

    const result = await db.execute({
      sql: 'SELECT count FROM rate_limits WHERE user_id = ? AND bucket = ? AND window_start = ?',
      args: [userId, rule.bucket, windowStart.toISOString()],
    })

    const count = Number((result.rows[0] as Record<string, unknown> | undefined)?.count ?? 1)

    return {
      allowed: count <= rule.limit,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - count),
      resetAt,
    }
  } catch (error) {
    console.error('Rate limit check failed, allowing request:', error)
    return { allowed: true, limit: rule.limit, remaining: rule.limit, resetAt }
  }
}

/** Standard headers so clients can back off before being rejected. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000)),
  }
}

/** Removes windows that have fully elapsed. Safe to run at any time. */
export async function pruneRateLimits(olderThan: Date = new Date(Date.now() - 86_400_000)): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM rate_limits WHERE window_start < ?',
    args: [olderThan.toISOString()],
  })
}
