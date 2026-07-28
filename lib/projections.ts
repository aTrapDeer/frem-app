/**
 * Canonical financial math.
 *
 * Every "how much per month do I need" and "when will this finish" answer in the
 * app must come from here. Before this module existed the same question was
 * computed three different ways — a simple divide in `calculateDailyTarget`, a
 * growth-aware annuity in goal breakdowns, and another simple divide inside the
 * projection simulation — so the dashboard, goals page and summary could each
 * show a different number for the same goal.
 *
 * These are pure functions with no database or environment access, which is what
 * makes them testable. Keep it that way.
 */

/** The mean length of a Gregorian month, used to convert monthly <-> daily. */
export const AVERAGE_DAYS_PER_MONTH = 30.44

/**
 * Converts an annual percentage rate into the equivalent compounding monthly
 * rate. Uses the 12th root rather than dividing by 12 so that twelve months of
 * growth reproduces the annual rate exactly.
 */
export function getMonthlyGrowthRate(annualRatePercent?: number | null): number {
  if (!annualRatePercent || annualRatePercent <= 0) return 0
  return Math.pow(1 + annualRatePercent / 100, 1 / 12) - 1
}

/**
 * The level monthly contribution needed to reach `targetAmount` in
 * `monthsRemaining`, accounting for growth on the existing balance.
 *
 * Without growth this is a straight division. With growth it is the future-value
 * annuity solved for the payment, which matters for investment goals: ignoring
 * compounding overstates what the user has to contribute.
 */
export function calculateMonthlyRequired(
  targetAmount: number,
  currentAmount: number,
  monthsRemaining: number,
  annualRatePercent?: number | null
): number {
  if (monthsRemaining <= 0) return 0
  if (currentAmount >= targetAmount) return 0

  const monthlyRate = getMonthlyGrowthRate(annualRatePercent)
  const remaining = targetAmount - currentAmount

  if (monthlyRate === 0) {
    return remaining / monthsRemaining
  }

  const growthFactor = Math.pow(1 + monthlyRate, monthsRemaining)
  const required = ((targetAmount - currentAmount * growthFactor) * monthlyRate) / (growthFactor - 1)

  // Growth alone can already clear the target, in which case nothing is required
  return Math.max(0, required)
}

/**
 * How many months of `monthlyAllocation` it takes to get from `balance` to
 * `target`. Returns Infinity when the goal can never be reached.
 */
export function estimateMonthsToComplete(
  balance: number,
  target: number,
  monthlyAllocation: number,
  annualRatePercent?: number | null
): number {
  if (balance >= target) return 0

  const monthlyRate = getMonthlyGrowthRate(annualRatePercent)

  if (monthlyRate === 0) {
    if (monthlyAllocation <= 0) return Infinity
    return (target - balance) / monthlyAllocation
  }

  const paymentFactor = monthlyAllocation / monthlyRate
  const numerator = target + paymentFactor
  const denominator = balance + paymentFactor

  if (denominator <= 0 || numerator <= 0) return Infinity

  const months = Math.log(numerator / denominator) / Math.log(1 + monthlyRate)
  return months > 0 && Number.isFinite(months) ? months : Infinity
}

// =============================================
// Month arithmetic
// =============================================

/**
 * Parses a date the way the user means it.
 *
 * `new Date('2026-12-01')` is midnight **UTC**, which reads as November 30 in
 * every US timezone — so a December deadline silently became a November one and
 * every goal looked a month more urgent than it was. Date-only strings are
 * calendar dates with no timezone, so they are parsed as local midnight here.
 */
export function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
  }

  // Full timestamps carry their own offset and are already unambiguous
  return new Date(value)
}

/** First day of the month containing `date`, at local midnight. */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/** First day of the month `months` after `date`. Handles year rollover. */
export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

/**
 * Whole calendar months between two dates. Counts month boundaries crossed, so
 * Jan 31 -> Feb 1 is 1 month. Negative when `end` precedes `start`.
 *
 * Deliberately not a day-count divided by 30.44: that drifts, and made deadlines
 * land a month early or late depending on which side of the month you asked.
 */
export function diffMonths(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
}

/**
 * Months from today until a deadline, floored at 1.
 *
 * A goal due this month still needs its full remaining amount now — returning 0
 * would divide by zero, and returning a fraction would understate the payment.
 */
export function monthsUntil(deadline: Date | string, from: Date = new Date()): number {
  return Math.max(1, diffMonths(getMonthStart(from), getMonthStart(parseLocalDate(deadline))))
}

// =============================================
// Conversions
// =============================================

export function monthlyToDaily(monthlyAmount: number): number {
  return monthlyAmount / AVERAGE_DAYS_PER_MONTH
}

export function dailyToMonthly(dailyAmount: number): number {
  return dailyAmount * AVERAGE_DAYS_PER_MONTH
}

/** Rounds to cents. Money should never be reported with float noise. */
export function toCents(amount: number): number {
  return Math.round(amount * 100) / 100
}

// =============================================
// Goal obligations
// =============================================

export type GoalLike = {
  target_amount: number
  current_amount: number
  deadline: string
  start_date?: string | null
  interest_rate?: number | null
  category?: string
}

/**
 * Growth only applies to goals held in an interest-bearing vehicle. A cash
 * savings goal earns nothing, so applying its rate would flatter the projection.
 */
export function effectiveRate(goal: GoalLike): number | null {
  return goal.category === 'investment' ? goal.interest_rate ?? null : null
}

/**
 * The monthly contribution a single goal demands to hit its deadline.
 * This is the one definition of "monthly required" in the app.
 */
export function monthlyRequirementForGoal(goal: GoalLike, from: Date = new Date()): number {
  const start = goal.start_date ? parseLocalDate(goal.start_date) : from
  const effectiveStart = start > from ? start : from

  return calculateMonthlyRequired(
    goal.target_amount,
    goal.current_amount,
    monthsUntil(goal.deadline, effectiveStart),
    effectiveRate(goal)
  )
}

/** Total monthly obligation across a set of goals. */
export function totalMonthlyGoalObligation(goals: GoalLike[], from: Date = new Date()): number {
  return goals.reduce((sum, goal) => sum + Math.max(0, monthlyRequirementForGoal(goal, from)), 0)
}
