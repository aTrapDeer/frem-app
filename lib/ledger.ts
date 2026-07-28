import { db } from '@/lib/turso'
import type { Entity } from '@/lib/bank-sync'
import { getMonthStart, addMonths, toCents } from '@/lib/projections'

/**
 * The unified ledger.
 *
 * Two sources of truth exist and neither is going away: synced bank
 * transactions (what actually happened) and manual entries (cash, tips,
 * anything a bank never sees). This module presents them as one stream with a
 * single sign convention, and keeps their provenance visible.
 *
 * Sign convention here: `signedAmount` is POSITIVE for money in, NEGATIVE for
 * money out. Plaid uses the opposite (positive = outflow), so the conversion
 * happens once, here, and is covered by tests. Getting it backwards inverts
 * every surplus figure in the app.
 */

export type LedgerSource = 'synced' | 'manual'

export type LedgerEntry = {
  id: string
  date: string
  description: string
  merchantName: string | null
  /** Positive = money in, negative = money out. */
  signedAmount: number
  /** Always positive; pair with `type` for the app's existing shape. */
  amount: number
  type: 'income' | 'expense'
  category: string | null
  /** Plaid's finer-grained category, e.g. RENT_AND_UTILITIES_TELEPHONE. */
  detailedCategory: string | null
  entity: Entity
  entityLabel: string | null
  source: LedgerSource
  accountId: string | null
  pending: boolean
  /** Only meaningful for synced rows; tells the UI whether to offer review. */
  classificationSource: string | null
}

export type LedgerFilters = {
  entity?: Entity
  startDate?: string
  endDate?: string
  limit?: number
}

/** Plaid reports positive for money leaving the account. */
function fromPlaidAmount(plaidAmount: number): { signedAmount: number; type: 'income' | 'expense' } {
  return {
    signedAmount: -plaidAmount,
    type: plaidAmount > 0 ? 'expense' : 'income',
  }
}

/** Manual entries store a positive amount plus an explicit direction. */
function fromManualAmount(amount: number, type: string): number {
  const magnitude = Math.abs(amount)
  return type === 'income' ? magnitude : -magnitude
}

function buildRangeClause(filters: LedgerFilters, column = 'date'): { clause: string; args: string[] } {
  const parts: string[] = []
  const args: string[] = []

  if (filters.startDate) {
    parts.push(`${column} >= ?`)
    args.push(filters.startDate)
  }
  if (filters.endDate) {
    parts.push(`${column} <= ?`)
    args.push(filters.endDate)
  }

  return { clause: parts.length > 0 ? ' AND ' + parts.join(' AND ') : '', args }
}

/**
 * Every entry for a user, synced and manual, newest first.
 *
 * Manual entries carry no entity of their own — the daily_transactions table
 * predates the personal/business split — so they are reported as personal
 * unless an entity filter excludes them.
 */
