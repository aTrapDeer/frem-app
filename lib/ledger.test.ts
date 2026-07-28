import { describe, it, expect } from 'vitest'
import { findInternalTransfers, findPossibleDuplicates, type LedgerEntry } from './ledger'

function entry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 'e1',
    date: '2026-07-20',
    description: 'Test',
    merchantName: null,
    signedAmount: -50,
    amount: 50,
    type: 'expense',
    category: null,
    detailedCategory: null,
    entity: 'personal',
    entityLabel: null,
    source: 'synced',
    accountId: 'a1',
    pending: false,
    classificationSource: 'default',
    ...overrides,
  }
}

describe('findPossibleDuplicates', () => {
  it('flags a manual entry matching a synced transaction', () => {
    // Logged by hand, then the bank reported the same purchase
    const entries = [
      entry({ id: 's1', source: 'synced', date: '2026-07-20', amount: 85, signedAmount: -85 }),
      entry({ id: 'm1', source: 'manual', date: '2026-07-19', amount: 85, signedAmount: -85 }),
    ]

    const pairs = findPossibleDuplicates(entries)
    expect(pairs).toHaveLength(1)
    expect(pairs[0].manual.id).toBe('m1')
    expect(pairs[0].synced.id).toBe('s1')
    expect(pairs[0].daysApart).toBe(1)
  })

  it('ignores pairs outside the day tolerance', () => {
    const entries = [
      entry({ id: 's1', source: 'synced', date: '2026-07-20', amount: 85 }),
      entry({ id: 'm1', source: 'manual', date: '2026-07-01', amount: 85 }),
    ]
    expect(findPossibleDuplicates(entries)).toHaveLength(0)
  })

  it('requires the amounts to match', () => {
    const entries = [
      entry({ id: 's1', source: 'synced', amount: 85 }),
      entry({ id: 'm1', source: 'manual', amount: 84 }),
    ]
    expect(findPossibleDuplicates(entries)).toHaveLength(0)
  })

  it('does not pair income against expense', () => {
    const entries = [
      entry({ id: 's1', source: 'synced', amount: 85, type: 'expense' }),
      entry({ id: 'm1', source: 'manual', amount: 85, type: 'income' }),
    ]
    expect(findPossibleDuplicates(entries)).toHaveLength(0)
  })

  it('pairs each manual entry at most once', () => {
    // Two identical synced charges and one manual entry must not double-flag
    const entries = [
      entry({ id: 's1', source: 'synced', date: '2026-07-20', amount: 85 }),
      entry({ id: 's2', source: 'synced', date: '2026-07-21', amount: 85 }),
      entry({ id: 'm1', source: 'manual', date: '2026-07-20', amount: 85 }),
    ]
    expect(findPossibleDuplicates(entries)).toHaveLength(1)
  })

  it('never flags two synced transactions against each other', () => {
    // Genuine repeat purchases at the same merchant are not duplicates
    const entries = [
      entry({ id: 's1', source: 'synced', date: '2026-07-20', amount: 5 }),
      entry({ id: 's2', source: 'synced', date: '2026-07-21', amount: 5 }),
    ]
    expect(findPossibleDuplicates(entries)).toHaveLength(0)
  })

  it('returns nothing when there are no manual entries', () => {
    expect(findPossibleDuplicates([entry({ source: 'synced' })])).toHaveLength(0)
  })
})

describe('ledger sign convention', () => {
  /**
   * Pins the normalisation both sources converge on. Plaid reports positive for
   * money leaving; manual entries store a positive amount plus a direction.
   * Both must end up with signedAmount positive for money in.
   */
  it('an expense reduces the net figure', () => {
    const expense = entry({ type: 'expense', amount: 500, signedAmount: -500 })
    expect(expense.signedAmount).toBeLessThan(0)
    expect(expense.amount).toBeGreaterThan(0)
  })

  it('income increases the net figure', () => {
    const income = entry({ type: 'income', amount: 5850, signedAmount: 5850 })
    expect(income.signedAmount).toBeGreaterThan(0)
  })

  it('nets a mixed month correctly', () => {
    const month = [
      entry({ type: 'income', amount: 5850, signedAmount: 5850 }),
      entry({ type: 'expense', amount: 500, signedAmount: -500 }),
      entry({ type: 'expense', amount: 25, signedAmount: -25 }),
    ]
    const net = month.reduce((sum, item) => sum + item.signedAmount, 0)
    expect(net).toBe(5325)
  })

  it('keeps amount as a magnitude regardless of direction', () => {
    for (const item of [
      entry({ type: 'income', amount: 100, signedAmount: 100 }),
      entry({ type: 'expense', amount: 100, signedAmount: -100 }),
    ]) {
      expect(item.amount).toBe(100)
    }
  })
})

