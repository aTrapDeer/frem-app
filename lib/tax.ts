/**
 * Tax modelling engine.
 *
 * Scope: this computes scenarios. It does not give tax advice, and its output is
 * an estimate for planning — not a filing figure. Anything that drives a real
 * decision (an S-corp salary level, a mortgage application) needs a CPA.
 *
 * Structure: every statutory number lives in the rate table below, separated
 * from the math. That way the formulas can be tested for correctness
 * independently of whether the rates are current, and updating for a new tax
 * year is a data change rather than a code change.
 *
 * Rate sources (tax year 2026):
 * - Brackets and standard deduction: IRS Rev. Proc. 2025-32, as published in the
 *   IRS newsroom release on 2026 inflation adjustments.
 * - Social Security wage base ($184,500): SSA announcement, October 2025.
 * - Medicare rates and the additional Medicare thresholds ($200k / $250k): these
 *   thresholds are statutory and have never been indexed for inflation.
 * - QBI thresholds and phase-in ranges: OBBBA §70105, which widened the phase-in
 *   from $50k/$100k to $75k/$150k starting in 2026.
 *
 * Verified 2026-07-27. Re-check when the 2027 revenue procedure lands.
 */

export type FilingStatus = 'single' | 'married_joint'

export type TaxBracket = {
  /** Income at which this rate starts applying (taxable income, after deductions). */
  threshold: number
  rate: number
}

export type TaxYearRates = {
  year: number
  /** Set true only once these figures have been checked against IRS publications. */
  verified: boolean
  standardDeduction: Record<FilingStatus, number>
  brackets: Record<FilingStatus, TaxBracket[]>
  socialSecurity: {
    rate: number
    /** Employee share; the employer pays the same again. */
    wageBase: number
  }
  medicare: {
    rate: number
    additionalRate: number
    additionalThreshold: Record<FilingStatus, number>
  }
  selfEmployment: {
    /** SE tax applies to 92.35% of net earnings, not the full amount. */
    netEarningsMultiplier: number
  }
  qbi: {
    rate: number
    phaseInStart: Record<FilingStatus, number>
    phaseInLength: Record<FilingStatus, number>
    /** OBBBA floor for taxpayers who materially participate. */
    minimumDeduction: number
    /** QBI required before the minimum deduction applies. */
    minimumDeductionQbiFloor: number
  }
}

export const TAX_YEAR_2026: TaxYearRates = {
  year: 2026,
  verified: true,
  standardDeduction: {
    single: 16100,
    married_joint: 32200,
  },
  brackets: {
    single: [
      { threshold: 0, rate: 0.10 },
      { threshold: 12400, rate: 0.12 },
      { threshold: 50400, rate: 0.22 },
      { threshold: 105700, rate: 0.24 },
      { threshold: 201775, rate: 0.32 },
      { threshold: 256225, rate: 0.35 },
      { threshold: 640600, rate: 0.37 },
    ],
    married_joint: [
      { threshold: 0, rate: 0.10 },
      { threshold: 24800, rate: 0.12 },
      { threshold: 100800, rate: 0.22 },
      { threshold: 211400, rate: 0.24 },
      { threshold: 403550, rate: 0.32 },
      { threshold: 512450, rate: 0.35 },
      { threshold: 768700, rate: 0.37 },
    ],
  },
  socialSecurity: {
    rate: 0.062,
    wageBase: 184500,
  },
  medicare: {
    rate: 0.0145,
    additionalRate: 0.009,
    additionalThreshold: {
      single: 200000,
      married_joint: 250000,
    },
  },
  selfEmployment: {
    netEarningsMultiplier: 0.9235,
  },
  qbi: {
    rate: 0.20,
    // Close to, but deliberately not identical to, the 32% bracket thresholds
    phaseInStart: {
      single: 201750,
      married_joint: 403500,
    },
    // Widened for 2026 by OBBBA §70105 (was $50k / $100k)
    phaseInLength: {
      single: 75000,
      married_joint: 150000,
    },
    minimumDeduction: 400,
    minimumDeductionQbiFloor: 1000,
  },
}

