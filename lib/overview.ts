import { getBankAccounts, type BankAccount, type Entity } from '@/lib/bank-sync'
import {
  calculateGoalProjections,
  getGoals,
  getIncomeSources,
  getRecurringExpenses,
  type Goal,
  type IncomeSource,
  type RecurringExpense,
} from '@/lib/database'
import { getAttentionItems } from '@/lib/attention'
import {
  findInternalTransfers,
  findOwnerPayCandidates,
  getBudgetVsActual,
  getLedger,
  getTrailingActualSurplus,
  type BudgetVsActual,
  type LedgerEntry,
  type SurplusBasis,
  type TransferPair,
} from '@/lib/ledger'
import { isIncomeSourceActive } from '@/lib/freshness'
import { db } from '@/lib/turso'
import {
  addMonths,
  getMonthStart,
  monthlyRequirementForGoal,
  toCents,
} from '@/lib/projections'

export type Basis = 'measured' | 'plan'

export const RANGE_DAYS = {
  '1w': 7,
  '1m': 30,
  '2m': 61,
  '3m': 91,
  '6m': 183,
  '1y': 365,
} as const

export type OverviewRange = keyof typeof RANGE_DAYS

const OVERVIEW_RANGES: OverviewRange[] = ['1w', '1m', '2m', '3m', '6m', '1y']

const RANGE_LABELS: Record<OverviewRange, string> = {
  '1w': 'past 7 days',
  '1m': 'past 1 month',
  '2m': 'past 2 months',
  '3m': 'past 3 months',
  '6m': 'past 6 months',
  '1y': 'past 1 year',
}

export interface OverviewCoverage {
  earliestTransaction: string | null
  availableRanges: OverviewRange[]
}

export interface OverviewWindow {
  range: OverviewRange
  days: number
  start: string
  end: string
  label: string
}

export interface EntityView {
  income: { measured: number | null; plan: number; windowTotal?: number }
  expenses: { measured: number | null; plan: number; windowTotal?: number }
  surplus: {
    value: number
    basis: Basis
    monthsOfData: number
    history: Array<{ month: string; surplus: number }>
    windowTotal?: number
  }
}

export interface OverviewGoal {
  id: string
  title: string
  entity: 'personal' | 'business'
  currentAmount: number
  targetAmount: number
  deadline: string
  monthlyRequired: number
  monthlyAllocated: number
  status: string
  projectedCompletionDate: string | null
}

export interface FinancialOverview {
  asOf: string
  netWorth: { assets: number; debts: number; net: number; accountCount: number }
  entities: { personal: EntityView; business: EntityView | null }
  goals: OverviewGoal[]
  ownerPay: { pendingCount: number }
  attention: Array<{
    id: string
    kind: string
    severity: string
    title: string
    detail: string
    href: string
  }>
  hasBankData: boolean
  coverage: OverviewCoverage
  window?: OverviewWindow
}

type NetWorthAccount = Pick<BankAccount, 'account_type' | 'current_balance' | 'is_excluded'>
type EntityTagged = { entity: Entity }

type WindowMeasurement = {
  income: number
  expenses: number
  hasBankData: boolean
}

function isoDateDaysAgo(today: Date, days: number): string {
  const date = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  )
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().split('T')[0]
}

export function parseOverviewRange(value: string | null | undefined): OverviewRange | null {
  return OVERVIEW_RANGES.find(range => range === value) ?? null
}

export function calculateOverviewCoverage(
  earliestTransaction: string | null,
  today: Date = new Date()
): OverviewCoverage {
  return {
    earliestTransaction,
    availableRanges: earliestTransaction
      ? OVERVIEW_RANGES.filter(
          range => earliestTransaction <= isoDateDaysAgo(today, RANGE_DAYS[range])
        )
      : [],
  }
}

export function calculateMonthlyRate(windowTotal: number, days: number): number {
  return toCents(windowTotal * 30.44 / days)
}

