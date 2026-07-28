import { describe, it, expect } from 'vitest'
import {
  daysSince,
  describeAge,
  findLapsedIncomeSources,
  freshnessOf,
  incomeEndsOn,
  isIncomeSourceActive,
  monthsSince,
} from './freshness'

const NOW = new Date(2026, 6, 27) // 27 July 2026

describe('daysSince / monthsSince', () => {
  it('counts whole days', () => {
    expect(daysSince(new Date(2026, 6, 20), NOW)).toBe(7)
    expect(daysSince(new Date(2026, 6, 27), NOW)).toBe(0)
  })

  it('is negative for future dates', () => {
    expect(daysSince(new Date(2026, 7, 3), NOW)).toBeLessThan(0)
  })

  it('counts calendar months and floors at zero', () => {
    expect(monthsSince('2026-04-01', NOW)).toBe(3)
    expect(monthsSince('2026-07-01', NOW)).toBe(0)
    expect(monthsSince('2026-12-01', NOW)).toBe(0) // future
  })

  it('treats date-only strings as local dates', () => {
    // Guards the UTC-parsing bug: '2026-07-01' must not read as June 30
    expect(monthsSince('2026-07-01', NOW)).toBe(0)
  })
})

describe('freshnessOf', () => {
  it('grades by age', () => {
    expect(freshnessOf(new Date(2026, 6, 25), NOW)).toBe('fresh')
    expect(freshnessOf(new Date(2026, 6, 1), NOW)).toBe('aging')
    expect(freshnessOf(new Date(2026, 3, 1), NOW)).toBe('stale')
  })

  it('treats never-updated as stale', () => {
    expect(freshnessOf(null, NOW)).toBe('stale')
  })

  it('puts the boundaries where documented', () => {
    expect(freshnessOf(new Date(2026, 6, 13), NOW)).toBe('fresh') // 14 days
    expect(freshnessOf(new Date(2026, 6, 12), NOW)).toBe('aging') // 15 days
  })
})

describe('describeAge', () => {
  it('reads naturally', () => {
    expect(describeAge(new Date(2026, 6, 27), NOW)).toBe('updated today')
    expect(describeAge(new Date(2026, 6, 26), NOW)).toBe('updated yesterday')
    expect(describeAge(new Date(2026, 6, 17), NOW)).toBe('updated 10 days ago')
    expect(describeAge(new Date(2026, 4, 27), NOW)).toBe('updated 2 months ago')
    expect(describeAge(null, NOW)).toBe('never updated')
  })
})

describe('incomeEndsOn', () => {
  it('returns null for open-ended income', () => {
    expect(incomeEndsOn({ status: 'active' })).toBe(null)
  })

  it('uses the later of end date and final payment date', () => {
    // A contract's final payment often lands after the work stops
    const endsOn = incomeEndsOn({
      status: 'active',
      end_date: '2026-06-30',
      final_payment_date: '2026-08-15',
    })
    expect(endsOn?.getMonth()).toBe(7) // August
  })

  it('handles only one of the two being set', () => {
    expect(incomeEndsOn({ status: 'active', end_date: '2026-06-30' })?.getMonth()).toBe(5)
    expect(incomeEndsOn({ status: 'active', final_payment_date: '2026-09-01' })?.getMonth()).toBe(8)
  })
})

describe('isIncomeSourceActive', () => {
  it('respects the manual status flag', () => {
    expect(isIncomeSourceActive({ status: 'paused' }, NOW)).toBe(false)
    expect(isIncomeSourceActive({ status: 'ended' }, NOW)).toBe(false)
    expect(isIncomeSourceActive({ status: 'active' }, NOW)).toBe(true)
  })

  it('excludes contracts that have not started', () => {
    expect(isIncomeSourceActive({ status: 'active', start_date: '2026-09-01' }, NOW)).toBe(false)
    expect(isIncomeSourceActive({ status: 'active', start_date: '2026-07-01' }, NOW)).toBe(true)
  })

  it('excludes contracts that already ended', () => {
    // Regression: an ended contract kept counting as income forever because only
    // a hand-set status flag could stop it
    expect(isIncomeSourceActive({ status: 'active', end_date: '2026-03-31' }, NOW)).toBe(false)
  })

  it('keeps a contract alive through its final payment month', () => {
    expect(
      isIncomeSourceActive(
        { status: 'active', end_date: '2026-06-30', final_payment_date: '2026-07-15' },
        NOW
      )
    ).toBe(true)
  })

  it('keeps a contract alive during its final month', () => {
    expect(isIncomeSourceActive({ status: 'active', end_date: '2026-07-31' }, NOW)).toBe(true)
  })
})

describe('findLapsedIncomeSources', () => {
  it('surfaces active sources whose contract has passed', () => {
    const sources = [
      { id: 'a', status: 'active', end_date: '2026-01-31' },
      { id: 'b', status: 'active', end_date: '2026-12-31' },
      { id: 'c', status: 'active' },
      { id: 'd', status: 'ended', end_date: '2026-01-31' },
    ]

    const lapsed = findLapsedIncomeSources(sources, NOW)
    expect(lapsed.map(source => source.id)).toEqual(['a'])
  })

  it('returns nothing when everything is current', () => {
    expect(findLapsedIncomeSources([{ status: 'active' }], NOW)).toEqual([])
  })
})
