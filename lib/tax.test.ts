import { describe, it, expect } from 'vitest'
import {
  TAX_YEAR_2026,
  assessMortgageIncome,
  assessSalaryReasonableness,
  compareSalarySplits,
  debtToIncomeRatio,
  ficaOnWages,
  federalIncomeTax,
  marginalRate,
  modelSalarySplit,
  progressiveTax,
  qbiDeduction,
  selfEmploymentTax,
} from './tax'

/**
 * These tests verify the ENGINE, not the rates. The statutory figures in
 * TAX_YEAR_2026 are unverified placeholders; a synthetic bracket table is used
 * wherever an exact expected number is asserted, so these stay valid when the
 * real rates are plugged in.
 */
const SYNTHETIC = [
  { threshold: 0, rate: 0.1 },
  { threshold: 10000, rate: 0.2 },
  { threshold: 50000, rate: 0.3 },
]

describe('TAX_YEAR_2026 published figures', () => {
  /**
   * Pins the statutory numbers to their published values so an accidental edit
   * fails loudly. Sources: IRS Rev. Proc. 2025-32, SSA October 2025 announcement,
   * OBBBA §70105.
   */
  it('is marked verified', () => {
    expect(TAX_YEAR_2026.verified).toBe(true)
    expect(TAX_YEAR_2026.year).toBe(2026)
  })

  it('matches the published standard deduction', () => {
    expect(TAX_YEAR_2026.standardDeduction.single).toBe(16100)
    expect(TAX_YEAR_2026.standardDeduction.married_joint).toBe(32200)
  })

  it('matches the published bracket thresholds', () => {
    expect(TAX_YEAR_2026.brackets.single.map(b => b.threshold)).toEqual([
      0, 12400, 50400, 105700, 201775, 256225, 640600,
    ])
    expect(TAX_YEAR_2026.brackets.married_joint.map(b => b.threshold)).toEqual([
      0, 24800, 100800, 211400, 403550, 512450, 768700,
    ])
  })

  it('keeps the seven statutory rates in order', () => {
    const rates = [0.1, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37]
    expect(TAX_YEAR_2026.brackets.single.map(b => b.rate)).toEqual(rates)
    expect(TAX_YEAR_2026.brackets.married_joint.map(b => b.rate)).toEqual(rates)
  })

  it('matches the published payroll figures', () => {
    expect(TAX_YEAR_2026.socialSecurity.wageBase).toBe(184500)
    expect(TAX_YEAR_2026.socialSecurity.rate).toBe(0.062)
    expect(TAX_YEAR_2026.medicare.rate).toBe(0.0145)
    // Statutory and never indexed for inflation
    expect(TAX_YEAR_2026.medicare.additionalThreshold.single).toBe(200000)
    expect(TAX_YEAR_2026.medicare.additionalThreshold.married_joint).toBe(250000)
  })

  it('uses the widened 2026 QBI phase-in ranges', () => {
    // OBBBA raised these from $50k / $100k
    expect(TAX_YEAR_2026.qbi.phaseInLength.single).toBe(75000)
    expect(TAX_YEAR_2026.qbi.phaseInLength.married_joint).toBe(150000)
    expect(TAX_YEAR_2026.qbi.phaseInStart.single).toBe(201750)
    expect(TAX_YEAR_2026.qbi.phaseInStart.married_joint).toBe(403500)
  })
})

describe('progressiveTax', () => {
  it('taxes nothing at or below zero', () => {
    expect(progressiveTax(0, SYNTHETIC)).toBe(0)
    expect(progressiveTax(-500, SYNTHETIC)).toBe(0)
  })

  it('applies each rate only to its own slice', () => {
    // 10k @ 10% = 1000; next 40k @ 20% = 8000
    expect(progressiveTax(10000, SYNTHETIC)).toBeCloseTo(1000, 6)
    expect(progressiveTax(50000, SYNTHETIC)).toBeCloseTo(9000, 6)
  })

  it('never applies a single rate to the whole amount', () => {
    // The classic bug: 60000 * 0.3 = 18000. Correct answer is far lower.
    const tax = progressiveTax(60000, SYNTHETIC)
    expect(tax).toBeCloseTo(12000, 6)
    expect(tax).toBeLessThan(60000 * 0.3)
  })

  it('is continuous across bracket boundaries', () => {
    // One extra dollar must never cause a jump in total tax
    const below = progressiveTax(49999, SYNTHETIC)
    const above = progressiveTax(50001, SYNTHETIC)
    expect(above - below).toBeLessThan(1)
  })

  it('is monotonically increasing', () => {
    let previous = 0
    for (let income = 0; income <= 100000; income += 2500) {
      const tax = progressiveTax(income, SYNTHETIC)
      expect(tax).toBeGreaterThanOrEqual(previous)
      previous = tax
    }
  })
})

describe('marginalRate', () => {
  it('reports the rate on the next dollar', () => {
    expect(marginalRate(5000, SYNTHETIC)).toBe(0.1)
    expect(marginalRate(10000, SYNTHETIC)).toBe(0.2)
    expect(marginalRate(75000, SYNTHETIC)).toBe(0.3)
  })
})

