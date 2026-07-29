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
  findOwnerPayCandidates,
  getBudgetVsActual,
  getLedger,
  getTrailingActualSurplus,
  type BudgetVsActual,
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

export interface EntityView {
  income: { measured: number | null; plan: number }
  expenses: { measured: number | null; plan: number }
  surplus: {
    value: number
    basis: Basis
    monthsOfData: number
    history: Array<{ month: string; surplus: number }>
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
}

type NetWorthAccount = Pick<BankAccount, 'account_type' | 'current_balance' | 'is_excluded'>
type EntityTagged = { entity: Entity }

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

export async function getFinancialOverview(userId: string): Promise<FinancialOverview> {
  const asOf = new Date()
  const asOfDate = asOf.toISOString().split('T')[0]
  const lastCompleteMonth = addMonths(getMonthStart(asOf), -1)

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
  ] = await Promise.all([
    getBankAccounts(userId).catch(() => []),
    getIncomeSources(userId).catch(() => []),
    getRecurringExpenses(userId).catch(() => []),
    getGoals(userId).catch(() => []),
    calculateGoalProjections(userId).catch(() => EMPTY_PROJECTIONS),
    getAttentionItems(userId, asOf).catch(() => []),
    getBudgetVsActual(userId, lastCompleteMonth, 'personal').catch(() => null),
    getBudgetVsActual(userId, lastCompleteMonth, 'business').catch(() => null),
    getTrailingActualSurplus(userId, { entity: 'personal', asOf }).catch(() => null),
    getTrailingActualSurplus(userId, { entity: 'business', asOf }).catch(() => null),
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
  ])

  const personalPlan = plannedForEntity('personal', incomeSources, recurringExpenses, asOf)
  const businessPlan = plannedForEntity('business', incomeSources, recurringExpenses, asOf)
  const includeBusiness = hasBusinessData(accounts, incomeSources, goals)
  const bankNetWorth = calculateNetWorth(accounts)
  const assets = toCents(bankNetWorth.assets + investmentAssets)
  const debts = toCents(bankNetWorth.debts + liabilityDebts)

  return {
    asOf: asOfDate,
    netWorth: {
      assets,
      debts,
      net: toCents(assets - debts),
      accountCount: bankNetWorth.accountCount,
    },
    entities: {
      personal: buildEntityView(personalPlan, personalActual, personalTrailing),
      business: includeBusiness
        ? buildEntityView(businessPlan, businessActual, businessTrailing)
        : null,
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
  }
}