export async function getLedger(userId: string, filters: LedgerFilters = {}): Promise<LedgerEntry[]> {
  const limit = filters.limit ?? 500
  const entries: LedgerEntry[] = []

  // Synced
  const syncedRange = buildRangeClause(filters)
  let syncedSql = `SELECT id, account_id, date, name, merchant_name, amount, category,
                          provider_category, provider_category_detailed, entity, entity_label,
                          pending, classification_source
                   FROM bank_transactions WHERE user_id = ?${syncedRange.clause}`
  const syncedArgs: (string | number)[] = [userId, ...syncedRange.args]

  if (filters.entity) {
    syncedSql += ' AND entity = ?'
    syncedArgs.push(filters.entity)
  }

  syncedSql += ' ORDER BY date DESC LIMIT ?'
  syncedArgs.push(limit)

  const synced = await db.execute({ sql: syncedSql, args: syncedArgs })

  for (const row of synced.rows) {
    const record = row as Record<string, unknown>
    const { signedAmount, type } = fromPlaidAmount(Number(record.amount))

    entries.push({
      id: record.id as string,
      date: record.date as string,
      description: record.name as string,
      merchantName: (record.merchant_name as string | null) ?? null,
      signedAmount,
      amount: Math.abs(signedAmount),
      type,
      category: (record.category as string | null) ?? (record.provider_category as string | null) ?? null,
      detailedCategory: (record.provider_category_detailed as string | null) ?? null,
      entity: record.entity as Entity,
      entityLabel: (record.entity_label as string | null) ?? null,
      source: 'synced',
      accountId: (record.account_id as string | null) ?? null,
      pending: Boolean(record.pending),
      classificationSource: (record.classification_source as string | null) ?? null,
    })
  }

  // Manual — skipped entirely when filtering to business, since these rows have
  // no entity concept and defaulting them into a business view would be wrong
  if (filters.entity !== 'business') {
    const manualRange = buildRangeClause(filters, 'transaction_date')
    const manual = await db.execute({
      sql: `SELECT id, transaction_date, description, amount, type, category
            FROM daily_transactions WHERE user_id = ?${manualRange.clause}
            ORDER BY transaction_date DESC LIMIT ?`,
      args: [userId, ...manualRange.args, limit],
    })

    for (const row of manual.rows) {
      const record = row as Record<string, unknown>
      const type = String(record.type) === 'income' ? 'income' : 'expense'
      const signedAmount = fromManualAmount(Number(record.amount), type)

      entries.push({
        id: record.id as string,
        date: record.transaction_date as string,
        description: (record.description as string | null) ?? 'Manual entry',
        merchantName: null,
        signedAmount,
        amount: Math.abs(signedAmount),
        type,
        category: (record.category as string | null) ?? null,
        detailedCategory: null,
        entity: 'personal',
        entityLabel: null,
        source: 'manual',
        accountId: null,
        pending: false,
        classificationSource: null,
      })
    }
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
}

// =============================================
// Possible duplicates
// =============================================

export type DuplicatePair = {
  synced: LedgerEntry
  manual: LedgerEntry
  daysApart: number
}

/**
 * Finds manual entries that look like they duplicate a synced transaction.
 *
 * People log a purchase by hand and the bank later reports the same purchase.
 * Counting both overstates spending. This flags candidates for review rather
 * than deleting anything — an automatic merge that guesses wrong silently
 * loses data.
 */
export function findPossibleDuplicates(entries: LedgerEntry[], toleranceDays = 3): DuplicatePair[] {
  const synced = entries.filter(entry => entry.source === 'synced')
  const manual = entries.filter(entry => entry.source === 'manual')
  const pairs: DuplicatePair[] = []

  for (const manualEntry of manual) {
    for (const syncedEntry of synced) {
      if (manualEntry.type !== syncedEntry.type) continue
      // Exact amount match: near-misses produce too many false positives
      if (Math.abs(manualEntry.amount - syncedEntry.amount) > 0.01) continue

      const daysApart = Math.abs(
        (new Date(manualEntry.date).getTime() - new Date(syncedEntry.date).getTime()) / 86_400_000
      )
      if (daysApart > toleranceDays) continue

      pairs.push({ synced: syncedEntry, manual: manualEntry, daysApart: Math.round(daysApart) })
      break
    }
  }

  return pairs
}

// =============================================
// Internal transfers
// =============================================

/** Plaid categories that describe money moving, not money earned or spent. */
const TRANSFER_CATEGORIES = new Set(['TRANSFER_IN', 'TRANSFER_OUT'])

function isTransfer(entry: LedgerEntry): boolean {
  return TRANSFER_CATEGORIES.has((entry.category ?? '').toUpperCase())
}

/**
 * Identifies transfers between the user's own linked accounts.
 *
 * When both sides of a transfer are linked, the same movement appears twice —
 * leaving one account and arriving in another — so counting it inflates both
 * income and expenses and leaves the surplus meaningless.
 *
 * Only *matched* pairs are excluded. A transfer with no counterpart is money
 * genuinely entering or leaving the linked set — wages arriving from an
 * employer, or a payment out to an account that is not connected — and removing
 * those would understate real income.
 */
export function findInternalTransfers(entries: LedgerEntry[], toleranceDays = 4): Set<string> {
  const internal = new Set<string>()

  const outflows = entries.filter(entry => isTransfer(entry) && entry.type === 'expense')
  const inflows = entries.filter(entry => isTransfer(entry) && entry.type === 'income')
  const claimed = new Set<string>()

  for (const out of outflows) {
    const match = inflows.find(inflow => {
      if (claimed.has(inflow.id)) return false
      // A transfer to yourself lands in a different account
      if (inflow.accountId && out.accountId && inflow.accountId === out.accountId) return false
      if (Math.abs(inflow.amount - out.amount) > 0.01) return false

      const daysApart = Math.abs(
        (new Date(inflow.date).getTime() - new Date(out.date).getTime()) / 86_400_000
      )
      return daysApart <= toleranceDays
    })

    if (match) {
      claimed.add(match.id)
      internal.add(out.id)
      internal.add(match.id)
    }
  }

  return internal
}

// =============================================
// Budget vs actual
// =============================================

export type CategoryVariance = {
  category: string
  planned: number
  actual: number
  variance: number
  /** Positive means over budget for spending categories. */
  overBudget: boolean
}

export type BudgetVsActual = {
  month: string
  entity: Entity | 'all'
  plannedIncome: number
  actualIncome: number
  plannedExpenses: number
  actualExpenses: number
  plannedSurplus: number
  actualSurplus: number
  surplusVariance: number
  categories: CategoryVariance[]
  /** False when no synced data covers the period, so "actual" means nothing yet. */
  hasActuals: boolean
  /** Entries dropped as movement between the user's own accounts. */
  internalTransfersExcluded: number
}

/**
 * Compares the plan (recurring expenses and income sources) against what
 * actually moved through the accounts for a given month.
 *
 * The plan projects forward; actuals describe the past. Neither replaces the
 * other, which is why both are reported rather than merged.
 */
export async function getBudgetVsActual(
  userId: string,
  monthDate: Date = new Date(),
  entity?: Entity
): Promise<BudgetVsActual> {
  const start = getMonthStart(monthDate)
  const end = addMonths(start, 1)

  const startDate = start.toISOString().split('T')[0]
  const endDate = new Date(end.getTime() - 86_400_000).toISOString().split('T')[0]

  const { getRecurringExpenses, getIncomeSources } = await import('@/lib/database')
  const { isIncomeSourceActive } = await import('@/lib/freshness')

  const [expenses, sources, entries] = await Promise.all([
    getRecurringExpenses(userId).catch(() => []),
    getIncomeSources(userId).catch(() => []),
    getLedger(userId, { entity, startDate, endDate, limit: 2000 }),
  ])

  const plannedExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const plannedIncome = sources
    .filter(source => isIncomeSourceActive(source))
    .reduce((sum, source) => sum + source.estimated_monthly_mid, 0)

  // Transfers between the user's own accounts are movement, not earning or
  // spending. Counting them inflates both sides and makes surplus meaningless.
  const internalTransfers = findInternalTransfers(entries)
  const realEntries = entries.filter(entry => !internalTransfers.has(entry.id))

  const actualIncome = realEntries
    .filter(entry => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0)
  const actualExpenses = realEntries
    .filter(entry => entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0)

  // Planned figures have no category breakdown beyond the expense name, so the
  // per-category view reports actuals against the named recurring expense where
  // one matches, and 0 planned otherwise
  const actualByCategory = new Map<string, number>()
  for (const entry of realEntries) {
    if (entry.type !== 'expense') continue
    const key = entry.category ?? 'UNCATEGORIZED'
    actualByCategory.set(key, (actualByCategory.get(key) ?? 0) + entry.amount)
  }

  const categories: CategoryVariance[] = [...actualByCategory.entries()]
    .map(([category, actual]) => {
      const planned = expenses
        .filter(expense => (expense.category ?? '').toUpperCase() === category.toUpperCase())
        .reduce((sum, expense) => sum + expense.amount, 0)

      return {
        category,
        planned: toCents(planned),
        actual: toCents(actual),
        variance: toCents(actual - planned),
        overBudget: actual > planned,
      }
    })
    .sort((a, b) => b.actual - a.actual)

  const plannedSurplus = plannedIncome - plannedExpenses
  const actualSurplus = actualIncome - actualExpenses

  return {
    month: startDate.slice(0, 7),
    entity: entity ?? 'all',
    plannedIncome: toCents(plannedIncome),
    actualIncome: toCents(actualIncome),
    plannedExpenses: toCents(plannedExpenses),
    actualExpenses: toCents(actualExpenses),
    plannedSurplus: toCents(plannedSurplus),
    actualSurplus: toCents(actualSurplus),
    surplusVariance: toCents(actualSurplus - plannedSurplus),
    categories,
    hasActuals: entries.some(entry => entry.source === 'synced'),
    internalTransfersExcluded: internalTransfers.size,
  }
}

// =============================================
// Entity-scoped surplus
// =============================================

export type EntitySurplus = {
  personal: number
  business: number
  /**
   * Business surplus cannot fund a personal goal directly — it has to leave the
   * company as salary or a distribution first, which is a taxable event. Kept
   * separate so projections stop implying transfers that cannot happen.
   */
  combined: number
}

export type SurplusBasis = {
  monthlySurplus: number
  /** 'actual' once enough real months exist, otherwise the budget. */
  basis: 'actual' | 'plan'
  monthsOfData: number
  /** Per-month actual surplus, newest first, for showing the trend. */
  history: Array<{ month: string; surplus: number }>
}

/**
 * The surplus figure projections should actually plan on.
 *
 * A budget is a hypothesis; a few months of bank data is evidence. Once enough
 * complete months exist their average is used instead of the plan, because what
 * someone really cleared last quarter predicts next quarter better than what
 * they intended to clear.
 *
 * The current month is excluded — it is partial, so counting it would
 * understate income that has not landed yet.
 */
export async function getTrailingActualSurplus(
  userId: string,
  options: { months?: number; entity?: Entity; asOf?: Date } = {}
): Promise<SurplusBasis> {
  const lookback = options.months ?? 3
  const asOf = options.asOf ?? new Date()

  const history: Array<{ month: string; surplus: number }> = []

  for (let offset = 1; offset <= lookback; offset += 1) {
    const monthDate = addMonths(getMonthStart(asOf), -offset)
    const comparison = await getBudgetVsActual(userId, monthDate, options.entity)

    // A month with no synced rows is absent data, not a zero surplus
    if (!comparison.hasActuals) continue

    history.push({ month: comparison.month, surplus: comparison.actualSurplus })
  }

  if (history.length === 0) {
    const plan = await getBudgetVsActual(userId, asOf, options.entity)
    return {
      monthlySurplus: plan.plannedSurplus,
      basis: 'plan',
      monthsOfData: 0,
      history: [],
    }
  }

  const average = history.reduce((sum, entry) => sum + entry.surplus, 0) / history.length

  return {
    monthlySurplus: toCents(average),
    basis: 'actual',
    monthsOfData: history.length,
    history,
  }
}

export async function getEntitySurplus(
  userId: string,
  monthDate: Date = new Date()
): Promise<EntitySurplus> {
  const [personal, business] = await Promise.all([
    getBudgetVsActual(userId, monthDate, 'personal'),
    getBudgetVsActual(userId, monthDate, 'business'),
  ])

  // Prefer measured surplus once real data exists; fall back to the plan
  const personalSurplus = personal.hasActuals ? personal.actualSurplus : personal.plannedSurplus
  const businessSurplus = business.hasActuals ? business.actualSurplus : 0

  return {
    personal: toCents(personalSurplus),
    business: toCents(businessSurplus),
    combined: toCents(personalSurplus + businessSurplus),
  }
}