export function grantOverviewRange(
  requested: OverviewRange,
  availableRanges: OverviewRange[]
): OverviewRange {
  if (availableRanges.includes(requested)) return requested

  for (let index = OVERVIEW_RANGES.length - 1; index >= 0; index -= 1) {
    const range = OVERVIEW_RANGES[index]
    if (availableRanges.includes(range)) return range
  }

  return '1w'
}

export function buildOverviewWindow(
  range: OverviewRange,
  today: Date = new Date()
): OverviewWindow {
  const days = RANGE_DAYS[range]

  return {
    range,
    days,
    start: isoDateDaysAgo(today, days - 1),
    end: isoDateDaysAgo(today, 0),
    label: RANGE_LABELS[range],
  }
}

export function calculateNetWorth(
  accounts: NetWorthAccount[]
): FinancialOverview['netWorth'] {
  let assets = 0
  let debts = 0
  let accountCount = 0

  for (const account of accounts) {
    if (account.is_excluded) continue

    accountCount += 1
    if (account.account_type === 'credit' || account.account_type === 'loan') {
      debts += Math.abs(account.current_balance)
    } else {
      assets += account.current_balance
    }
  }

  return {
    assets: toCents(assets),
    debts: toCents(debts),
    net: toCents(assets - debts),
    accountCount,
  }
}

export function hasBusinessData(
  accounts: EntityTagged[],
  incomeSources: EntityTagged[],
  goals: EntityTagged[]
): boolean {
  return [...accounts, ...incomeSources, ...goals].some(item => item.entity === 'business')
}

export function mapSurplus(
  trailing: SurplusBasis | null,
  plannedSurplus: number
): EntityView['surplus'] {
  const hasMeasuredSurplus = trailing?.basis === 'actual'

  return {
    value: toCents(hasMeasuredSurplus ? trailing.monthlySurplus : plannedSurplus),
    basis: hasMeasuredSurplus ? 'measured' : 'plan',
    monthsOfData: hasMeasuredSurplus ? trailing.monthsOfData : 0,
    history: hasMeasuredSurplus
      ? trailing.history.map(item => ({ month: item.month, surplus: toCents(item.surplus) }))
      : [],
  }
}

export function countPendingOwnerPay(
  candidates: TransferPair[],
  confirmedTransactionIds: Set<string>
): number {
  return candidates.filter(
    candidate =>
      !confirmedTransactionIds.has(candidate.outflow.id) &&
      !confirmedTransactionIds.has(candidate.inflow.id)
  ).length
}

function plannedForEntity(
  entity: Entity,
  incomeSources: IncomeSource[],
  recurringExpenses: RecurringExpense[],
  asOf: Date
): { income: number; expenses: number } {
  const income = incomeSources
    .filter(source => source.entity === entity && isIncomeSourceActive(source, asOf))
    .reduce((sum, source) => sum + source.estimated_monthly_mid, 0)
  const expenses = recurringExpenses
    .filter(expense => expense.entity === entity)
    .reduce((sum, expense) => sum + expense.amount, 0)

  return { income: toCents(income), expenses: toCents(expenses) }
}

function buildEntityView(
  plan: { income: number; expenses: number },
  actual: BudgetVsActual | null,
  trailing: SurplusBasis | null
): EntityView {
  return {
    income: {
      measured: actual?.hasActuals ? toCents(actual.actualIncome) : null,
      plan: toCents(plan.income),
    },
    expenses: {
      measured: actual?.hasActuals ? toCents(actual.actualExpenses) : null,
      plan: toCents(plan.expenses),
    },
    surplus: mapSurplus(trailing, plan.income - plan.expenses),
  }
}

function measureWindow(entries: LedgerEntry[], entity: Entity): WindowMeasurement {
  const scopedEntries = entries.filter(entry => entry.entity === entity)
  const internalTransfers = findInternalTransfers(scopedEntries)
  const measuredEntries = scopedEntries.filter(entry => !internalTransfers.has(entry.id))

  return {
    income: toCents(
      measuredEntries
        .filter(entry => entry.type === 'income')
        .reduce((sum, entry) => sum + entry.amount, 0)
    ),
    expenses: toCents(
      measuredEntries
        .filter(entry => entry.type === 'expense')
        .reduce((sum, entry) => sum + entry.amount, 0)
    ),
    hasBankData: scopedEntries.some(entry => entry.source === 'synced'),
  }
}

