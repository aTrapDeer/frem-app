import { db, generateUUID, getCurrentTimestamp } from '@/lib/turso'
import { getMonthStart, addMonths, toCents } from '@/lib/projections'
import { excludeHouseholdMovement, findInternalTransfers, getLedger } from '@/lib/ledger'
import type { Entity } from '@/lib/bank-sync'

/**
 * Hierarchical budgets.
 *
 * Two kinds of budget coexist because two kinds of spending exist:
 *
 *   Named items    "Rent $750", "Netflix $15" — a specific, predictable charge
 *   Category caps  "$300 on groceries"        — spread across many merchants
 *
 * Neither replaces the other. Rent is an item; groceries is a cap. A category
 * shows its named items as branches, plus everything that hit the category
 * without a matching item, so the difference between "what I planned for" and
 * "what actually happened" is visible at both levels.
 */

export type BudgetItem = {
  id: string
  name: string
  planned: number
  actual: number
  variance: number
  /** True for rows derived from actuals with no matching planned item. */
  unplanned: boolean
}

export type BudgetCategory = {
  category: string
  label: string
  /** Explicit cap if set, otherwise the sum of its named items. */
  planned: number
  actual: number
  variance: number
  overBudget: boolean
  /** Where the planned figure came from, so the UI can explain itself. */
  plannedSource: 'category_cap' | 'items' | 'none'
  items: BudgetItem[]
}

export type BudgetTree = {
  month: string
  entity: Entity | 'all'
  totalPlanned: number
  totalActual: number
  totalVariance: number
  categories: BudgetCategory[]
  hasActuals: boolean
  /** Days of the month covered so far; a partial month is not a full one. */
  daysElapsed: number
  daysInMonth: number
}

/** Plaid categories arrive as RENT_AND_UTILITIES; recurring expenses as 'housing'. */
export function normalizeCategory(value: string | null | undefined): string {
  if (!value) return 'uncategorized'
  return value.toLowerCase().replace(/[\s>]+/g, '_').replace(/_+/g, '_').trim()
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food & Dining',
  groceries: 'Groceries',
  owner_pay: 'Owner pay',
}