// =============================================
// Core calculations
// =============================================

/**
 * Progressive tax on an amount. Each bracket's rate applies only to the income
 * above its threshold, so this is a sum of slices — never a single rate applied
 * to the whole amount.
 */
export function progressiveTax(taxableIncome: number, brackets: TaxBracket[]): number {
  if (taxableIncome <= 0) return 0

  let tax = 0

  for (let i = 0; i < brackets.length; i += 1) {
    const { threshold, rate } = brackets[i]
    if (taxableIncome <= threshold) break

    const ceiling = i + 1 < brackets.length ? brackets[i + 1].threshold : Infinity
    const slice = Math.min(taxableIncome, ceiling) - threshold

    tax += slice * rate
  }

  return tax
}

/** The rate applying to the next dollar earned. */
export function marginalRate(taxableIncome: number, brackets: TaxBracket[]): number {
  let rate = brackets[0]?.rate ?? 0
  for (const bracket of brackets) {
    if (taxableIncome >= bracket.threshold) rate = bracket.rate
    else break
  }
  return rate
}

export function federalIncomeTax(
  grossIncome: number,
  filingStatus: FilingStatus,
  options: { deductions?: number; rates?: TaxYearRates } = {}
): number {
  const rates = options.rates ?? TAX_YEAR_2026
  const deduction = options.deductions ?? rates.standardDeduction[filingStatus]
  const taxable = Math.max(0, grossIncome - deduction)

  return progressiveTax(taxable, rates.brackets[filingStatus])
}

export type PayrollTax = {
  socialSecurity: number
  medicare: number
  additionalMedicare: number
  total: number
}

/**
 * Employee-side FICA on W-2 wages. The employer owes a matching amount for
 * Social Security and regular Medicare (not the additional Medicare surtax) —
 * for an S-corp owner, both halves come out of the same business.
 */
export function ficaOnWages(
  wages: number,
  filingStatus: FilingStatus,
  rates: TaxYearRates = TAX_YEAR_2026
): PayrollTax {
  const socialSecurity = Math.min(wages, rates.socialSecurity.wageBase) * rates.socialSecurity.rate
  const medicare = wages * rates.medicare.rate

  const threshold = rates.medicare.additionalThreshold[filingStatus]
  const additionalMedicare = Math.max(0, wages - threshold) * rates.medicare.additionalRate

  return {
    socialSecurity,
    medicare,
    additionalMedicare,
    total: socialSecurity + medicare + additionalMedicare,
  }
}

/**
 * Self-employment tax on net business earnings (sole proprietor / partnership).
 *
 * Both halves land on the taxpayer, which is precisely the cost an S-corp
 * election is meant to reduce — distributions are not subject to SE tax.
 */
export function selfEmploymentTax(
  netEarnings: number,
  filingStatus: FilingStatus,
  rates: TaxYearRates = TAX_YEAR_2026
): PayrollTax {
  if (netEarnings <= 0) {
    return { socialSecurity: 0, medicare: 0, additionalMedicare: 0, total: 0 }
  }

  const base = netEarnings * rates.selfEmployment.netEarningsMultiplier

  // Both employee and employer halves
  const socialSecurity = Math.min(base, rates.socialSecurity.wageBase) * rates.socialSecurity.rate * 2
  const medicare = base * rates.medicare.rate * 2

  const threshold = rates.medicare.additionalThreshold[filingStatus]
  const additionalMedicare = Math.max(0, base - threshold) * rates.medicare.additionalRate

  return {
    socialSecurity,
    medicare,
    additionalMedicare,
    total: socialSecurity + medicare + additionalMedicare,
  }
}

/**
 * Section 199A qualified business income deduction, simplified.
 *
 * Models the 20% deduction and its phase-out above the income threshold. Does
 * NOT model the W-2 wage and property limitations, or the specified-service
 * trade restriction — both can reduce or eliminate this in real filings.
 */
