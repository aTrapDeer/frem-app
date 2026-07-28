import { diffMonths, getMonthStart, parseLocalDate } from './projections'

/**
 * Time-awareness helpers.
 *
 * The app used to treat every stored number as currently true. Nothing expired,
 * nothing aged, and nothing reported how old it was — so a contract that ended
 * last year still counted as income, and a balance typed in three months ago was
 * presented with the same confidence as one entered today.
 *
 * Pure functions, no database access, so they can be tested directly.
 */

export const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24

/** Whole days between `since` and `asOf`. Negative for future dates. */
export function daysSince(since: string | Date, asOf: Date = new Date()): number {
  const start = parseLocalDate(since)
  return Math.floor((asOf.getTime() - start.getTime()) / MILLISECONDS_PER_DAY)
}

/** Whole calendar months since `since`, floored at 0. */
export function monthsSince(since: string | Date, asOf: Date = new Date()): number {
  return Math.max(0, diffMonths(getMonthStart(parseLocalDate(since)), getMonthStart(asOf)))
}

export type Freshness = 'fresh' | 'aging' | 'stale'

/**
 * How much to trust a hand-entered figure based on its age.
 *
 * Thresholds are deliberately generous: the point is to flag numbers the user
 * has visibly stopped maintaining, not to nag after a quiet week.
 */
export function freshnessOf(updatedAt: string | Date | null, asOf: Date = new Date()): Freshness {
  if (!updatedAt) return 'stale'

  const days = daysSince(updatedAt, asOf)
  if (days <= 14) return 'fresh'
  if (days <= 45) return 'aging'
  return 'stale'
}

/** Human label for a last-updated timestamp. */
export function describeAge(updatedAt: string | Date | null, asOf: Date = new Date()): string {
  if (!updatedAt) return 'never updated'

  const days = daysSince(updatedAt, asOf)
  if (days <= 0) return 'updated today'
  if (days === 1) return 'updated yesterday'
  if (days < 30) return `updated ${days} days ago`

  const months = Math.floor(days / 30)
  return months === 1 ? 'updated a month ago' : `updated ${months} months ago`
}

// =============================================
// Contract-bounded income
// =============================================

export type IncomeSourceLike = {
  status: string
  start_date?: string | null
  end_date?: string | null
  final_payment_date?: string | null
}

/**
 * The last date a source can still pay out.
 *
 * A contract's final payment often lands after the work ends, so the later of
 * `end_date` and `final_payment_date` is what actually terminates the income.
 */
export function incomeEndsOn(source: IncomeSourceLike): Date | null {
  const candidates = [source.end_date, source.final_payment_date]
    .filter((value): value is string => Boolean(value))
    .map(parseLocalDate)

  if (candidates.length === 0) return null
  return candidates.reduce((latest, date) => (date > latest ? date : latest))
}

/**
 * Whether a source should still count toward income today.
 *
 * Previously this was a manual `status` flag only, so an ended contract kept
 * inflating projected income until someone remembered to change it by hand.
 */
export function isIncomeSourceActive(source: IncomeSourceLike, asOf: Date = new Date()): boolean {
  if (source.status !== 'active') return false

  if (source.start_date) {
    const start = parseLocalDate(source.start_date)
    if (getMonthStart(start) > getMonthStart(asOf)) return false
  }

  const endsOn = incomeEndsOn(source)
  if (endsOn && getMonthStart(endsOn) < getMonthStart(asOf)) return false

  return true
}

/**
 * Sources whose contract has lapsed but whose status still says active — these
 * are what the app should offer to close out rather than silently keep counting.
 */
export function findLapsedIncomeSources<T extends IncomeSourceLike>(
  sources: T[],
  asOf: Date = new Date()
): T[] {
  return sources.filter(source => {
    if (source.status !== 'active') return false
    const endsOn = incomeEndsOn(source)
    return endsOn !== null && getMonthStart(endsOn) < getMonthStart(asOf)
  })
}