export function categoryLabel(value: string): string {
  if (CATEGORY_LABELS[value]) return CATEGORY_LABELS[value]

  return value
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Maps Plaid's taxonomy onto the app's recurring-expense categories.
 *
 * Without this the same spending appears under two different names — a rent
 * payment as RENT_AND_UTILITIES from the bank and as 'housing' from the budget
 * — and the two never line up.
 */
const PLAID_TO_APP: Record<string, string> = {
  rent_and_utilities: 'housing',
  food_and_drink: 'food',
  transportation: 'transportation',
  travel: 'transportation',
  medical: 'health',
  entertainment: 'entertainment',
  general_services: 'subscriptions',
  personal_care: 'other',
  general_merchandise: 'other',
  home_improvement: 'housing',
  loan_payments: 'other',
  bank_fees: 'other',
  transfer_in: 'other',
  transfer_out: 'other',
  income: 'other',
}

/**
 * Plaid's DETAILED taxonomy, which splits what the primary one merges.
 *
 * RENT_AND_UTILITIES covers both rent and every utility bill. Mapping the
 * primary category alone sent phone, internet and gas bills into Housing,
 * leaving a Utilities budget showing zero spending and reporting itself as
 * comfortably under budget — the opposite of the truth.
 */
const PLAID_DETAILED_TO_APP: Record<string, string> = {
  // Groceries are a planned staple; dining out is discretionary. Plaid's
  // primary category merges them, which made a grocery budget impossible.
  food_and_drink_groceries: 'groceries',
  rent_and_utilities_rent: 'housing',
  rent_and_utilities_telephone: 'utilities',
  rent_and_utilities_internet_and_cable: 'utilities',
  rent_and_utilities_gas_and_electricity: 'utilities',
  rent_and_utilities_water: 'utilities',
  rent_and_utilities_sewage_and_waste_management: 'utilities',
  rent_and_utilities_other_utilities: 'utilities',
}

/** Categories that describe money moving rather than being spent. */
function isMovement(category: string | null): boolean {
  const key = normalizeCategory(category)
  return key === 'transfer_out' || key === 'transfer_in'
}

export function toAppCategory(value: string | null | undefined, detailed?: string | null): string {
  // The finer category wins when it resolves; it is strictly more informative
  const detailedKey = normalizeCategory(detailed)
  if (PLAID_DETAILED_TO_APP[detailedKey]) return PLAID_DETAILED_TO_APP[detailedKey]

  const normalized = normalizeCategory(value)
  return PLAID_TO_APP[normalized] ?? normalized
}

// =============================================
// Category caps
// =============================================

export type SpendingEstimate = {
  id: string
  category: string
  monthlyEstimate: number
  entity: Entity
}

export async function getCategoryCaps(userId: string, entity?: Entity): Promise<SpendingEstimate[]> {
  let sql = 'SELECT id, category, monthly_estimate, entity FROM spending_estimates WHERE user_id = ?'
  const args: string[] = [userId]

  if (entity) {
    sql += ' AND entity = ?'
    args.push(entity)
  }

  const result = await db.execute({ sql, args })

  return result.rows.map(row => {
    const record = row as Record<string, unknown>
    return {
      id: record.id as string,
      category: record.category as string,
      monthlyEstimate: Number(record.monthly_estimate),
      entity: record.entity as Entity,
    }
  })
}

export async function setCategoryCap(
  userId: string,
  category: string,
  monthlyEstimate: number,
  entity: Entity = 'personal'
): Promise<void> {
  const now = getCurrentTimestamp()

  await db.execute({
    sql: `INSERT INTO spending_estimates (id, user_id, category, monthly_estimate, entity, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (user_id, category, entity) DO UPDATE SET
            monthly_estimate = excluded.monthly_estimate,
            updated_at = excluded.updated_at`,
    args: [generateUUID(), userId, normalizeCategory(category), monthlyEstimate, entity, now, now],
  })
}

export async function deleteCategoryCap(userId: string, category: string, entity: Entity = 'personal'): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM spending_estimates WHERE user_id = ? AND category = ? AND entity = ?',
    args: [userId, normalizeCategory(category), entity],
  })
}

// =============================================
// The tree
// =============================================

/**
 * Builds the category → item tree for a month, with actuals attached at both
 * levels.
 *
 * Matching is deliberately conservative: an actual is attributed to a named
 * item only when the descriptions clearly correspond. Everything else rolls up
 * to the category as unplanned, which is honest — better to show $85 of
 * unexplained subscription spend than to silently attribute it to Netflix.
 */