function buildWindowEntityView(
  plan: { income: number; expenses: number },
  measurement: WindowMeasurement,
  window: OverviewWindow
): EntityView {
  const measuredIncome = calculateMonthlyRate(measurement.income, window.days)
  const measuredExpenses = calculateMonthlyRate(measurement.expenses, window.days)

  return {
    income: {
      measured: measurement.hasBankData ? measuredIncome : null,
      plan: toCents(plan.income),
      windowTotal: measurement.income,
    },
    expenses: {
      measured: measurement.hasBankData ? measuredExpenses : null,
      plan: toCents(plan.expenses),
      windowTotal: measurement.expenses,
    },
    surplus: {
      value: measurement.hasBankData
        ? toCents(measuredIncome - measuredExpenses)
        : toCents(plan.income - plan.expenses),
      basis: measurement.hasBankData ? 'measured' : 'plan',
      monthsOfData: Math.round((window.days / 30.44) * 10) / 10,
      history: [],
      windowTotal: toCents(measurement.income - measurement.expenses),
    },
  }
}

function ownerPayStartDate(asOf: Date): string {
  const start = new Date(asOf)
  start.setFullYear(start.getFullYear() - 1)
  return start.toISOString().split('T')[0]
}

function mapGoals(
  goals: Goal[],
  projections: Awaited<ReturnType<typeof calculateGoalProjections>>,
  asOf: Date
): OverviewGoal[] {
  const projectionByGoal = new Map(projections.goals.map(projection => [projection.goalId, projection]))

  return goals
    .filter(goal => goal.status === 'active')
    .map(goal => {
      const projection = projectionByGoal.get(goal.id)

      return {
        id: goal.id,
        title: goal.title,
        entity: goal.entity,
        currentAmount: toCents(goal.current_amount),
        targetAmount: toCents(goal.target_amount),
        deadline: goal.deadline,
        monthlyRequired: toCents(monthlyRequirementForGoal(goal, asOf)),
        monthlyAllocated: toCents(projection?.monthlyAllocation ?? 0),
        status: projection?.status ?? goal.status,
        projectedCompletionDate: projection?.projectedCompletionDate ?? null,
      }
    })
}

const EMPTY_PROJECTIONS: Awaited<ReturnType<typeof calculateGoalProjections>> = {
  goals: [],
  totalMonthlyIncome: 0,
  totalMonthlyExpenses: 0,
  monthlySurplus: 0,
  surplusAllocatedToGoals: 0,
  bankReserve: 0,
  hasVariableIncome: false,
}

async function getEarliestBankTransaction(userId: string): Promise<string | null> {
  const result = await db.execute({
    sql: `SELECT MIN(date) AS earliest_transaction
          FROM bank_transactions
          WHERE user_id = ?`,
    args: [userId],
  })
  const row = result.rows[0] as Record<string, unknown> | undefined
  const earliestTransaction = row?.earliest_transaction

  return earliestTransaction == null ? null : String(earliestTransaction)
}