describe('federalIncomeTax', () => {
  it('applies the standard deduction', () => {
    const deduction = TAX_YEAR_2026.standardDeduction.single
    expect(federalIncomeTax(deduction, 'single')).toBe(0)
    expect(federalIncomeTax(deduction - 1000, 'single')).toBe(0)
  })

  it('taxes more for the same income when filing single', () => {
    expect(federalIncomeTax(150000, 'single')).toBeGreaterThan(
      federalIncomeTax(150000, 'married_joint')
    )
  })

  it('accepts an itemized deduction override', () => {
    expect(federalIncomeTax(100000, 'single', { deductions: 40000 })).toBeLessThan(
      federalIncomeTax(100000, 'single')
    )
  })
})

describe('ficaOnWages', () => {
  it('caps Social Security at the wage base', () => {
    const { wageBase, rate } = TAX_YEAR_2026.socialSecurity
    const wellOver = ficaOnWages(wageBase * 3, 'single')
    expect(wellOver.socialSecurity).toBeCloseTo(wageBase * rate, 6)
  })

  it('does not cap Medicare', () => {
    const low = ficaOnWages(100000, 'single')
    const high = ficaOnWages(400000, 'single')
    expect(high.medicare).toBeGreaterThan(low.medicare * 3.9)
  })

  it('applies the additional Medicare surtax only above the threshold', () => {
    const threshold = TAX_YEAR_2026.medicare.additionalThreshold.single
    expect(ficaOnWages(threshold, 'single').additionalMedicare).toBe(0)

    const over = ficaOnWages(threshold + 50000, 'single')
    expect(over.additionalMedicare).toBeCloseTo(50000 * TAX_YEAR_2026.medicare.additionalRate, 6)
  })
})

describe('selfEmploymentTax', () => {
  it('is zero without earnings', () => {
    expect(selfEmploymentTax(0, 'single').total).toBe(0)
    expect(selfEmploymentTax(-1000, 'single').total).toBe(0)
  })

  it('applies to 92.35% of net earnings, not the full amount', () => {
    const earnings = 50000
    const { netEarningsMultiplier } = TAX_YEAR_2026.selfEmployment
    const expectedBase = earnings * netEarningsMultiplier

    const tax = selfEmploymentTax(earnings, 'single')
    const expectedSs = expectedBase * TAX_YEAR_2026.socialSecurity.rate * 2
    expect(tax.socialSecurity).toBeCloseTo(expectedSs, 6)
  })

  it('charges both halves, so it exceeds employee-only FICA', () => {
    const se = selfEmploymentTax(80000, 'single').total
    const employeeOnly = ficaOnWages(80000, 'single').total
    expect(se).toBeGreaterThan(employeeOnly * 1.5)
  })
})

describe('qbiDeduction', () => {
  it('gives the full 20% below the phase-in', () => {
    expect(qbiDeduction(100000, 50000, 'single')).toBeCloseTo(20000, 6)
  })

  it('is zero without qualified income', () => {
    expect(qbiDeduction(0, 50000, 'single')).toBe(0)
    expect(qbiDeduction(-5000, 50000, 'single')).toBe(0)
  })

  it('phases out completely above the range for a passive owner', () => {
    const { phaseInStart, phaseInLength } = TAX_YEAR_2026.qbi
    const far = phaseInStart.single + phaseInLength.single + 1
    expect(
      qbiDeduction(100000, far, 'single', TAX_YEAR_2026, { materiallyParticipates: false })
    ).toBe(0)
  })

  it('applies the OBBBA $400 floor when the owner materially participates', () => {
    const { phaseInStart, phaseInLength, minimumDeduction } = TAX_YEAR_2026.qbi
    const far = phaseInStart.single + phaseInLength.single + 1
    // Fully phased out, but an owner-operator still gets the statutory minimum
    expect(qbiDeduction(100000, far, 'single')).toBe(minimumDeduction)
  })

  it('withholds the floor below the QBI threshold', () => {
    const { phaseInStart, phaseInLength, minimumDeductionQbiFloor } = TAX_YEAR_2026.qbi
    const far = phaseInStart.single + phaseInLength.single + 1
    expect(qbiDeduction(minimumDeductionQbiFloor - 1, far, 'single')).toBeLessThan(400)
  })

  it('phases out proportionally in between', () => {
    const { phaseInStart, phaseInLength } = TAX_YEAR_2026.qbi
    const midpoint = phaseInStart.single + phaseInLength.single / 2
    expect(qbiDeduction(100000, midpoint, 'single')).toBeCloseTo(10000, 4)
  })
})