export async function getBudgetTree(
  userId: string,
  monthDate: Date = new Date(),
  entity?: Entity
): Promise<BudgetTree> {
  const start = getMonthStart(monthDate)
  const end = addMonths(start, 1)
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  const startDate = start.toISOString().split('T')[0]
  const endDate = new Date(end.getTime() - 86_400_000).toISOString().split('T')[0]

  const { getRecurringExpenses } = await import('@/lib/database')

  const [expenses, caps, entries] = await Promise.all([
    getRecurringExpenses(userId).catch(() => []),
    getCategoryCaps(userId, entity).catch(() => []),
    getLedger(userId, { entity, startDate, endDate, limit: 2000 }),
  ])

  // Moving money between your own accounts is not spending. Without this a
  // transfer to savings appears as a budget overrun.
  const internal = findInternalTransfers(entries)
  // Household view: owner pay is pocket-to-pocket movement, not a spend category
  const visible = entity
    ? entries
    : excludeHouseholdMovement(entries)
  const spend = visible.filter(
    entry => entry.type === 'expense' && !internal.has(entry.id) && !isMovement(entry.category)
  )
  const hasActuals = entries.some(entry => entry.source === 'synced')

  const scopedExpenses = entity
    ? expenses.filter(expense => (expense.entity ?? 'personal') === entity)
    : expenses

  // Group everything by the app's category vocabulary
  const categories = new Map<string, BudgetCategory>()

  const ensure = (key: string): BudgetCategory => {
    const existing = categories.get(key)
    if (existing) return existing

    const created: BudgetCategory = {
      category: key,
      label: categoryLabel(key),
      planned: 0,
      actual: 0,
      variance: 0,
      overBudget: false,
      plannedSource: 'none',
      items: [],
    }
    categories.set(key, created)
    return created
  }

  // Named items form the branches
  for (const expense of scopedExpenses) {
    const node = ensure(normalizeCategory(expense.category))
    node.items.push({
      id: expense.id,
      name: expense.name,
      planned: expense.amount,
      actual: 0,
      variance: -expense.amount,
      unplanned: false,
    })
  }

  // Actuals attach to an item when the names correspond, otherwise to the category
  for (const entry of spend) {
    const node = ensure(toAppCategory(entry.category, entry.detailedCategory))
    const haystack = `${entry.merchantName ?? ''} ${entry.description}`.toLowerCase()

    const matched = node.items.find(
      item => !item.unplanned && item.name.length > 2 && haystack.includes(item.name.toLowerCase())
    )

    if (matched) {
      matched.actual = toCents(matched.actual + entry.amount)
      matched.variance = toCents(matched.actual - matched.planned)
    } else {
      const bucket = node.items.find(item => item.unplanned)
      if (bucket) {
        bucket.actual = toCents(bucket.actual + entry.amount)
        bucket.variance = bucket.actual
      } else {
        node.items.push({
          id: `${node.category}-unplanned`,
          name: 'Other spending',
          planned: 0,
          actual: toCents(entry.amount),
          variance: toCents(entry.amount),
          unplanned: true,
        })
      }
    }
  }

  // An explicit cap overrides the sum of items: "$300 on groceries" is a
  // statement about the whole category, not about any one line in it
  const capByCategory = new Map(caps.map(cap => [normalizeCategory(cap.category), cap.monthlyEstimate]))

  for (const node of categories.values()) {
    const itemTotal = node.items.reduce((sum, item) => sum + item.planned, 0)
    const cap = capByCategory.get(node.category)

    if (cap !== undefined) {
      node.planned = toCents(cap)
      node.plannedSource = 'category_cap'
    } else if (itemTotal > 0) {
      node.planned = toCents(itemTotal)
      node.plannedSource = 'items'
    }

    node.actual = toCents(node.items.reduce((sum, item) => sum + item.actual, 0))
    node.variance = toCents(node.actual - node.planned)
    node.overBudget = node.planned > 0 && node.actual > node.planned
    node.items.sort((a, b) => b.actual - a.actual || b.planned - a.planned)
  }

  // Caps for categories with no activity at all still belong in the view
  for (const cap of caps) {
    const key = normalizeCategory(cap.category)
    if (!categories.has(key)) {
      const node = ensure(key)
      node.planned = toCents(cap.monthlyEstimate)
      node.plannedSource = 'category_cap'
      node.variance = toCents(-cap.monthlyEstimate)
    }
  }

  const list = [...categories.values()].sort((a, b) => b.actual - a.actual || b.planned - a.planned)

  return {
    month: startDate.slice(0, 7),
    entity: entity ?? 'all',
    totalPlanned: toCents(list.reduce((sum, node) => sum + node.planned, 0)),
    totalActual: toCents(list.reduce((sum, node) => sum + node.actual, 0)),
    totalVariance: toCents(
      list.reduce((sum, node) => sum + node.actual, 0) - list.reduce((sum, node) => sum + node.planned, 0)
    ),
    categories: list,
    hasActuals,
    daysElapsed: Math.min(monthDate.getDate(), daysInMonth),
    daysInMonth,
  }
}
