import { describe, expect, it } from 'vitest'
import {
  effectiveCurrentAmount,
  goalAllocationWeight,
  goalImportance,
  statusForGoal,
} from './database'

describe('goalImportance', () => {
  it('maps high, medium, and low priorities to their allocation multipliers', () => {
    expect(goalImportance('high')).toBe(1.5)
    expect(goalImportance('medium')).toBe(1)
    expect(goalImportance('low')).toBe(0.6)
  })
})

describe('goalAllocationWeight', () => {
  it('weights a far-away high-priority goal below a near-term medium goal', () => {
    const monthlyRequirement = 1_000
    const retirement = goalAllocationWeight(monthlyRequirement, 'high', 349)
    const nearTerm = goalAllocationWeight(monthlyRequirement, 'medium', 3)

    expect(retirement).toBeLessThan(nearTerm)
  })
})

describe('effectiveCurrentAmount', () => {
  it('uses only the allocated percentage of a linked account balance', () => {
    expect(effectiveCurrentAmount(10_000, 80)).toBe(8_000)
  })
})

describe('statusForGoal', () => {
  it('marks an unfinished unreachable goal at risk', () => {
    expect(statusForGoal({
      progressPercentage: 0,
      completed: false,
      projectedAfterDeadline: false,
      unreachable: true,
      daysAheadOrBehind: 0,
    })).toBe('at_risk')
  })
})
