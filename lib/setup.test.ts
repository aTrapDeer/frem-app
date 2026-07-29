import { describe, expect, it } from 'vitest'
import {
  RISK_PROFILE_RATES,
  validateEarningTypes,
  validateInvestments,
  validateLiabilities,
} from './setup'

describe('validateEarningTypes', () => {
  it('accepts valid subsets', () => {
    expect(validateEarningTypes(['w2', 'freelance'])).toEqual(['w2', 'freelance'])
    expect(validateEarningTypes([])).toEqual([])
  })

  it('rejects unknown earning types', () => {
    expect(() => validateEarningTypes(['w2', 'rental'])).toThrow()
  })

  it('rejects non-arrays', () => {
    expect(() => validateEarningTypes('w2')).toThrow()
  })
})

describe('validateInvestments', () => {
  const valid = {
    accountType: '401k',
    balance: 25_000,
    riskProfile: 'index',
  }

  it('accepts valid account and risk enums', () => {
    expect(validateInvestments([valid])).toEqual([valid])
  })

  it('rejects an unknown account type or risk profile', () => {
    expect(() =>
      validateInvestments([{ ...valid, accountType: 'pension' }])
    ).toThrow()
    expect(() =>
      validateInvestments([{ ...valid, riskProfile: 'speculative' }])
    ).toThrow()
  })

  it('rejects a negative balance', () => {
    expect(() => validateInvestments([{ ...valid, balance: -1 }])).toThrow()
  })
})

describe('validateLiabilities', () => {
  const valid = {
    name: 'Student loan',
    kind: 'student_loan',
    balance: 12_500,
    interestRate: 5.25,
  }

  it('accepts valid liability enums and rates', () => {
    expect(validateLiabilities([valid])).toEqual([valid])
  })

  it('rejects an unknown kind', () => {
    expect(() => validateLiabilities([{ ...valid, kind: 'payday_loan' }])).toThrow()
  })

  it('rejects empty and overlong names', () => {
    expect(() => validateLiabilities([{ ...valid, name: '   ' }])).toThrow()
    expect(() => validateLiabilities([{ ...valid, name: 'x'.repeat(121) }])).toThrow()
  })

  it('rejects interest rates outside 0 through 100', () => {
    expect(() => validateLiabilities([{ ...valid, interestRate: -0.01 }])).toThrow()
    expect(() => validateLiabilities([{ ...valid, interestRate: 100.01 }])).toThrow()
  })
})

describe('RISK_PROFILE_RATES', () => {
  it('exposes the exact setup growth percentages', () => {
    expect(RISK_PROFILE_RATES).toEqual({
      conservative: 4,
      index: 7,
      aggressive: 10,
    })
  })
})
