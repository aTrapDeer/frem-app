import { getBusinessProfile } from './business-profile'
import {
  calculateGoalProjections,
  getGoals,
  type Goal,
  type GoalProjection,
  type ProjectionSummary,
} from './database'
import { getTrailingActualSurplus, type SurplusBasis } from './ledger'
import {
  addMonths,
  getMonthStart,
  monthlyRequirementForGoal,
  monthsUntil,
  toCents,
} from './projections'
import { RISK_PROFILE_RATES } from './setup'
import { db } from './turso'
import type { FinancialOverview } from './overview'

export type GoalMomentum = {
  goalId: string
  monthlyRequired: number
  monthlyAllocated: number
  monthsAheadOrBehind: number
  fundingStreak: number
  fundedMonths: boolean[]
}

type GoalFundingDecision = {
  surplus: number
  monthlyAllocated: number
  monthlyRequired: number
}

export function isFundedMonth({
  surplus,
  monthlyAllocated,
  monthlyRequired,
}: GoalFundingDecision): boolean {
  const threshold = monthlyAllocated > 0 ? monthlyAllocated : monthlyRequired
  return surplus >= threshold
}

export function countFundingStreak(fundedMonths: boolean[]): number {
  let streak = 0

  for (let index = fundedMonths.length - 1; index >= 0; index -= 1) {
    if (!fundedMonths[index]) break
    streak += 1
  }

  return streak
}

