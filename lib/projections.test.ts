import { describe, it, expect } from 'vitest'
import {
  AVERAGE_DAYS_PER_MONTH,
  addMonths,
  calculateMonthlyRequired,
  dailyToMonthly,
  diffMonths,
  effectiveRate,
  estimateMonthsToComplete,
  getMonthStart,
  getMonthlyGrowthRate,
  monthlyRequirementForGoal,
  monthlyToDaily,
  parseLocalDate,
  monthsUntil,
  toCents,
  totalMonthlyGoalObligation,
} from './projections'

describe('getMonthlyGrowthRate', () => {
  it('returns 0 for missing, zero, or negative rates', () => {
    expect(getMonthlyGrowthRate(null)).toBe(0)
    expect(getMonthlyGrowthRate(undefined)).toBe(0)
    expect(getMonthlyGrowthRate(0)).toBe(0)
    expect(getMonthlyGrowthRate(-5)).toBe(0)
  })

  it('compounds to exactly the annual rate over 12 months', () => {
    const monthly = getMonthlyGrowthRate(7)
    expect(Math.pow(1 + monthly, 12) - 1).toBeCloseTo(0.07, 10)
  })

  it('is smaller than a naive annual/12 division', () => {
    // The naive version overstates growth; this guards against a regression to it
    expect(getMonthlyGrowthRate(12)).toBeLessThan(0.12 / 12)
  })
})

describe('calculateMonthlyRequired', () => {
  it('divides evenly when there is no growth', () => {
    expect(calculateMonthlyRequired(12000, 0, 12, null)).toBeCloseTo(1000, 10)
  })

  it('accounts for the existing balance', () => {
    expect(calculateMonthlyRequired(12000, 6000, 12, null)).toBeCloseTo(500, 10)
  })

  it('returns 0 when already funded or out of time', () => {
    expect(calculateMonthlyRequired(1000, 1000, 12, null)).toBe(0)
    expect(calculateMonthlyRequired(1000, 2000, 12, null)).toBe(0)
    expect(calculateMonthlyRequired(1000, 0, 0, null)).toBe(0)
    expect(calculateMonthlyRequired(1000, 0, -3, null)).toBe(0)
  })

  it('requires less per month when the balance grows', () => {
    const withoutGrowth = calculateMonthlyRequired(100000, 20000, 60, null)
    const withGrowth = calculateMonthlyRequired(100000, 20000, 60, 7)
    expect(withGrowth).toBeLessThan(withoutGrowth)
  })

  it('requires nothing when growth alone clears the target', () => {
    // 50k at 10% for 10 years passes 100k without any contribution
    expect(calculateMonthlyRequired(100000, 50000, 120, 10)).toBe(0)
  })

  it('produces a payment that actually reaches the target', () => {
    const target = 50000
    const balance = 10000
    const months = 36
    const annualRate = 6

    const payment = calculateMonthlyRequired(target, balance, months, annualRate)
    const monthlyRate = getMonthlyGrowthRate(annualRate)

    // Simulate the schedule and confirm it lands on the target
    let running = balance
    for (let i = 0; i < months; i += 1) {
      running = running * (1 + monthlyRate) + payment
    }

    expect(running).toBeCloseTo(target, 4)
  })
})

describe('estimateMonthsToComplete', () => {
  it('returns 0 when already at target', () => {
    expect(estimateMonthsToComplete(5000, 5000, 100, null)).toBe(0)
    expect(estimateMonthsToComplete(6000, 5000, 100, null)).toBe(0)
  })

  it('divides evenly with no growth', () => {
    expect(estimateMonthsToComplete(0, 10000, 1000, null)).toBeCloseTo(10, 10)
  })

  it('returns Infinity when nothing is being contributed and nothing grows', () => {
    expect(estimateMonthsToComplete(0, 10000, 0, null)).toBe(Infinity)
  })

  it('finishes sooner with growth than without', () => {
    const withoutGrowth = estimateMonthsToComplete(10000, 50000, 1000, null)
    const withGrowth = estimateMonthsToComplete(10000, 50000, 1000, 8)
    expect(withGrowth).toBeLessThan(withoutGrowth)
  })

  it('reports a reachable investment goal as reachable', () => {
    // Regression: the previous implementation subtracted the payment factor
    // instead of adding it, so a well-funded investment goal produced a negative
    // numerator and reported Infinity — surfacing in the UI as a goal that could
    // never complete, and flipping healthy goals to "at risk".
    const months = estimateMonthsToComplete(0, 10000, 1000, 7)
    expect(Number.isFinite(months)).toBe(true)
    expect(months).toBeGreaterThan(0)
    expect(months).toBeLessThan(10) // growth makes it slightly faster than 10
  })

  it('agrees with a simulated schedule', () => {
    const balance = 5000
    const target = 25000
    const payment = 500
    const annualRate = 5

    const months = estimateMonthsToComplete(balance, target, payment, annualRate)
    const monthlyRate = getMonthlyGrowthRate(annualRate)

    let running = balance
    for (let i = 0; i < Math.floor(months); i += 1) {
      running = running * (1 + monthlyRate) + payment
    }

    // Just short of the target before the final partial month
    expect(running).toBeLessThanOrEqual(target)
    expect(running * (1 + monthlyRate) + payment).toBeGreaterThanOrEqual(target)
  })
})

