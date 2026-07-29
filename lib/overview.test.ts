import { describe, expect, it } from 'vitest'
import { calculateNetWorth, hasBusinessData, mapSurplus } from './overview'

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