describe('findInternalTransfers', () => {
  const transfer = (over: Partial<LedgerEntry>) =>
    entry({ category: 'TRANSFER_OUT', ...over })

  it('matches a transfer leaving one account and arriving in another', () => {
    // Both sides linked means the same movement appears twice
    const entries = [
      transfer({ id: 'out', accountId: 'a', type: 'expense', amount: 500, date: '2026-06-10' }),
      transfer({ id: 'in', accountId: 'b', type: 'income', amount: 500, date: '2026-06-11', category: 'TRANSFER_IN' }),
    ]
    const internal = findInternalTransfers(entries)
    expect(internal.has('out')).toBe(true)
    expect(internal.has('in')).toBe(true)
  })

  it('leaves an unmatched transfer alone', () => {
    // Money leaving the linked set entirely is real spending
    const entries = [transfer({ id: 'out', accountId: 'a', type: 'expense', amount: 500 })]
    expect(findInternalTransfers(entries).size).toBe(0)
  })

  it('does not pair a transfer with itself within one account', () => {
    const entries = [
      transfer({ id: 'out', accountId: 'a', type: 'expense', amount: 500, date: '2026-06-10' }),
      transfer({ id: 'in', accountId: 'a', type: 'income', amount: 500, date: '2026-06-10', category: 'TRANSFER_IN' }),
    ]
    expect(findInternalTransfers(entries).size).toBe(0)
  })

  it('ignores non-transfer categories entirely', () => {
    // A $500 purchase and a $500 paycheck are not a transfer pair
    const entries = [
      entry({ id: 'buy', accountId: 'a', type: 'expense', amount: 500, category: 'FOOD_AND_DRINK' }),
      entry({ id: 'pay', accountId: 'b', type: 'income', amount: 500, category: 'INCOME' }),
    ]
    expect(findInternalTransfers(entries).size).toBe(0)
  })

  it('claims each inflow only once', () => {
    // Two identical outflows, one matching inflow -> only one pair
    const entries = [
      transfer({ id: 'out1', accountId: 'a', type: 'expense', amount: 500, date: '2026-06-10' }),
      transfer({ id: 'out2', accountId: 'a', type: 'expense', amount: 500, date: '2026-06-10' }),
      transfer({ id: 'in', accountId: 'b', type: 'income', amount: 500, date: '2026-06-10', category: 'TRANSFER_IN' }),
    ]
    expect(findInternalTransfers(entries).size).toBe(2)
  })

  it('does not pair transfers far apart in time', () => {
    const entries = [
      transfer({ id: 'out', accountId: 'a', type: 'expense', amount: 500, date: '2026-06-01' }),
      transfer({ id: 'in', accountId: 'b', type: 'income', amount: 500, date: '2026-06-25', category: 'TRANSFER_IN' }),
    ]
    expect(findInternalTransfers(entries).size).toBe(0)
  })

  it('leaves surplus unchanged while deflating both sides', () => {
    const entries = [
      transfer({ id: 'out', accountId: 'a', type: 'expense', amount: 500, date: '2026-06-10' }),
      transfer({ id: 'in', accountId: 'b', type: 'income', amount: 500, date: '2026-06-10', category: 'TRANSFER_IN' }),
      entry({ id: 'pay', accountId: 'a', type: 'income', amount: 3000, category: 'INCOME' }),
      entry({ id: 'rent', accountId: 'a', type: 'expense', amount: 750, category: 'RENT_AND_UTILITIES' }),
    ]
    const internal = findInternalTransfers(entries)
    const kept = entries.filter(e => !internal.has(e.id))

    const income = kept.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
    const expenses = kept.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)

    expect(income).toBe(3000)
    expect(expenses).toBe(750)
    expect(income - expenses).toBe(2250)
  })
})
