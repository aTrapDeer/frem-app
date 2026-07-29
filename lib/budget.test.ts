import { describe, it, expect } from 'vitest'
import { categoryLabel, normalizeCategory, toAppCategory } from './budget'

describe('normalizeCategory', () => {
  it('lowercases and underscores', () => {
    expect(normalizeCategory('RENT_AND_UTILITIES')).toBe('rent_and_utilities')
    expect(normalizeCategory('Food and Drink')).toBe('food_and_drink')
  })

  it('collapses Plaid hierarchy separators', () => {
    expect(normalizeCategory('Travel > Airlines')).toBe('travel_airlines')
  })

  it('treats missing values as uncategorized', () => {
    expect(normalizeCategory(null)).toBe('uncategorized')
    expect(normalizeCategory(undefined)).toBe('uncategorized')
    expect(normalizeCategory('')).toBe('uncategorized')
  })
})

describe('toAppCategory', () => {
  it('maps Plaid taxonomy onto the app vocabulary', () => {
    // Without this the same rent payment appears twice under different names:
    // RENT_AND_UTILITIES from the bank, 'housing' from the budget
    expect(toAppCategory('RENT_AND_UTILITIES')).toBe('housing')
    expect(toAppCategory('FOOD_AND_DRINK')).toBe('food')
    expect(toAppCategory('MEDICAL')).toBe('health')
  })

  it('splits groceries out of food using the detailed category', () => {
    // 83 grocery transactions were indistinguishable from coffee runs under
    // the primary category alone
    expect(toAppCategory('FOOD_AND_DRINK', 'FOOD_AND_DRINK_GROCERIES')).toBe('groceries')
    expect(toAppCategory('FOOD_AND_DRINK', 'FOOD_AND_DRINK_RESTAURANT')).toBe('food')
    expect(toAppCategory('FOOD_AND_DRINK', 'FOOD_AND_DRINK_COFFEE')).toBe('food')
    expect(toAppCategory('FOOD_AND_DRINK', null)).toBe('food')
  })

  it('folds travel into transportation so they share a budget line', () => {
    expect(toAppCategory('TRAVEL')).toBe(toAppCategory('TRANSPORTATION'))
  })

  it('passes through categories that already match the app vocabulary', () => {
    expect(toAppCategory('housing')).toBe('housing')
    expect(toAppCategory('subscriptions')).toBe('subscriptions')
  })

  it('leaves unknown categories intact rather than dumping them in other', () => {
    // Silently bucketing unknowns hides them; keeping the name makes the gap visible
    expect(toAppCategory('CRYPTO_MINING')).toBe('crypto_mining')
  })
})

describe('categoryLabel', () => {
  it('renders a readable label', () => {
    expect(categoryLabel('rent_and_utilities')).toBe('Rent And Utilities')
    expect(categoryLabel('housing')).toBe('Housing')
  })
})

describe('planned figure precedence', () => {
  /**
   * A category cap is a statement about the whole category. When one exists it
   * must win over the sum of named items, otherwise setting "$300 on groceries"
   * would be silently overridden by whatever line items happen to exist.
   */
  function resolvePlanned(cap: number | undefined, itemTotal: number) {
    if (cap !== undefined) return { planned: cap, source: 'category_cap' as const }
    if (itemTotal > 0) return { planned: itemTotal, source: 'items' as const }
    return { planned: 0, source: 'none' as const }
  }

  it('prefers an explicit cap over the item total', () => {
    expect(resolvePlanned(300, 175)).toEqual({ planned: 300, source: 'category_cap' })
  })

  it('falls back to summing items when no cap is set', () => {
    // Rent 750 + Netflix 15 with no cap
    expect(resolvePlanned(undefined, 765)).toEqual({ planned: 765, source: 'items' })
  })

  it('reports no plan when there is neither', () => {
    expect(resolvePlanned(undefined, 0)).toEqual({ planned: 0, source: 'none' })
  })

  it('honours a deliberate zero cap', () => {
    // "I intend to spend nothing here" is a real budget, not an absent one
    expect(resolvePlanned(0, 500)).toEqual({ planned: 0, source: 'category_cap' })
  })
})

describe('over-budget detection', () => {
  function isOver(planned: number, actual: number) {
    return planned > 0 && actual > planned
  }

  it('flags spending above the plan', () => {
    expect(isOver(300, 412)).toBe(true)
  })

  it('does not flag spending within the plan', () => {
    expect(isOver(300, 240)).toBe(false)
  })

  it('does not flag categories with no plan at all', () => {
    // Unplanned spending is surfaced separately; calling it "over budget"
    // against a budget of zero would mark every new category red
    expect(isOver(0, 85)).toBe(false)
  })
})