describe('month arithmetic', () => {
  it('getMonthStart drops the day and time', () => {
    const start = getMonthStart(new Date(2026, 6, 27, 14, 30))
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(6)
    expect(start.getDate()).toBe(1)
    expect(start.getHours()).toBe(0)
  })

  it('addMonths rolls over the year', () => {
    const result = addMonths(new Date(2026, 10, 1), 3) // Nov 2026 + 3
    expect(result.getFullYear()).toBe(2027)
    expect(result.getMonth()).toBe(1) // February
  })

  it('addMonths goes backwards', () => {
    const result = addMonths(new Date(2026, 1, 1), -3)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(10)
  })

  it('diffMonths counts calendar boundaries, not 30-day blocks', () => {
    // Jan 31 -> Feb 1 is one calendar month even though it is one day
    expect(diffMonths(new Date(2026, 0, 31), new Date(2026, 1, 1))).toBe(1)
    expect(diffMonths(new Date(2026, 0, 1), new Date(2027, 0, 1))).toBe(12)
    expect(diffMonths(new Date(2026, 5, 1), new Date(2026, 2, 1))).toBe(-3)
  })

  it('monthsUntil floors at 1 so a due-now goal never divides by zero', () => {
    const today = new Date(2026, 6, 15)
    expect(monthsUntil(new Date(2026, 6, 20), today)).toBe(1)
    expect(monthsUntil(new Date(2026, 5, 1), today)).toBe(1) // already past
    expect(monthsUntil(new Date(2026, 11, 1), today)).toBe(5)
  })

  it('monthsUntil accepts ISO strings', () => {
    expect(monthsUntil('2026-12-01', new Date(2026, 6, 15))).toBe(5)
  })

  it('parses date-only strings as local, not UTC', () => {
    // Regression: `new Date('2026-12-01')` is midnight UTC, which is Nov 30 in
    // every US timezone. Deadlines read a month early and goals looked more
    // urgent than they were.
    const parsed = parseLocalDate('2026-12-01')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(11) // December, not November
    expect(parsed.getDate()).toBe(1)
  })

  it('leaves full timestamps alone', () => {
    const parsed = parseLocalDate('2026-12-01T12:00:00Z')
    expect(parsed.getTime()).toBe(new Date('2026-12-01T12:00:00Z').getTime())
  })
})

describe('conversions', () => {
  it('round-trips monthly to daily', () => {
    expect(dailyToMonthly(monthlyToDaily(3044))).toBeCloseTo(3044, 10)
  })

  it('uses the average month length', () => {
    expect(monthlyToDaily(AVERAGE_DAYS_PER_MONTH)).toBeCloseTo(1, 10)
  })

  it('toCents rounds to two places', () => {
    expect(toCents(1234.5678)).toBe(1234.57)
    expect(toCents(0.1 + 0.2)).toBe(0.3)
  })
})

describe('goal obligations', () => {
  const today = new Date(2026, 0, 1)

  it('only applies growth to investment goals', () => {
    expect(effectiveRate({ target_amount: 1, current_amount: 0, deadline: '2027-01-01', category: 'investment', interest_rate: 7 })).toBe(7)
    expect(effectiveRate({ target_amount: 1, current_amount: 0, deadline: '2027-01-01', category: 'savings', interest_rate: 7 })).toBe(null)
  })

  it('computes a savings goal as a straight division', () => {
    const required = monthlyRequirementForGoal(
      { target_amount: 12000, current_amount: 0, deadline: '2027-01-01', category: 'savings' },
      today
    )
    expect(required).toBeCloseTo(1000, 6)
  })

  it('honours a future start date by compressing the schedule', () => {
    const startsLater = monthlyRequirementForGoal(
      { target_amount: 12000, current_amount: 0, deadline: '2027-01-01', start_date: '2026-07-01', category: 'savings' },
      today
    )
    // Six months of runway instead of twelve means double the monthly payment
    expect(startsLater).toBeCloseTo(2000, 6)
  })

  it('sums obligations across goals', () => {
    const total = totalMonthlyGoalObligation(
      [
        { target_amount: 12000, current_amount: 0, deadline: '2027-01-01', category: 'savings' },
        { target_amount: 6000, current_amount: 0, deadline: '2027-01-01', category: 'savings' },
      ],
      today
    )
    expect(total).toBeCloseTo(1500, 6)
  })

  it('ignores goals that are already funded', () => {
    const total = totalMonthlyGoalObligation(
      [
        { target_amount: 12000, current_amount: 12000, deadline: '2027-01-01', category: 'savings' },
        { target_amount: 6000, current_amount: 0, deadline: '2027-01-01', category: 'savings' },
      ],
      today
    )
    expect(total).toBeCloseTo(500, 6)
  })
})