export function qbiDeduction(
  qualifiedBusinessIncome: number,
  totalTaxableIncome: number,
  filingStatus: FilingStatus,
  rates: TaxYearRates = TAX_YEAR_2026,
  options: { materiallyParticipates?: boolean } = {}
): number {
  if (qualifiedBusinessIncome <= 0) return 0

  const full = qualifiedBusinessIncome * rates.qbi.rate
  const start = rates.qbi.phaseInStart[filingStatus]
  const length = rates.qbi.phaseInLength[filingStatus]

  let deduction: number
  if (totalTaxableIncome <= start) {
    deduction = full
  } else if (totalTaxableIncome >= start + length) {
    deduction = 0
  } else {
    deduction = full * (1 - (totalTaxableIncome - start) / length)
  }

  // OBBBA added a floor for taxpayers who materially participate. An owner who
  // runs their own S-corp does; a passive investor does not.
  const materiallyParticipates = options.materiallyParticipates ?? true
  if (materiallyParticipates && qualifiedBusinessIncome >= rates.qbi.minimumDeductionQbiFloor) {
    deduction = Math.max(deduction, rates.qbi.minimumDeduction)
  }

  return deduction
}

// =============================================
// S-corp salary vs distribution
// =============================================

export type SalarySplitScenario = {
  /** W-2 wages paid to the owner-employee. */
  salary: number
  /** Profit taken as a distribution, not subject to payroll tax. */
  distribution: number
  employeeFica: number
  employerFica: number
  totalPayrollTax: number
  federalIncomeTax: number
  qbiDeduction: number
  totalTax: number
  takeHome: number
  effectiveRate: number
}

/**
 * Models one salary/distribution split of a fixed amount of business profit.
 *
 * The trade-off this exposes: a lower salary cuts payroll tax, but the IRS
 * requires "reasonable compensation" for the work performed, and lenders look
 * at documented W-2 income. The cheapest split is rarely the right one.
 */
export function modelSalarySplit(
  businessProfit: number,
  salary: number,
  filingStatus: FilingStatus,
  options: { otherIncome?: number; rates?: TaxYearRates } = {}
): SalarySplitScenario {
  const rates = options.rates ?? TAX_YEAR_2026
  const otherIncome = options.otherIncome ?? 0

  const cappedSalary = Math.min(Math.max(0, salary), businessProfit)
  const distribution = businessProfit - cappedSalary

  const employeeFica = ficaOnWages(cappedSalary, filingStatus, rates).total

  // The employer half mirrors the employee half but excludes the Medicare surtax
  const employerBreakdown = ficaOnWages(cappedSalary, filingStatus, rates)
  const employerFica = employerBreakdown.socialSecurity + employerBreakdown.medicare

  // The employer half is deductible to the business, reducing pass-through profit
  const passThroughIncome = Math.max(0, distribution - employerFica)
  const grossPersonalIncome = cappedSalary + passThroughIncome + otherIncome

  const deduction = rates.standardDeduction[filingStatus]
  const taxableBeforeQbi = Math.max(0, grossPersonalIncome - deduction)

  const qbi = qbiDeduction(passThroughIncome, taxableBeforeQbi, filingStatus, rates)
  const taxableIncome = Math.max(0, taxableBeforeQbi - qbi)

  const incomeTax = progressiveTax(taxableIncome, rates.brackets[filingStatus])
  const totalPayrollTax = employeeFica + employerFica
  const totalTax = incomeTax + totalPayrollTax

  return {
    salary: cappedSalary,
    distribution,
    employeeFica,
    employerFica,
    totalPayrollTax,
    federalIncomeTax: incomeTax,
    qbiDeduction: qbi,
    totalTax,
    takeHome: businessProfit - totalTax,
    effectiveRate: businessProfit > 0 ? totalTax / businessProfit : 0,
  }
}

/**
 * Compares salary levels across a range so the trade-off is visible rather than
 * guessed at. Returns one scenario per step.
 */
