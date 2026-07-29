import { describe, it, expect } from 'vitest'

/**
 * Entity-scoped surplus allocation.
 *
 * The rule being protected: business surplus cannot fund a personal goal. Money
 * has to leave the company as salary or a distribution first, which is a taxable
 * event the projection does not get to assume. Summing the two pools would let
 * the app promise a house deposit funded by cash that legally cannot be spent
 * that way.
 */

type Goal = { id: string; entity: 'personal' | 'business'; target: number }

function goalsForPool(goals: Goal[], entity: 'personal' | 'business'): Goal[] {
  return goals.filter(goal => (entity === 'business' ? goal.entity === 'business' : goal.entity !== 'business'))
}

/** Even split, standing in for the weighted allocator. */
function allocate(surplus: number, goals: Goal[]): Map<string, number> {
  const result = new Map<string, number>()
  if (goals.length === 0 || surplus <= 0) {
    for (const goal of goals) result.set(goal.id, 0)
    return result
  }
  for (const goal of goals) result.set(goal.id, surplus / goals.length)
  return result
}

const GOALS: Goal[] = [
  { id: 'house', entity: 'personal', target: 60000 },
  { id: 'emergency', entity: 'personal', target: 6000 },
  { id: 'biz-card', entity: 'business', target: 7000 },
]

describe('pool membership', () => {
  it('routes personal goals to the personal pool', () => {
    expect(goalsForPool(GOALS, 'personal').map(g => g.id)).toEqual(['house', 'emergency'])
  })

  it('routes business goals to the business pool', () => {
    expect(goalsForPool(GOALS, 'business').map(g => g.id)).toEqual(['biz-card'])
  })

  it('treats an untagged goal as personal', () => {
    // Rows created before the entity column existed default to personal
    const legacy = [{ id: 'old', entity: undefined as unknown as 'personal', target: 1000 }]
    expect(goalsForPool(legacy, 'personal')).toHaveLength(1)
    expect(goalsForPool(legacy, 'business')).toHaveLength(0)
  })

  it('assigns every goal to exactly one pool', () => {
    const personal = goalsForPool(GOALS, 'personal').length
    const business = goalsForPool(GOALS, 'business').length
    expect(personal + business).toBe(GOALS.length)
  })
})

describe('allocation isolation', () => {
  it('never funds a personal goal from business surplus', () => {
    // No personal surplus at all, but a healthy business
    const personal = allocate(0, goalsForPool(GOALS, 'personal'))
    const business = allocate(5000, goalsForPool(GOALS, 'business'))

    expect(personal.get('house')).toBe(0)
    expect(personal.get('emergency')).toBe(0)
    expect(business.get('biz-card')).toBe(5000)
  })

  it('never funds a business goal from personal surplus', () => {
    const personal = allocate(4000, goalsForPool(GOALS, 'personal'))
    const business = allocate(0, goalsForPool(GOALS, 'business'))

    expect(business.get('biz-card')).toBe(0)
    expect(personal.get('house')).toBe(2000)
  })

  it('keeps the pools independent when both have surplus', () => {
    const personal = allocate(4000, goalsForPool(GOALS, 'personal'))
    const business = allocate(1000, goalsForPool(GOALS, 'business'))

    const personalTotal = [...personal.values()].reduce((a, b) => a + b, 0)
    const businessTotal = [...business.values()].reduce((a, b) => a + b, 0)

    expect(personalTotal).toBe(4000)
    expect(businessTotal).toBe(1000)
    // The combined figure is reportable, but no single goal ever draws from both
    expect(personalTotal + businessTotal).toBe(5000)
  })

  it('returns an empty allocation when a pool has no goals', () => {
    const onlyPersonal: Goal[] = [{ id: 'house', entity: 'personal', target: 60000 }]
    expect(allocate(9999, goalsForPool(onlyPersonal, 'business')).size).toBe(0)
  })

  it('does not distribute a negative surplus', () => {
    const personal = allocate(-2000, goalsForPool(GOALS, 'personal'))
    for (const amount of personal.values()) expect(amount).toBe(0)
  })
})