export function roundMonthsAheadOrBehind(daysAheadOrBehind: number): number {
  const rounded = Math.round(daysAheadOrBehind / 30)
  return Object.is(rounded, -0) ? 0 : rounded
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function completeMonthKeys(asOf: Date, count: number): string[] {
  const currentMonth = getMonthStart(asOf)

  return Array.from({ length: count }, (_, index) =>
    monthKey(addMonths(currentMonth, index - count))
  )
}

function fundedMonthsForGoal(
  history: SurplusBasis['history'],
  monthlyAllocated: number,
  monthlyRequired: number,
  asOf: Date
): boolean[] {
  const surplusByMonth = new Map(history.map(entry => [entry.month, entry.surplus]))

  return completeMonthKeys(asOf, 6).map(month => {
    const surplus = surplusByMonth.get(month)
    if (surplus === undefined) return false

    return isFundedMonth({ surplus, monthlyAllocated, monthlyRequired })
  })
}

const EMPTY_PROJECTIONS: ProjectionSummary = {
  goals: [],
  totalMonthlyIncome: 0,
  totalMonthlyExpenses: 0,
  monthlySurplus: 0,
  surplusAllocatedToGoals: 0,
  bankReserve: 0,
  hasVariableIncome: false,
}

const EMPTY_SURPLUS: SurplusBasis = {
  monthlySurplus: 0,
  basis: 'plan',
  monthsOfData: 0,
  history: [],
}

/**
 * Funding streak v1 is an approximation. No balance-history table exists, so
 * per-goal receipts are not measurable yet. A month counts when that month's
 * measured entity surplus could cover the goal's current allocation (or its
 * required amount when allocation is zero): it measures whether the money to
 * fund the plan actually existed, not whether it reached the goal account.
 */
export async function getGoalMomentum(
  userId: string,
  asOf: Date = new Date()
): Promise<GoalMomentum[]> {
  const [goals, projections, personalSurplus, businessSurplus] = await Promise.all([
    getGoals(userId).catch(() => []),
    calculateGoalProjections(userId).catch(() => EMPTY_PROJECTIONS),
    getTrailingActualSurplus(userId, {
      entity: 'personal',
      months: 6,
      asOf,
    }).catch(() => EMPTY_SURPLUS),
    getTrailingActualSurplus(userId, {
      entity: 'business',
      months: 6,
      asOf,
    }).catch(() => EMPTY_SURPLUS),
  ])

  const projectionByGoal = new Map(
    projections.goals.map(projection => [projection.goalId, projection])
  )

  return goals
    .filter(goal => goal.status === 'active')
    .map(goal => {
      const projection = projectionByGoal.get(goal.id)
      const monthlyRequired = toCents(monthlyRequirementForGoal(goal, asOf))
      const monthlyAllocated = toCents(projection?.monthlyAllocation ?? 0)
      const fundedMonths = fundedMonthsForGoal(
        goal.entity === 'business' ? businessSurplus.history : personalSurplus.history,
        monthlyAllocated,
        monthlyRequired,
        asOf
      )

      return {
        goalId: goal.id,
        monthlyRequired,
        monthlyAllocated,
        monthsAheadOrBehind: roundMonthsAheadOrBehind(
          projection?.daysAheadOrBehind ?? 0
        ),
        fundingStreak: countFundingStreak(fundedMonths),
        fundedMonths,
      }
    })
}

type BriefSurplus = {
  value: number | null
  monthsOfData: number
  measured: boolean
}

export type GoalBriefInput = {
  goal: {
    title: string
    category: string
    entity: 'personal' | 'business'
    currentAmount: number
    targetAmount: number
    deadline: string
    monthsRemaining: number
    status: string
    monthlyRequired: number
    monthlyAllocated: number
    monthsAheadOrBehind: number
  }
  linkedAccount: {
    kind: 'bank' | 'investment'
    allocationPercent: number
    annualGrowthRate: number | null
    /** Accepted from callers but intentionally never rendered. */
    label?: string | null
  } | null
  context: {
    personalSurplus: BriefSurplus
    businessSurplus: BriefSurplus | null
    ownerPayPendingCount: number | null
    filingStatus: string | null
    taxState: string | null
    businessType: string | null
    ownershipPercentage: number | null
    investmentAccounts: { count: number; total: number }
    liabilities: { count: number; total: number }
  }
}

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

function formatMoney(value: number): string {
  return moneyFormatter.format(toCents(value))
}

function readable(value: string): string {
  return value.replaceAll('_', ' ')
}

function formatPercent(value: number): string {
  return Number.isInteger(value) ? String(value) : String(toCents(value))
}

function describeSurplus(label: string, surplus: BriefSurplus): string {
  if (surplus.measured && surplus.value !== null) {
    const monthLabel = surplus.monthsOfData === 1 ? 'month' : 'months'
    return `- measured ${label} surplus: ${formatMoney(surplus.value)}/month (${surplus.monthsOfData} complete ${monthLabel})`
  }

  const planned = surplus.value === null
    ? ''
    : `; current plan surplus: ${formatMoney(surplus.value)}/month`
  return `- measured ${label} surplus: unavailable (0 complete months)${planned}`
}

function describeMomentum(months: number): string {
  if (months > 0) return `${months} months ahead`
  if (months < 0) return `${Math.abs(months)} months behind`
  return 'on the projected schedule'
}

function describeFunding(linkedAccount: GoalBriefInput['linkedAccount']): string {
  if (!linkedAccount) return '- linked account: none'

  const article = linkedAccount.kind === 'investment' ? 'an' : 'a'
  const share = `${formatPercent(linkedAccount.allocationPercent)}% of ${article} ${linkedAccount.kind} account`
  if (linkedAccount.kind !== 'investment' || linkedAccount.annualGrowthRate === null) {
    return `- linked account: ${share}`
  }

  return `- linked account: ${share} (~${formatPercent(linkedAccount.annualGrowthRate)}%/yr)`
}

export function buildGoalBriefText(input: GoalBriefInput): string {
  const { goal, context } = input
  const lines = [
    'goal:',
    `- title: ${goal.title}`,
    `- category: ${readable(goal.category)}; entity: ${goal.entity}`,
    `- progress: ${formatMoney(goal.currentAmount)} of ${formatMoney(goal.targetAmount)}`,
    `- deadline: ${goal.deadline}; months remaining: ${goal.monthsRemaining}`,
    `- status: ${readable(goal.status)}`,
    `- monthly required vs allocated: ${formatMoney(goal.monthlyRequired)} vs ${formatMoney(goal.monthlyAllocated)}`,
    `- momentum: ${describeMomentum(goal.monthsAheadOrBehind)}`,
    'funding:',
    describeFunding(input.linkedAccount),
    'context:',
    describeSurplus('personal', context.personalSurplus),
  ]

  if (context.businessSurplus) {
    lines.push(describeSurplus('business', context.businessSurplus))
  }

  lines.push(
    `- owner-pay items pending review: ${context.ownerPayPendingCount ?? 'unavailable'}`
  )

  if (context.filingStatus || context.taxState) {
    lines.push(
      `- tax profile: filing status ${context.filingStatus ? readable(context.filingStatus) : 'not set'}; state ${context.taxState ?? 'not set'}`
    )
  }

  if (context.businessType || context.ownershipPercentage !== null) {
    const ownership = context.ownershipPercentage === null
      ? 'ownership not set'
      : `${formatPercent(context.ownershipPercentage)}% ownership`
    lines.push(
      `- business profile: ${context.businessType ? readable(context.businessType) : 'type not set'}; ${ownership}`
    )
  }

  lines.push(
    `- investment accounts: ${context.investmentAccounts.count}, totaling ${formatMoney(context.investmentAccounts.total)}`,
    `- liabilities: ${context.liabilities.count}, totaling ${formatMoney(context.liabilities.total)}`,
    'ask:',
    'Lay out the realistic levers to reach this goal sooner: funding changes, vehicle choices to educate on (explain trade-offs, do not recommend products), timeline adjustments, and earning-side options. Use the numbers above. End by noting decisions belong with a licensed professional.'
  )

  return lines.join('\n')
}

type Aggregate = {
  count: number
  total: number
}

function aggregateFromRow(row: Record<string, unknown> | undefined): Aggregate {
  return {
    count: Number(row?.count ?? 0),
    total: toCents(Number(row?.total ?? 0)),
  }
}

async function getSettingsContext(userId: string): Promise<{
  filingStatus: string | null
  taxState: string | null
}> {
  const result = await db.execute({
    sql: `SELECT filing_status, tax_state
          FROM user_settings
          WHERE user_id = ?
          LIMIT 1`,
    args: [userId],
  })
  const row = result.rows[0] as Record<string, unknown> | undefined

  return {
    filingStatus: typeof row?.filing_status === 'string' ? row.filing_status : null,
    taxState: typeof row?.tax_state === 'string' ? row.tax_state : null,
  }
}

async function getAggregate(
  table: 'investment_accounts' | 'liabilities',
  userId: string
): Promise<Aggregate> {
  const result = await db.execute({
    sql: `SELECT COUNT(*) AS count, COALESCE(SUM(balance), 0) AS total
          FROM ${table}
          WHERE user_id = ?`,
    args: [userId],
  })

  return aggregateFromRow(result.rows[0] as Record<string, unknown> | undefined)
}

async function getInvestmentGrowthRate(userId: string, goal: Goal): Promise<number | null> {
  if (
    goal.linked_account_kind !== 'investment' ||
    goal.linked_account_id === null
  ) {
    return null
  }

  const result = await db.execute({
    sql: `SELECT risk_profile
          FROM investment_accounts
          WHERE id = ? AND user_id = ?
          LIMIT 1`,
    args: [goal.linked_account_id, userId],
  })
  const riskProfile = (result.rows[0] as Record<string, unknown> | undefined)?.risk_profile

  if (
    typeof riskProfile !== 'string' ||
    !(riskProfile in RISK_PROFILE_RATES)
  ) {
    return null
  }

  return RISK_PROFILE_RATES[riskProfile as keyof typeof RISK_PROFILE_RATES]
}

function surplusFromOverview(
  overview: FinancialOverview | null,
  entity: 'personal' | 'business'
): BriefSurplus | null {
  const view = overview?.entities[entity]
  if (!view) return entity === 'personal'
    ? { value: null, monthsOfData: 0, measured: false }
    : null

  return {
    value: view.surplus.value,
    monthsOfData: view.surplus.monthsOfData,
    measured: view.surplus.basis === 'measured',
  }
}

export async function buildGoalBrief(
  userId: string,
  goalId: string
): Promise<{ title: string; brief: string } | null> {
  const goals = await getGoals(userId, true).catch(() => [])
  const goal = goals.find(candidate => candidate.id === goalId)
  if (!goal) return null

  const [
    projections,
    overview,
    settings,
    businessProfile,
    investmentAccounts,
    liabilities,
    investmentGrowthRate,
  ] = await Promise.all([
    calculateGoalProjections(userId).catch(() => EMPTY_PROJECTIONS),
    import('./overview')
      .then(module => module.getFinancialOverview(userId))
      .catch(() => null),
    getSettingsContext(userId).catch(() => ({
      filingStatus: null,
      taxState: null,
    })),
    getBusinessProfile(userId).catch(() => null),
    getAggregate('investment_accounts', userId).catch(() => ({ count: 0, total: 0 })),
    getAggregate('liabilities', userId).catch(() => ({ count: 0, total: 0 })),
    getInvestmentGrowthRate(userId, goal).catch(() => null),
  ])

  const projection: GoalProjection | undefined = projections.goals.find(
    candidate => candidate.goalId === goal.id
  )
  const businessExists = overview?.entities.business != null || businessProfile !== null
  const personalSurplus = surplusFromOverview(overview, 'personal') ?? {
    value: null,
    monthsOfData: 0,
    measured: false,
  }

  const brief = buildGoalBriefText({
    goal: {
      title: goal.title,
      category: goal.category,
      entity: goal.entity,
      currentAmount: projection?.currentAmount ?? goal.current_amount,
      targetAmount: projection?.targetAmount ?? goal.target_amount,
      deadline: goal.deadline,
      monthsRemaining: monthsUntil(goal.deadline),
      status: projection?.status ?? goal.status,
      monthlyRequired: toCents(monthlyRequirementForGoal(goal)),
      monthlyAllocated: projection?.monthlyAllocation ?? 0,
      monthsAheadOrBehind: roundMonthsAheadOrBehind(
        projection?.daysAheadOrBehind ?? 0
      ),
    },
    linkedAccount: goal.linked_account_kind
      ? {
          kind: goal.linked_account_kind,
          allocationPercent: goal.allocation_percent ?? 100,
          annualGrowthRate: investmentGrowthRate,
        }
      : null,
    context: {
      personalSurplus,
      businessSurplus: businessExists
        ? surplusFromOverview(overview, 'business') ?? {
            value: null,
            monthsOfData: 0,
            measured: false,
          }
        : null,
      ownerPayPendingCount: overview?.ownerPay.pendingCount ?? null,
      filingStatus: settings.filingStatus,
      taxState: settings.taxState,
      businessType: businessProfile?.business_type ?? null,
      ownershipPercentage: businessProfile?.ownership_percentage ?? null,
      investmentAccounts,
      liabilities,
    },
  })

  return { title: goal.title, brief }
}
