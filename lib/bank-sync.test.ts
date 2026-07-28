import { describe, it, expect } from 'vitest'

/**
 * Sign-convention tests.
 *
 * Plaid reports amounts with POSITIVE meaning money left the account. The rest
 * of the app thinks in terms of income and expense. Getting this backwards
 * inverts every surplus calculation, so the conversion is pinned here before
 * anything depends on it.
 */

/** Plaid's convention: positive = outflow. */
export function isOutflow(plaidAmount: number): boolean {
  return plaidAmount > 0
}

/** Converts a Plaid amount to the app's income/expense shape. */
export function toLedgerEntry(plaidAmount: number): { type: 'income' | 'expense'; amount: number } {
  return {
    type: plaidAmount > 0 ? 'expense' : 'income',
    amount: Math.abs(plaidAmount),
  }
}

/** Net effect on a balance: inflows positive, outflows negative. */
export function signedImpact(plaidAmount: number): number {
  return -plaidAmount
}

describe('Plaid sign convention', () => {
  it('treats positive amounts as money leaving the account', () => {
    expect(isOutflow(500)).toBe(true)
    expect(isOutflow(-500)).toBe(false)
  })

  it('maps a purchase to an expense', () => {
    // "United Airlines 500.00" is money spent
    expect(toLedgerEntry(500)).toEqual({ type: 'expense', amount: 500 })
  })

  it('maps a deposit to income', () => {
    // A payroll credit arrives negative
    expect(toLedgerEntry(-5850)).toEqual({ type: 'income', amount: 5850 })
  })

  it('never produces a negative amount', () => {
    for (const value of [-100, -0.01, 0.01, 100]) {
      expect(toLedgerEntry(value).amount).toBeGreaterThanOrEqual(0)
    }
  })

  it('inverts the sign for balance impact', () => {
    // Spending reduces the balance
    expect(signedImpact(500)).toBe(-500)
    // Income increases it
    expect(signedImpact(-5850)).toBe(5850)
  })

  it('nets a month of activity correctly', () => {
    // 5850 in, 500 + 25 out
    const month = [-5850, 500, 25]
    const net = month.reduce((sum, amount) => sum + signedImpact(amount), 0)
    expect(net).toBe(5325)
  })
})

describe('debt accounts', () => {
  /** Plaid reports loan and credit balances as positive amounts owed. */
  function netWorthContribution(accountType: string, balance: number): number {
    const isDebt = accountType === 'credit' || accountType === 'loan'
    return isDebt ? -Math.abs(balance) : balance
  }

  it('subtracts credit card balances', () => {
    expect(netWorthContribution('credit', 5020)).toBe(-5020)
  })

  it('subtracts loan balances', () => {
    // A mortgage reported as 56302 owed reduces net worth
    expect(netWorthContribution('loan', 56302)).toBe(-56302)
  })

  it('adds depository and investment balances', () => {
    expect(netWorthContribution('depository', 12060)).toBe(12060)
    expect(netWorthContribution('investment', 23632)).toBe(23632)
  })

  it('computes net worth across a mixed set of accounts', () => {
    const accounts: Array<[string, number]> = [
      ['depository', 110],
      ['depository', 43200],
      ['investment', 23632],
      ['credit', 5020],
      ['loan', 56302],
    ]
    const net = accounts.reduce((sum, [type, balance]) => sum + netWorthContribution(type, balance), 0)
    expect(net).toBe(5620)

    // Debt must pull the total down — summing everything as assets overstates by
    // more than ten times here
    const naive = accounts.reduce((sum, [, balance]) => sum + balance, 0)
    expect(naive).toBe(128264)
    expect(net).toBeLessThan(naive)
  })
})
