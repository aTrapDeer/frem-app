import { describe, expect, it } from 'vitest'
import {
  buildGoalBriefText,
  countFundingStreak,
  isFundedMonth,
  roundMonthsAheadOrBehind,
  type GoalBriefInput,
} from './goal-insights'

describe('countFundingStreak', () => {
  it('returns zero for an empty month history', () => {
    expect(countFundingStreak([])).toBe(0)
  })

  it('counts consecutive funded months from the end', () => {
    expect(countFundingStreak([false, true, true])).toBe(2)
  })

  it('stops at the latest gap', () => {
    expect(countFundingStreak([true, true, false, true])).toBe(1)
  })
})

describe('isFundedMonth', () => {
  it('compares measured surplus with the current allocation', () => {
    expect(
      isFundedMonth({
        surplus: 410,
        monthlyAllocated: 410,
        monthlyRequired: 500,
      })
    ).toBe(true)
    expect(
      isFundedMonth({
        surplus: 409.99,
        monthlyAllocated: 410,
        monthlyRequired: 200,
      })
    ).toBe(false)
  })

  it('falls back to the required amount when allocation is zero', () => {
    expect(
      isFundedMonth({
        surplus: 250,
        monthlyAllocated: 0,
        monthlyRequired: 250,
      })
    ).toBe(true)
    expect(
      isFundedMonth({
        surplus: 249,
        monthlyAllocated: 0,
        monthlyRequired: 250,
      })
    ).toBe(false)
  })
})

describe('roundMonthsAheadOrBehind', () => {
  it('rounds positive and negative day differences with their sign intact', () => {
    expect(roundMonthsAheadOrBehind(65)).toBe(2)
    expect(roundMonthsAheadOrBehind(-40)).toBe(-1)
  })
})

describe('buildGoalBriefText', () => {
  it('never exposes a linked account label or mask', () => {
    const input: GoalBriefInput = {
      goal: {
        title: 'House Down Payment',
        category: 'house',
        entity: 'personal',
        currentAmount: 500,
        targetAmount: 900,
        deadline: '2027-06-01',
        monthsRemaining: 11,
        status: 'on_track',
        monthlyRequired: 40,
        monthlyAllocated: 50,
        monthsAheadOrBehind: 2,
      },
      linkedAccount: {
        kind: 'investment',
        allocationPercent: 80,
        annualGrowthRate: 7,
        label: 'Brokerage •••• 9876',
      },
      context: {
        personalSurplus: { value: 300, monthsOfData: 3, measured: true },
        businessSurplus: null,
        ownerPayPendingCount: 0,
        filingStatus: 'single',
        taxState: 'IL',
        businessType: null,
        ownershipPercentage: null,
        investmentAccounts: { count: 1, total: 700 },
        liabilities: { count: 0, total: 0 },
      },
    }

    const brief = buildGoalBriefText(input)

    expect(brief).not.toContain('9876')
    expect(brief).not.toContain('Brokerage')
    expect(brief).toContain('80% of an investment account (~7%/yr)')
  })
})