export function compareSalarySplits(
  businessProfit: number,
  filingStatus: FilingStatus,
  options: { steps?: number; otherIncome?: number; rates?: TaxYearRates } = {}
): SalarySplitScenario[] {
  const steps = options.steps ?? 10
  if (businessProfit <= 0 || steps < 1) return []

  const scenarios: SalarySplitScenario[] = []
  for (let i = 1; i <= steps; i += 1) {
    scenarios.push(
      modelSalarySplit(businessProfit, (businessProfit * i) / steps, filingStatus, options)
    )
  }
  return scenarios
}

export type ReasonablenessVerdict = 'likely_too_low' | 'defensible' | 'likely_higher_than_needed'

/**
 * A heuristic sanity check on owner salary as a share of profit.
 *
 * This is NOT a determination. The IRS standard is what a comparable role would
 * pay for the work actually performed, which depends on industry, hours, and
 * duties — none of which this sees. It exists to flag the extremes that draw
 * scrutiny, and every result should be confirmed with a CPA.
 */
export function assessSalaryReasonableness(
  salary: number,
  businessProfit: number
): { verdict: ReasonablenessVerdict; salaryShare: number } {
  const salaryShare = businessProfit > 0 ? salary / businessProfit : 0

  if (salaryShare < 0.3) return { verdict: 'likely_too_low', salaryShare }
  if (salaryShare > 0.7) return { verdict: 'likely_higher_than_needed', salaryShare }
  return { verdict: 'defensible', salaryShare }
}

// =============================================
// Mortgage qualifying income
// =============================================

export type MortgageIncomeYear = {
  year: number
  w2Wages: number
  /** Net profit reported on the K-1 for a pass-through entity. */
  k1Income: number
}

export type MortgageIncomeAssessment = {
  /** Agency guidelines treat >= 25% ownership as self-employed regardless of W-2. */
  treatedAsSelfEmployed: boolean
  monthlyQualifyingIncome: number
  yearsOfHistory: number
  /** Lenders generally want two years; fewer is a common denial reason. */
  meetsTwoYearHistory: boolean
  /** Declining income is typically averaged down or disallowed. */
  incomeDeclining: boolean
}

/**
 * Estimates the income an underwriter would credit.
 *
 * The key point most owners miss: paying yourself W-2 wages from your own
 * company does not make you a W-2 borrower. At 25% or more ownership, agency
 * guidelines classify you as self-employed and underwrite from tax returns —
 * so shifting profit between salary and distribution moves money between
 * buckets the lender already looks through.
 *
 * Estimate only. Overlays vary by lender and non-QM products differ.
 */
export function assessMortgageIncome(
  years: MortgageIncomeYear[],
  ownershipPercentage: number
): MortgageIncomeAssessment {
  const sorted = [...years].sort((a, b) => b.year - a.year)
  const recent = sorted.slice(0, 2)

  const totals = recent.map(year => year.w2Wages + year.k1Income)
  const average = totals.length > 0 ? totals.reduce((sum, value) => sum + value, 0) / totals.length : 0

  // Two years descending: index 0 is the most recent
  const declining = totals.length === 2 && totals[0] < totals[1]

  // Underwriters use the lower figure when income trends down
  const qualifying = declining ? Math.min(...totals) : average

  return {
    treatedAsSelfEmployed: ownershipPercentage >= 25,
    monthlyQualifyingIncome: qualifying / 12,
    yearsOfHistory: recent.length,
    meetsTwoYearHistory: recent.length >= 2,
    incomeDeclining: declining,
  }
}

/**
 * Debt-to-income ratio. Conventional loans commonly cap around 43-50%
 * depending on the product and compensating factors.
 */
export function debtToIncomeRatio(monthlyDebtPayments: number, monthlyQualifyingIncome: number): number {
  if (monthlyQualifyingIncome <= 0) return Infinity
  return monthlyDebtPayments / monthlyQualifyingIncome
}
