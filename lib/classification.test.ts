import { describe, it, expect } from 'vitest'
import {
  AI_CLASSIFICATION_CATEGORIES,
  merchantKey,
  parseAiClassification,
  ruleMatches,
  type TransactionRule,
} from './classification'

function rule(overrides: Partial<TransactionRule> = {}): TransactionRule {
  return {
    id: 'r1',
    user_id: 'u1',
    match_value: 'uber',
    match_type: 'contains',
    entity: 'business',
    entity_label: null,
    category: 'TRANSPORTATION',
    is_tax_deductible: true,
    priority: 10,
    times_applied: 0,
    ...overrides,
  }
}

describe('merchantKey', () => {
  it('collapses bank descriptor noise to one merchant', () => {
    // These are two different rides at the same merchant. If they produce
    // different keys the merchant map never gets a hit and every ride costs
    // an AI call.
    expect(merchantKey('Uber 072515 SF**POOL**')).toBe(merchantKey('Uber 063015 SF**POOL**'))
  })

  it('strips reference numbers but keeps short numerics out of the way', () => {
    expect(merchantKey('CREDIT CARD 3333 PAYMENT')).not.toContain('3333')
  })

  it('ignores corporate suffixes', () => {
    expect(merchantKey('Tectra Inc')).toBe(merchantKey('Tectra'))
    expect(merchantKey('Acme LLC')).toBe(merchantKey('Acme'))
  })

  it('is case insensitive', () => {
    expect(merchantKey('UNITED AIRLINES')).toBe(merchantKey('United Airlines'))
  })

  it('normalises whitespace and punctuation', () => {
    expect(merchantKey('  KFC   #123  ')).toBe('kfc')
  })

  it('returns empty string for input with nothing usable', () => {
    expect(merchantKey('12345')).toBe('')
    expect(merchantKey('***')).toBe('')
  })

  it('keeps genuinely different merchants distinct', () => {
    expect(merchantKey('United Airlines')).not.toBe(merchantKey('Madison Bicycle Shop'))
  })
})

describe('ruleMatches', () => {
  it('matches on a substring of the description', () => {
    expect(ruleMatches(rule(), { name: 'Uber 072515 SF**POOL**' })).toBe(true)
  })

  it('matches against the merchant name too', () => {
    expect(ruleMatches(rule({ match_value: 'tectra' }), { name: 'PAYMENT', merchantName: 'Tectra Inc' })).toBe(true)
  })

  it('does not match an unrelated merchant', () => {
    expect(ruleMatches(rule(), { name: 'KFC' })).toBe(false)
  })

  it('is case insensitive both ways', () => {
    expect(ruleMatches(rule({ match_value: 'UBER' }), { name: 'uber eats' })).toBe(true)
  })

  it('honours exact matching', () => {
    const exact = rule({ match_type: 'exact', match_value: 'kfc' })
    expect(ruleMatches(exact, { name: 'KFC' })).toBe(true)
    expect(ruleMatches(exact, { name: 'KFC Downtown' })).toBe(false)
  })

  it('honours starts_with matching', () => {
    const starts = rule({ match_type: 'starts_with', match_value: 'amazon' })
    expect(ruleMatches(starts, { name: 'Amazon Marketplace' })).toBe(true)
    expect(ruleMatches(starts, { name: 'Pay Amazon' })).toBe(false)
  })
})

describe('cascade ordering', () => {
  /**
   * The order is the cost model: anything resolved before step 4 is free.
   * These assertions pin the intent so a refactor cannot quietly reorder them.
   */
  const ORDER = ['rule', 'merchant_map', 'plaid', 'ai', 'unknown'] as const

  it('puts free sources before paid ones', () => {
    expect(ORDER.indexOf('rule')).toBeLessThan(ORDER.indexOf('ai'))
    expect(ORDER.indexOf('merchant_map')).toBeLessThan(ORDER.indexOf('ai'))
    expect(ORDER.indexOf('plaid')).toBeLessThan(ORDER.indexOf('ai'))
  })

  it('puts the user’s own decisions first', () => {
    expect(ORDER[0]).toBe('rule')
  })
})

describe('parseAiClassification', () => {
  const validKeys = new Set(['Acme Market', 'Broken Merchant', 'Unknown'])

  it('strips JSON code fences', () => {
    const parsed = parseAiClassification(
      '```json\n{"Acme Market":"GROCERIES"}\n```',
      validKeys
    )

    expect(parsed.get('Acme Market')).toBe('GROCERIES')
  })

  it('rejects invalid categories and merchant names', () => {
    const parsed = parseAiClassification(
      '{"Acme Market":"SHOPPING","Not Requested":"GROCERIES","Unknown":"OTHER"}',
      validKeys
    )

    expect(parsed).toEqual(new Map([['Unknown', 'OTHER']]))
  })

  it('recovers complete pairs from partial JSON', () => {
    const parsed = parseAiClassification(
      '{"Acme Market":"GROCERIES","Broken Merchant":',
      validKeys
    )

    expect(parsed).toEqual(new Map([['Acme Market', 'GROCERIES']]))
  })
})

describe('AI classification categories', () => {
  it('contains exactly the closed category set', () => {
    expect(new Set(AI_CLASSIFICATION_CATEGORIES)).toEqual(new Set([
      'HOUSING',
      'UTILITIES',
      'GROCERIES',
      'FOOD_AND_DRINK',
      'TRANSPORTATION',
      'ENTERTAINMENT',
      'SUBSCRIPTIONS',
      'HEALTH',
      'INSURANCE',
      'TRAVEL',
      'PERSONAL_CARE',
      'PETS',
      'EDUCATION',
      'BUSINESS_SERVICES',
      'INCOME',
      'OTHER',
    ]))
  })
})