describe('modelSalarySplit', () => {
  it('splits profit between salary and distribution', () => {
    const scenario = modelSalarySplit(200000, 80000, 'single')
    expect(scenario.salary).toBe(80000)
    expect(scenario.distribution).toBe(120000)
  })

  it('never lets salary exceed profit', () => {
    const scenario = modelSalarySplit(100000, 150000, 'single')
    expect(scenario.salary).toBe(100000)
    expect(scenario.distribution).toBe(0)
  })

  it('charges less payroll tax at a lower salary', () => {
    const low = modelSalarySplit(200000, 60000, 'single')
    const high = modelSalarySplit(200000, 160000, 'single')
    expect(low.totalPayrollTax).toBeLessThan(high.totalPayrollTax)
  })

  it('leaves more take-home at a lower salary, which is the whole S-corp incentive', () => {
    const low = modelSalarySplit(200000, 60000, 'single')
    const high = modelSalarySplit(200000, 180000, 'single')
    expect(low.takeHome).toBeGreaterThan(high.takeHome)
  })

  it('produces a coherent total', () => {
    const scenario = modelSalarySplit(200000, 90000, 'single')
    expect(scenario.totalTax).toBeCloseTo(
      scenario.federalIncomeTax + scenario.totalPayrollTax,
      6
    )
    expect(scenario.takeHome).toBeCloseTo(200000 - scenario.totalTax, 6)
  })

  it('keeps the effective rate plausible', () => {
    const scenario = modelSalarySplit(200000, 90000, 'single')
    expect(scenario.effectiveRate).toBeGreaterThan(0)
    expect(scenario.effectiveRate).toBeLessThan(0.6)
  })

  it('handles zero profit without dividing by zero', () => {
    const scenario = modelSalarySplit(0, 0, 'single')
    expect(scenario.effectiveRate).toBe(0)
    expect(Number.isFinite(scenario.totalTax)).toBe(true)
  })
})

describe('compareSalarySplits', () => {
  it('returns one scenario per step', () => {
    expect(compareSalarySplits(150000, 'single', { steps: 5 })).toHaveLength(5)
  })

  it('returns nothing for a business with no profit', () => {
    expect(compareSalarySplits(0, 'single')).toEqual([])
  })

  it('orders scenarios by ascending salary', () => {
    const scenarios = compareSalarySplits(150000, 'single', { steps: 4 })
    const salaries = scenarios.map(scenario => scenario.salary)
    expect(salaries).toEqual([...salaries].sort((a, b) => a - b))
  })
})

describe('assessSalaryReasonableness', () => {
  it('flags a salary that is a small share of profit', () => {
    expect(assessSalaryReasonableness(20000, 200000).verdict).toBe('likely_too_low')
  })

  it('accepts a middling share', () => {
    expect(assessSalaryReasonableness(100000, 200000).verdict).toBe('defensible')
  })

  it('flags an unnecessarily high salary', () => {
    expect(assessSalaryReasonableness(180000, 200000).verdict).toBe('likely_higher_than_needed')
  })

  it('does not divide by zero on no profit', () => {
    expect(assessSalaryReasonableness(0, 0).salaryShare).toBe(0)
  })
})

describe('assessMortgageIncome', () => {
  const twoYears = [
    { year: 2025, w2Wages: 60000, k1Income: 40000 },
    { year: 2026, w2Wages: 60000, k1Income: 60000 },
  ]

  it('treats a 25%+ owner as self-employed regardless of W-2 wages', () => {
    // The point most owners miss: W-2 from your own company does not make you a
    // W-2 borrower
    expect(assessMortgageIncome(twoYears, 100).treatedAsSelfEmployed).toBe(true)
    expect(assessMortgageIncome(twoYears, 25).treatedAsSelfEmployed).toBe(true)
    expect(assessMortgageIncome(twoYears, 24).treatedAsSelfEmployed).toBe(false)
  })

  it('averages two years of rising income', () => {
    // (100000 + 120000) / 2 = 110000 -> 9166.67/mo
    expect(assessMortgageIncome(twoYears, 100).monthlyQualifyingIncome).toBeCloseTo(110000 / 12, 4)
  })

  it('uses the lower figure when income is declining', () => {
    const declining = [
      { year: 2025, w2Wages: 80000, k1Income: 70000 },
      { year: 2026, w2Wages: 60000, k1Income: 40000 },
    ]
    const assessment = assessMortgageIncome(declining, 100)
    expect(assessment.incomeDeclining).toBe(true)
    expect(assessment.monthlyQualifyingIncome).toBeCloseTo(100000 / 12, 4)
  })

  it('flags insufficient history', () => {
    const oneYear = [{ year: 2026, w2Wages: 60000, k1Income: 60000 }]
    expect(assessMortgageIncome(oneYear, 100).meetsTwoYearHistory).toBe(false)
  })

  it('only counts the two most recent years', () => {
    const threeYears = [
      { year: 2024, w2Wages: 10000, k1Income: 0 },
      ...twoYears,
    ]
    expect(assessMortgageIncome(threeYears, 100).monthlyQualifyingIncome).toBeCloseTo(110000 / 12, 4)
  })
})

describe('debtToIncomeRatio', () => {
  it('computes the ratio', () => {
    expect(debtToIncomeRatio(3000, 10000)).toBeCloseTo(0.3, 6)
  })

  it('returns Infinity with no income rather than NaN', () => {
    expect(debtToIncomeRatio(3000, 0)).toBe(Infinity)
  })
})
