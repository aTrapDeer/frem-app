import { describe, expect, it } from 'vitest'
import {
  RANGE_DAYS,
  buildOverviewWindow,
  calculateMonthlyRate,
  calculateNetWorth,
  calculateOverviewCoverage,
  grantOverviewRange,
  hasBusinessData,
  mapSurplus,
  parseOverviewRange,
} from './overview'

const TODAY = new Date('2026-08-01T12:00:00.000Z')

describe('overview range parsing', () => {
  it.each(['1w', '1m', '2m', '3m', '6m', '1y'] as const)(
    'accepts the supported %s range',
    range => {
      expect(parseOverviewRange(range)).toBe(range)
    }
  )

  it('ignores absent and invalid ranges', () => {
    expect(parseOverviewRange(null)).toBeNull()
    expect(parseOverviewRange(undefined)).toBeNull()
    expect(parseOverviewRange('12m')).toBeNull()
  })
})

describe('overview transaction coverage', () => {
  it('reports no coverage without bank transactions', () => {
    expect(calculateOverviewCoverage(null, TODAY)).toEqual({
      earliestTransaction: null,
      availableRanges: [],
    })
  })

  it('uses the exact range cutoff as fully covered', () => {
    expect(calculateOverviewCoverage('2026-05-02', TODAY)).toEqual({
      earliestTransaction: '2026-05-02',
      availableRanges: ['1w', '1m', '2m', '3m'],
    })
  })

  it('does not include a range when history begins after its cutoff', () => {
    expect(calculateOverviewCoverage('2026-07-26', TODAY).availableRanges).toEqual([])
  })
})

describe('overview monthly rates', () => {
  it('normalizes a raw window total to a 30.44-day monthly rate', () => {
    expect(calculateMonthlyRate(700, RANGE_DAYS['1w'])).toBe(3044)
    expect(calculateMonthlyRate(1_234.56, RANGE_DAYS['2m'])).toBe(616.07)
  })
})

describe('overview calendar windows', () => {
  it('builds an inclusive trailing window ending today', () => {
    expect(buildOverviewWindow('1w', TODAY)).toEqual({
      range: '1w',
      days: 7,
      start: '2026-07-26',
      end: '2026-08-01',
      label: 'past 7 days',
    })
  })
})

describe('overview granted ranges', () => {
  it('keeps a requested range that is fully covered', () => {
    expect(grantOverviewRange('2m', ['1w', '1m', '2m'])).toBe('2m')
  })

  it('downgrades an uncovered request to the widest covered range', () => {
    expect(grantOverviewRange('1y', ['1w', '1m', '2m', '3m'])).toBe('3m')
  })

  it('uses the minimum window when no range is fully covered', () => {
    expect(grantOverviewRange('6m', [])).toBe('1w')
  })
})

describe('overview surplus basis', () => {
  it('maps actual ledger data to the measured basis', () => {
    expect(
      mapSurplus(
        {
          monthlySurplus: 1250.555,
          basis: 'actual',
          monthsOfData: 2,
          history: [{ month: '2026-06', surplus: 1200.555 }],
        },
        900
      )
    ).toEqual({
      value: 1250.56,
      basis: 'measured',
      monthsOfData: 2,
      history: [{ month: '2026-06', surplus: 1200.56 }],
    })
  })

  it('uses the entity plan when no measured data exists', () => {
    expect(
      mapSurplus(
        {
          monthlySurplus: 9999,
          basis: 'plan',
          monthsOfData: 0,
          history: [],
        },
        450.555
      )
    ).toEqual({
      value: 450.56,
      basis: 'plan',
      monthsOfData: 0,
      history: [],
    })
  })
})

describe('overview business visibility', () => {
  it('hides business features when every business input is empty', () => {
    expect(hasBusinessData([], [], [])).toBe(false)
  })
})

describe('overview net worth', () => {
  it('adds assets, subtracts debt, and ignores excluded accounts', () => {
    const netWorth = calculateNetWorth([
      { account_type: 'depository', current_balance: 43_200, is_excluded: false },
      { account_type: 'investment', current_balance: 23_632, is_excluded: false },
      { account_type: 'credit', current_balance: 5_020, is_excluded: false },
      { account_type: 'loan', current_balance: -56_302, is_excluded: false },
      { account_type: 'depository', current_balance: 999, is_excluded: true },
    ])

    expect(netWorth).toEqual({
      assets: 66_832,
      debts: 61_322,
      net: 5_510,
      accountCount: 4,
    })
  })
})