export async function getFinancialOverview(
  userId: string,
  requestedRange?: OverviewRange
): Promise<FinancialOverview> {
  const asOf = new Date()
  const asOfDate = asOf.toISOString().split('T')[0]
  const lastCompleteMonth = addMonths(getMonthStart(asOf), -1)
  const earliestTransaction = await getEarliestBankTransaction(userId).catch(() => null)
  const coverage = calculateOverviewCoverage(earliestTransaction, asOf)
  const grantedRange = requestedRange
    ? grantOverviewRange(requestedRange, coverage.availableRanges)
    : null
  const window = grantedRange ? buildOverviewWindow(grantedRange, asOf) : null

  const [
    accounts,
    incomeSources,
    recurringExpenses,
    goals,
    projections,
    attention,
    personalActual,
    businessActual,
    personalTrailing,
    businessTrailing,
    ownerPayEntries,
    confirmedOwnerPayIds,
    investmentAssets,
    liabilityDebts,
    windowEntries,
  ] = await Promise.all([
    getBankAccounts(userId).catch(() => []),
    getIncomeSources(userId).catch(() => []),
    getRecurringExpenses(userId).catch(() => []),
    getGoals(userId).catch(() => []),
    calculateGoalProjections(userId).catch(() => EMPTY_PROJECTIONS),
    getAttentionItems(userId, asOf).catch(() => []),
    window
      ? Promise.resolve(null)
      : getBudgetVsActual(userId, lastCompleteMonth, 'personal').catch(() => null),
    window
      ? Promise.resolve(null)
      : getBudgetVsActual(userId, lastCompleteMonth, 'business').catch(() => null),
    window
      ? Promise.resolve(null)
      : getTrailingActualSurplus(userId, { entity: 'personal', asOf }).catch(() => null),
    window
      ? Promise.resolve(null)
      : getTrailingActualSurplus(userId, { entity: 'business', asOf }).catch(() => null),
    getLedger(userId, {
      startDate: ownerPayStartDate(asOf),
      endDate: asOfDate,
      limit: 10_000,
    }).catch(() => []),
    db
      .execute({
        sql: `SELECT id FROM bank_transactions
              WHERE user_id = ? AND owner_pay_type IN ('salary', 'distribution')`,
        args: [userId],
      })
      .then(result =>
        new Set(result.rows.map(row => String((row as Record<string, unknown>).id)))
      )
      .catch(() => new Set<string>()),
    db
      .execute({
        sql: 'SELECT COALESCE(SUM(balance), 0) AS total FROM investment_accounts WHERE user_id = ?',
        args: [userId],
      })
      .then(result =>
        Number((result.rows[0] as Record<string, unknown> | undefined)?.total ?? 0)
      )
      .catch(() => 0),
    db
      .execute({
        sql: 'SELECT COALESCE(SUM(balance), 0) AS total FROM liabilities WHERE user_id = ?',
        args: [userId],
      })
      .then(result =>
        Number((result.rows[0] as Record<string, unknown> | undefined)?.total ?? 0)
      )
      .catch(() => 0),
    window
      ? getLedger(userId, {
          startDate: window.start,
          endDate: window.end,
          limit: 100_000,
        }).catch(() => [])
      : Promise.resolve([]),
  ])

  const personalPlan = plannedForEntity('personal', incomeSources, recurringExpenses, asOf)
  const businessPlan = plannedForEntity('business', incomeSources, recurringExpenses, asOf)
  const includeBusiness = hasBusinessData(accounts, incomeSources, goals)
  const bankNetWorth = calculateNetWorth(accounts)
  const assets = toCents(bankNetWorth.assets + investmentAssets)
  const debts = toCents(bankNetWorth.debts + liabilityDebts)
  const personalView = window
    ? buildWindowEntityView(personalPlan, measureWindow(windowEntries, 'personal'), window)
    : buildEntityView(personalPlan, personalActual, personalTrailing)
  const businessView = includeBusiness
    ? window
      ? buildWindowEntityView(businessPlan, measureWindow(windowEntries, 'business'), window)
      : buildEntityView(businessPlan, businessActual, businessTrailing)
    : null

  return {
    asOf: asOfDate,
    netWorth: {
      assets,
      debts,
      net: toCents(assets - debts),
      accountCount: bankNetWorth.accountCount,
    },
    entities: {
      personal: personalView,
      business: businessView,
    },
    goals: mapGoals(goals, projections, asOf),
    ownerPay: {
      pendingCount: countPendingOwnerPay(
        findOwnerPayCandidates(ownerPayEntries),
        confirmedOwnerPayIds
      ),
    },
    attention: attention.map(item => ({
      id: item.id,
      kind: item.kind,
      severity: item.severity,
      title: item.title,
      detail: item.detail,
      href: item.href,
    })),
    hasBankData: accounts.length > 0,
    coverage,
    ...(window ? { window } : {}),
  }
}
