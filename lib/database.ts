import { db, generateUUID, getCurrentTimestamp, getCurrentDate } from './turso'
import {
  addMonths,
  calculateMonthlyRequired,
  diffMonths,
  effectiveRate,
  estimateMonthsToComplete,
  getMonthStart,
  getMonthlyGrowthRate,
  monthlyToDaily,
  monthsUntil,
  parseLocalDate,
  toCents,
  totalMonthlyGoalObligation,
} from './projections'
import { isIncomeSourceActive } from './freshness'
import { RISK_PROFILE_RATES } from './setup'

// Type definitions
export type Transaction = {
  id: string
  user_id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string | null
  transaction_date: string
  transaction_time: string
  created_at: string
  updated_at: string
}

export type Goal = {
  id: string
  user_id: string
  title: string
  description: string | null
  target_amount: number
  current_amount: number
  category: 'emergency' | 'vacation' | 'car' | 'house' | 'debt' | 'investment' | 'other'
  start_date: string | null
  deadline: string
  interest_rate: number | null
  linked_account_id: string | null
  linked_account_kind: 'bank' | 'investment' | null
  allocation_percent: number | null
  priority: 'low' | 'medium' | 'high'
  urgency_score: number // 1-5 UI urgency signal; only used as a projection sort tie-breaker
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  // Business surplus cannot fund a personal goal directly, so goals are scoped
  entity: 'personal' | 'business'
  entity_label: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type GoalContribution = {
  id: string
  goal_id: string
  user_id: string
  amount: number
  contribution_date: string
  description: string | null
  source: 'manual' | 'one_time_income' | 'auto_allocation'
  source_id: string | null // ID of one_time_income if applicable
  created_at: string
}

export type RecurringExpense = {
  id: string
  user_id: string
  name: string
  description: string | null
  amount: number
  category: 'housing' | 'utilities' | 'entertainment' | 'health' | 'transportation' | 'food' | 'subscriptions' | 'insurance' | 'other'
  due_date: number
  status: 'active' | 'paused' | 'cancelled'
  auto_pay: boolean
  reminder_enabled: boolean
  entity: 'personal' | 'business'
  entity_label: string | null
  created_at: string
  updated_at: string
}

export type SideProject = {
  id: string
  user_id: string
  name: string
  description: string | null
  category: string | null
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled'
  current_monthly_earnings: number
  projected_monthly_earnings: number
  time_invested_weekly: number
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export type Milestone = {
  id: string
  user_id: string
  title: string
  description: string | null
  target_amount: number | null
  current_amount: number
  category: 'security' | 'debt' | 'lifestyle' | 'transportation' | 'growth' | 'investment' | 'other'
  priority: 'low' | 'medium' | 'high'
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled'
  impact_level: 'low' | 'medium' | 'high'
  deadline: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type UserSettings = {
  id: string
  user_id: string
  daily_budget_target: number
  currency: string
  preferred_language: string
  notifications_enabled: boolean
  dark_mode: boolean
  weekly_summary_email: boolean
  bank_reserve_amount: number
  bank_reserve_type: 'amount' | 'percentage'
  created_at: string
  updated_at: string
}

// Helper to convert row to typed object
function rowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    type: row.type as 'income' | 'expense',
    amount: row.amount as number,
    description: row.description as string,
    category: row.category as string | null,
    transaction_date: row.transaction_date as string,
    transaction_time: row.transaction_time as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

function rowToGoal(row: Record<string, unknown>): Goal {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    title: row.title as string,
    description: row.description as string | null,
    target_amount: row.target_amount as number,
    current_amount: row.current_amount as number,
    category: row.category as Goal['category'],
    start_date: row.start_date as string | null,
    deadline: row.deadline as string,
    interest_rate: row.interest_rate as number | null,
    linked_account_id: (row.linked_account_id as string | null) ?? null,
    linked_account_kind: (row.linked_account_kind as Goal['linked_account_kind']) ?? null,
    allocation_percent: (row.allocation_percent as number | null) ?? null,
    priority: row.priority as Goal['priority'],
    urgency_score: (row.urgency_score as number) || 3, // Default to 3 (medium) if not set
    status: row.status as Goal['status'],
    entity: (row.entity as Goal['entity']) ?? 'personal',
    entity_label: (row.entity_label as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    completed_at: row.completed_at as string | null,
  }
}

function rowToRecurringExpense(row: Record<string, unknown>): RecurringExpense {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    description: row.description as string | null,
    amount: row.amount as number,
    category: row.category as RecurringExpense['category'],
    due_date: row.due_date as number,
    status: row.status as RecurringExpense['status'],
    entity: (row.entity as RecurringExpense['entity']) ?? 'personal',
    entity_label: (row.entity_label as string | null) ?? null,
    auto_pay: Boolean(row.auto_pay),
    reminder_enabled: Boolean(row.reminder_enabled),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

function rowToSideProject(row: Record<string, unknown>): SideProject {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    description: row.description as string | null,
    category: row.category as string | null,
    status: row.status as SideProject['status'],
    current_monthly_earnings: row.current_monthly_earnings as number,
    projected_monthly_earnings: row.projected_monthly_earnings as number,
    time_invested_weekly: row.time_invested_weekly as number,
    start_date: row.start_date as string | null,
    end_date: row.end_date as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

// Growth and contribution math now lives in ./projections so the dashboard,
// goals page, summary and AI context all answer from the same formulas.

function rowToMilestone(row: Record<string, unknown>): Milestone {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    title: row.title as string,
    description: row.description as string | null,
    target_amount: row.target_amount as number | null,
    current_amount: row.current_amount as number,
    category: row.category as Milestone['category'],
    priority: row.priority as Milestone['priority'],
    status: row.status as Milestone['status'],
    impact_level: row.impact_level as Milestone['impact_level'],
    deadline: row.deadline as string | null,
    completed_at: row.completed_at as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

function rowToUserSettings(row: Record<string, unknown>): UserSettings {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    daily_budget_target: row.daily_budget_target as number,
    currency: row.currency as string,
    preferred_language: row.preferred_language as string,
    notifications_enabled: Boolean(row.notifications_enabled),
    dark_mode: Boolean(row.dark_mode),
    weekly_summary_email: Boolean(row.weekly_summary_email),
    bank_reserve_amount: (row.bank_reserve_amount as number) ?? 0,
    bank_reserve_type: (row.bank_reserve_type as string ?? 'amount') as 'amount' | 'percentage',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

// =============================================
// User Settings
// =============================================

export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
  const result = await db.execute({
    sql: 'SELECT * FROM user_settings WHERE user_id = ?',
    args: [userId]
  })
  
  if (!result.rows[0]) return null
  if (result.rows.length === 0) {
    throw new Error('Record not found or not owned by this user')
  }

  return rowToUserSettings(result.rows[0] as Record<string, unknown>)
}

export const updateUserSettings = async (userId: string, updates: Partial<UserSettings>): Promise<UserSettings> => {
  const now = getCurrentTimestamp()
  const fields: string[] = ['updated_at = ?']
  const args: (string | number | boolean | null)[] = [now]
  
  if (updates.daily_budget_target !== undefined) {
    fields.push('daily_budget_target = ?')
    args.push(updates.daily_budget_target)
  }
  if (updates.currency !== undefined) {
    fields.push('currency = ?')
    args.push(updates.currency)
  }
  if (updates.notifications_enabled !== undefined) {
    fields.push('notifications_enabled = ?')
    args.push(updates.notifications_enabled ? 1 : 0)
  }
  if (updates.dark_mode !== undefined) {
    fields.push('dark_mode = ?')
    args.push(updates.dark_mode ? 1 : 0)
  }
  if (updates.bank_reserve_amount !== undefined) {
    fields.push('bank_reserve_amount = ?')
    args.push(updates.bank_reserve_amount)
  }
  if (updates.bank_reserve_type !== undefined) {
    fields.push('bank_reserve_type = ?')
    args.push(updates.bank_reserve_type)
  }

  args.push(userId)
  
  await db.execute({
    sql: `UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = ?`,
    args
  })
  
  const result = await getUserSettings(userId)
  if (!result) throw new Error('Failed to update user settings')
  return result
}

// =============================================
// Daily Transactions
// =============================================

export const createTransaction = async (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> => {
  const id = generateUUID()
  const now = getCurrentTimestamp()
  const today = getCurrentDate()
  
  await db.execute({
    sql: `INSERT INTO daily_transactions (id, user_id, type, amount, description, category, transaction_date, transaction_time, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      transaction.user_id,
      transaction.type,
      transaction.amount,
      transaction.description,
      transaction.category ?? null,
      transaction.transaction_date ?? today,
      transaction.transaction_time ?? now,
      now,
      now
    ]
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM daily_transactions WHERE id = ? AND user_id = ?',
    args: [id, transaction.user_id]
  })
  
  if (result.rows.length === 0) {
    throw new Error('Record not found or not owned by this user')
  }

  return rowToTransaction(result.rows[0] as Record<string, unknown>)
}

export const getTransactions = async (userId: string, date?: string): Promise<Transaction[]> => {
  let sql = 'SELECT * FROM daily_transactions WHERE user_id = ?'
  const args: string[] = [userId]
  
  if (date) {
    sql += ' AND transaction_date = ?'
    args.push(date)
  }
  
  sql += ' ORDER BY transaction_time DESC'
  
  const result = await db.execute({ sql, args })
  return result.rows.map(row => rowToTransaction(row as Record<string, unknown>))
}

const getMonthRange = (date: Date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}

export const getTransactionsForMonth = async (userId: string, monthStart?: string, monthEnd?: string): Promise<Transaction[]> => {
  const range = monthStart && monthEnd ? { start: monthStart, end: monthEnd } : getMonthRange()

  const result = await db.execute({
    sql: 'SELECT * FROM daily_transactions WHERE user_id = ? AND transaction_date >= ? AND transaction_date < ? ORDER BY transaction_date DESC, transaction_time DESC',
    args: [userId, range.start, range.end]
  })

  return result.rows.map(row => rowToTransaction(row as Record<string, unknown>))
}

export const updateTransaction = async (userId: string, id: string, updates: Partial<Transaction>): Promise<Transaction> => {
  const now = getCurrentTimestamp()
  const fields: string[] = ['updated_at = ?']
  const args: (string | number | null)[] = [now]
  
  if (updates.type !== undefined) {
    fields.push('type = ?')
    args.push(updates.type)
  }
  if (updates.amount !== undefined) {
    fields.push('amount = ?')
    args.push(updates.amount)
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    args.push(updates.description)
  }
  if (updates.category !== undefined) {
    fields.push('category = ?')
    args.push(updates.category)
  }
  
  args.push(id, userId)
  
  await db.execute({
    sql: `UPDATE daily_transactions SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    args
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM daily_transactions WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })
  
  if (result.rows.length === 0) {
    throw new Error('Record not found or not owned by this user')
  }

  return rowToTransaction(result.rows[0] as Record<string, unknown>)
}

export const deleteTransaction = async (userId: string, id: string): Promise<void> => {
  await db.execute({
    sql: 'DELETE FROM daily_transactions WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })
}

// =============================================
// Financial Goals
// =============================================

export const createGoal = async (goal: Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'completed_at'>): Promise<Goal> => {
  const id = generateUUID()
  const now = getCurrentTimestamp()
  
  await db.execute({
    sql: `INSERT INTO financial_goals (id, user_id, title, description, target_amount, current_amount, category, start_date, deadline, interest_rate, linked_account_id, linked_account_kind, allocation_percent, priority, urgency_score, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      goal.user_id,
      goal.title,
      goal.description ?? null,
      goal.target_amount,
      goal.current_amount ?? 0,
      goal.category,
      goal.start_date ?? null,
      goal.deadline,
      goal.interest_rate ?? null,
      goal.linked_account_id ?? null,
      goal.linked_account_kind ?? null,
      goal.allocation_percent ?? null,
      goal.priority ?? 'medium',
      goal.urgency_score ?? 3, // Default to 3 (medium urgency)
      goal.status ?? 'active',
      now,
      now
    ]
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM financial_goals WHERE id = ? AND user_id = ?',
    args: [id, goal.user_id]
  })
  
  if (result.rows.length === 0) {
    throw new Error('Record not found or not owned by this user')
  }

  return rowToGoal(result.rows[0] as Record<string, unknown>)
}

export const getGoals = async (userId: string, includeCancelled: boolean = false): Promise<Goal[]> => {
  let sql = 'SELECT * FROM financial_goals WHERE user_id = ?'
  const args: (string | number)[] = [userId]
  
  if (!includeCancelled) {
    sql += ' AND status != ?'
    args.push('cancelled')
  }
  
  sql += ' ORDER BY created_at DESC'
  
  const result = await db.execute({ sql, args })
  
  return result.rows.map(row => rowToGoal(row as Record<string, unknown>))
}

export const updateGoal = async (userId: string, id: string, updates: Partial<Goal>): Promise<Goal> => {
  const now = getCurrentTimestamp()
  const fields: string[] = ['updated_at = ?']
  const args: (string | number | null)[] = [now]
  
  if (updates.title !== undefined) {
    fields.push('title = ?')
    args.push(updates.title)
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    args.push(updates.description)
  }
  if (updates.target_amount !== undefined) {
    fields.push('target_amount = ?')
    args.push(updates.target_amount)
  }
  if (updates.current_amount !== undefined) {
    fields.push('current_amount = ?')
    args.push(updates.current_amount)
  }
  if (updates.category !== undefined) {
    fields.push('category = ?')
    args.push(updates.category)
  }
  if (updates.start_date !== undefined) {
    fields.push('start_date = ?')
    args.push(updates.start_date)
  }
  if (updates.deadline !== undefined) {
    fields.push('deadline = ?')
    args.push(updates.deadline)
  }
  if (updates.interest_rate !== undefined) {
    fields.push('interest_rate = ?')
    args.push(updates.interest_rate)
  }
  if (updates.linked_account_id !== undefined) {
    fields.push('linked_account_id = ?')
    args.push(updates.linked_account_id)
  }
  if (updates.linked_account_kind !== undefined) {
    fields.push('linked_account_kind = ?')
    args.push(updates.linked_account_kind)
  }
  if (updates.allocation_percent !== undefined) {
    fields.push('allocation_percent = ?')
    args.push(updates.allocation_percent)
  }
  if (updates.priority !== undefined) {
    fields.push('priority = ?')
    args.push(updates.priority)
  }
  if (updates.urgency_score !== undefined) {
    fields.push('urgency_score = ?')
    args.push(updates.urgency_score)
  }
  if (updates.status !== undefined) {
    fields.push('status = ?')
    args.push(updates.status)
    if (updates.status === 'completed') {
      fields.push('completed_at = ?')
      args.push(now)
    }
  }
  
  args.push(id, userId)
  
  await db.execute({
    sql: `UPDATE financial_goals SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    args
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM financial_goals WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })
  
  if (result.rows.length === 0) {
    throw new Error('Record not found or not owned by this user')
  }

  return rowToGoal(result.rows[0] as Record<string, unknown>)
}

export const deleteGoal = async (userId: string, id: string): Promise<void> => {
  await db.execute({
    sql: 'DELETE FROM financial_goals WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })
}

// =============================================
// Goal Contributions
// =============================================

function rowToGoalContribution(row: Record<string, unknown>): GoalContribution {
  return {
    id: row.id as string,
    goal_id: row.goal_id as string,
    user_id: row.user_id as string,
    amount: row.amount as number,
    contribution_date: row.contribution_date as string,
    description: row.description as string | null,
    source: (row.source as GoalContribution['source']) || 'manual',
    source_id: row.source_id as string | null,
    created_at: row.created_at as string
  }
}

export const getGoalContributions = async (userId: string, goalId: string): Promise<GoalContribution[]> => {
  const result = await db.execute({
    sql: 'SELECT * FROM goal_contributions WHERE goal_id = ? AND user_id = ? ORDER BY contribution_date DESC, created_at DESC',
    args: [goalId, userId]
  })
  return result.rows.map(row => rowToGoalContribution(row as Record<string, unknown>))
}

export const createGoalContribution = async (contribution: Omit<GoalContribution, 'id' | 'created_at'>): Promise<GoalContribution> => {
  const id = generateUUID()
  const now = getCurrentTimestamp()
  const today = getCurrentDate()
  
  await db.execute({
    sql: `INSERT INTO goal_contributions (id, goal_id, user_id, amount, contribution_date, description, source, source_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      contribution.goal_id,
      contribution.user_id,
      contribution.amount,
      contribution.contribution_date || today,
      contribution.description || null,
      contribution.source || 'manual',
      contribution.source_id || null,
      now
    ]
  })
  
  // Update the goal's current_amount
  await db.execute({
    sql: `UPDATE financial_goals SET current_amount = current_amount + ?, updated_at = ? WHERE id = ? AND user_id = ?`,
    args: [contribution.amount, now, contribution.goal_id, contribution.user_id]
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM goal_contributions WHERE id = ? AND user_id = ?',
    args: [id, contribution.user_id]
  })
  
  if (result.rows.length === 0) {
    throw new Error('Record not found or not owned by this user')
  }

  return rowToGoalContribution(result.rows[0] as Record<string, unknown>)
}

// Get full breakdown for a goal (contributions + projections)
export const getGoalBreakdown = async (goalId: string, userId: string) => {
  const [goal, contributions, oneTimeIncomes] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM financial_goals WHERE id = ? AND user_id = ?', args: [goalId, userId] }),
    getGoalContributions(userId, goalId),
    getOneTimeIncomes(userId)
  ])
  
  if (!goal.rows[0]) {
    throw new Error('Goal not found')
  }
  
  const goalData = rowToGoal(goal.rows[0] as Record<string, unknown>)
  
  // Get one-time incomes applied to this goal
  const appliedIncomes = oneTimeIncomes.filter(i => i.goal_id === goalId && i.applied_to_goals)
  
  // Calculate contribution sources
  const manualContributions = contributions.filter(c => c.source === 'manual')
  const oneTimeContributions = contributions.filter(c => c.source === 'one_time_income')
  
  const manualTotal = manualContributions.reduce((sum, c) => sum + c.amount, 0)
  const oneTimeTotal = appliedIncomes.reduce((sum, i) => sum + i.amount, 0)
  
  // Calculate monthly required
  const today = new Date()
  const deadline = new Date(goalData.deadline)
  const startDate = goalData.start_date ? new Date(goalData.start_date) : today
  const effectiveStart = startDate > today ? startDate : today
  const monthsRemaining = monthsUntil(deadline, effectiveStart)
  const remaining = goalData.target_amount - goalData.current_amount
  const monthlyRequired = calculateMonthlyRequired(
    goalData.target_amount,
    goalData.current_amount,
    monthsRemaining,
    goalData.category === 'investment' ? goalData.interest_rate : null
  )
  
  // Generate expected payment schedule (next 6 months or until deadline)
  const paymentSchedule = []
  const monthsToShow = Math.min(6, monthsRemaining)
  let runningTotal = goalData.current_amount
  const scheduleStart = effectiveStart > today ? effectiveStart : today
  
  for (let i = 0; i < monthsToShow; i++) {
    const date = new Date(scheduleStart)
    date.setMonth(date.getMonth() + i + 1)
    date.setDate(1) // First of each month
    
    const monthlyRate = goalData.category === 'investment' ? getMonthlyGrowthRate(goalData.interest_rate) : 0
    runningTotal = runningTotal * (1 + monthlyRate) + monthlyRequired
    paymentSchedule.push({
      date: date.toISOString().split('T')[0],
      month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
      expectedContribution: toCents(monthlyRequired),
      runningTotal: Math.min(toCents(runningTotal), goalData.target_amount),
      progressPercent: Math.min(Math.round((runningTotal / goalData.target_amount) * 100), 100)
    })
  }
  
  return {
    goal: goalData,
    contributions: {
      all: contributions,
      manual: manualContributions,
      oneTime: oneTimeContributions,
      totalManual: toCents(manualTotal),
      totalOneTime: toCents(oneTimeTotal)
    },
    appliedIncomes,
    summary: {
      targetAmount: goalData.target_amount,
      currentAmount: goalData.current_amount,
      remaining: toCents(remaining),
      monthsRemaining,
      monthlyRequired: toCents(monthlyRequired),
      deadline: goalData.deadline,
      progressPercent: Math.round((goalData.current_amount / goalData.target_amount) * 100)
    },
    paymentSchedule
  }
}

// =============================================
// Recurring Expenses
// =============================================

export const createRecurringExpense = async (expense: Omit<RecurringExpense, 'id' | 'created_at' | 'updated_at'>): Promise<RecurringExpense> => {
  const id = generateUUID()
  const now = getCurrentTimestamp()
  
  await db.execute({
    sql: `INSERT INTO recurring_expenses (id, user_id, name, description, amount, category, due_date, status, auto_pay, reminder_enabled, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      expense.user_id,
      expense.name,
      expense.description ?? null,
      expense.amount,
      expense.category,
      expense.due_date,
      expense.status ?? 'active',
      expense.auto_pay ? 1 : 0,
      expense.reminder_enabled !== false ? 1 : 0,
      now,
      now
    ]
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM recurring_expenses WHERE id = ? AND user_id = ?',
    args: [id, expense.user_id]
  })
  
  if (result.rows.length === 0) {
    throw new Error('Record not found or not owned by this user')
  }

  return rowToRecurringExpense(result.rows[0] as Record<string, unknown>)
}

export const getRecurringExpenses = async (userId: string): Promise<RecurringExpense[]> => {
  const result = await db.execute({
    sql: 'SELECT * FROM recurring_expenses WHERE user_id = ? AND status = ? ORDER BY due_date ASC',
    args: [userId, 'active']
  })
  
  return result.rows.map(row => rowToRecurringExpense(row as Record<string, unknown>))
}

export const updateRecurringExpense = async (userId: string, id: string, updates: Partial<RecurringExpense>): Promise<RecurringExpense> => {
  const now = getCurrentTimestamp()
  const fields: string[] = ['updated_at = ?']
  const args: (string | number | null)[] = [now]
  
  if (updates.name !== undefined) {
    fields.push('name = ?')
    args.push(updates.name)
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    args.push(updates.description)
  }
  if (updates.amount !== undefined) {
    fields.push('amount = ?')
    args.push(updates.amount)
  }
  if (updates.category !== undefined) {
    fields.push('category = ?')
    args.push(updates.category)
  }
  if (updates.due_date !== undefined) {
    fields.push('due_date = ?')
    args.push(updates.due_date)
  }
  if (updates.status !== undefined) {
    fields.push('status = ?')
    args.push(updates.status)
  }
  if (updates.auto_pay !== undefined) {
    fields.push('auto_pay = ?')
    args.push(updates.auto_pay ? 1 : 0)
  }
  if (updates.reminder_enabled !== undefined) {
    fields.push('reminder_enabled = ?')
    args.push(updates.reminder_enabled ? 1 : 0)
  }
  
  args.push(id, userId)
  
  await db.execute({
    sql: `UPDATE recurring_expenses SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    args
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM recurring_expenses WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })
  
  if (result.rows.length === 0) {
    throw new Error('Record not found or not owned by this user')
  }

  return rowToRecurringExpense(result.rows[0] as Record<string, unknown>)
}

export const deleteRecurringExpense = async (userId: string, id: string): Promise<void> => {
  await db.execute({
    sql: 'DELETE FROM recurring_expenses WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })
}

// =============================================
// Side Projects
// =============================================

export const createSideProject = async (project: Omit<SideProject, 'id' | 'created_at' | 'updated_at'>): Promise<SideProject> => {
  const id = generateUUID()
  const now = getCurrentTimestamp()
  
  await db.execute({
    sql: `INSERT INTO side_projects (id, user_id, name, description, category, status, current_monthly_earnings, projected_monthly_earnings, time_invested_weekly, start_date, end_date, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      project.user_id,
      project.name,
      project.description ?? null,
      project.category ?? null,
      project.status ?? 'planning',
      project.current_monthly_earnings ?? 0,
      project.projected_monthly_earnings ?? 0,
      project.time_invested_weekly ?? 0,
      project.start_date ?? null,
      project.end_date ?? null,
      now,
      now
    ]
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM side_projects WHERE id = ? AND user_id = ?',
    args: [id, project.user_id]
  })
  
  if (result.rows.length === 0) {
    throw new Error('Record not found or not owned by this user')
  }

  return rowToSideProject(result.rows[0] as Record<string, unknown>)
}

export const getSideProjects = async (userId: string): Promise<SideProject[]> => {
  const result = await db.execute({
    sql: 'SELECT * FROM side_projects WHERE user_id = ? ORDER BY created_at DESC',
    args: [userId]
  })
  
  return result.rows.map(row => rowToSideProject(row as Record<string, unknown>))
}

export const updateSideProject = async (userId: string, id: string, updates: Partial<SideProject>): Promise<SideProject> => {
  const now = getCurrentTimestamp()
  const fields: string[] = ['updated_at = ?']
  const args: (string | number | null)[] = [now]
  
  if (updates.name !== undefined) {
    fields.push('name = ?')
    args.push(updates.name)
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    args.push(updates.description)
  }
  if (updates.category !== undefined) {
    fields.push('category = ?')
    args.push(updates.category)
  }
  if (updates.status !== undefined) {
    fields.push('status = ?')
    args.push(updates.status)
  }
  if (updates.current_monthly_earnings !== undefined) {
    fields.push('current_monthly_earnings = ?')
    args.push(updates.current_monthly_earnings)
  }
  if (updates.projected_monthly_earnings !== undefined) {
    fields.push('projected_monthly_earnings = ?')
    args.push(updates.projected_monthly_earnings)
  }
  if (updates.time_invested_weekly !== undefined) {
    fields.push('time_invested_weekly = ?')
    args.push(updates.time_invested_weekly)
  }
  if (updates.start_date !== undefined) {
    fields.push('start_date = ?')
    args.push(updates.start_date)
  }
  if (updates.end_date !== undefined) {
    fields.push('end_date = ?')
    args.push(updates.end_date)
  }
  
  args.push(id, userId)
  
  await db.execute({
    sql: `UPDATE side_projects SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    args
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM side_projects WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })
  
  if (result.rows.length === 0) {
    throw new Error('Record not found or not owned by this user')
  }

  return rowToSideProject(result.rows[0] as Record<string, unknown>)
}

export const deleteSideProject = async (userId: string, id: string): Promise<void> => {
  await db.execute({
    sql: 'DELETE FROM side_projects WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })
}

// =============================================
// Financial Milestones
// =============================================

export const createMilestone = async (milestone: Omit<Milestone, 'id' | 'created_at' | 'updated_at' | 'completed_at'>): Promise<Milestone> => {
  const id = generateUUID()
  const now = getCurrentTimestamp()
  
  await db.execute({
    sql: `INSERT INTO financial_milestones (id, user_id, title, description, target_amount, current_amount, category, priority, status, impact_level, deadline, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      milestone.user_id,
      milestone.title,
      milestone.description ?? null,
      milestone.target_amount ?? null,
      milestone.current_amount ?? 0,
      milestone.category,
      milestone.priority ?? 'medium',
      milestone.status ?? 'planned',
      milestone.impact_level ?? 'medium',
      milestone.deadline ?? null,
      now,
      now
    ]
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM financial_milestones WHERE id = ? AND user_id = ?',
    args: [id, milestone.user_id]
  })
  
  if (result.rows.length === 0) {
    throw new Error('Record not found or not owned by this user')
  }

  return rowToMilestone(result.rows[0] as Record<string, unknown>)
}

export const getMilestones = async (userId: string): Promise<Milestone[]> => {
  const result = await db.execute({
    sql: 'SELECT * FROM financial_milestones WHERE user_id = ? ORDER BY deadline ASC',
    args: [userId]
  })
  
  return result.rows.map(row => rowToMilestone(row as Record<string, unknown>))
}

export const updateMilestone = async (userId: string, id: string, updates: Partial<Milestone>): Promise<Milestone> => {
  const now = getCurrentTimestamp()
  const fields: string[] = ['updated_at = ?']
  const args: (string | number | null)[] = [now]
  
  if (updates.title !== undefined) {
    fields.push('title = ?')
    args.push(updates.title)
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    args.push(updates.description)
  }
  if (updates.target_amount !== undefined) {
    fields.push('target_amount = ?')
    args.push(updates.target_amount)
  }
  if (updates.current_amount !== undefined) {
    fields.push('current_amount = ?')
    args.push(updates.current_amount)
  }
  if (updates.category !== undefined) {
    fields.push('category = ?')
    args.push(updates.category)
  }
  if (updates.priority !== undefined) {
    fields.push('priority = ?')
    args.push(updates.priority)
  }
  if (updates.status !== undefined) {
    fields.push('status = ?')
    args.push(updates.status)
    if (updates.status === 'completed') {
      fields.push('completed_at = ?')
      args.push(now)
    }
  }
  if (updates.impact_level !== undefined) {
    fields.push('impact_level = ?')
    args.push(updates.impact_level)
  }
  if (updates.deadline !== undefined) {
    fields.push('deadline = ?')
    args.push(updates.deadline)
  }
  
  args.push(id, userId)
  
  await db.execute({
    sql: `UPDATE financial_milestones SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    args
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM financial_milestones WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })
  
  if (result.rows.length === 0) {
    throw new Error('Record not found or not owned by this user')
  }

  return rowToMilestone(result.rows[0] as Record<string, unknown>)
}

export const deleteMilestone = async (userId: string, id: string): Promise<void> => {
  await db.execute({
    sql: 'DELETE FROM financial_milestones WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })
}

// =============================================
// Dashboard Analytics
// =============================================

export const getDashboardData = async (userId: string) => {
  const today = getCurrentDate()
  
  // Get today's transactions
  const todayTransactions = await getTransactions(userId, today)
  
  // Calculate daily total
  const dailyTotal = todayTransactions.reduce((sum, transaction) => {
    return sum + (transaction.type === 'income' ? transaction.amount : -transaction.amount)
  }, 0)
  
  // Get goals progress
  const goals = await getGoals(userId)
  const activeGoals = goals.filter(goal => goal.status === 'active')
  const goalProgress = activeGoals.length > 0 
    ? activeGoals.reduce((avg, goal) => avg + (goal.current_amount / goal.target_amount), 0) / activeGoals.length * 100
    : 0
  
  // Get recurring expenses total
  const recurringExpenses = await getRecurringExpenses(userId)
  const monthlyRecurringTotal = recurringExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  
  // Get side projects income
  const sideProjects = await getSideProjects(userId)
  const activeSideProjects = sideProjects.filter(project => project.status === 'active')
  const monthlyProjectIncome = activeSideProjects.reduce((sum, project) => sum + project.current_monthly_earnings, 0)
  
  return {
    dailyTotal,
    goalProgress,
    monthlyRecurringTotal,
    monthlyProjectIncome,
    transactionCount: todayTransactions.length,
    activeGoalsCount: activeGoals.length,
    activeSideProjectsCount: activeSideProjects.length
  }
}

// =============================================
// Calculate Daily Target
// =============================================

export const calculateDailyTarget = async (userId: string) => {
  try {
    // Get active goals and calculate monthly obligations
    const goals = await getGoals(userId)
    const activeGoals = goals.filter(goal => goal.status === 'active')
    
    // Single source of truth: the same obligation the goals page and projections
    // report. Previously this divided by a rounded day-count and ignored growth,
    // so the dashboard could disagree with the goals page for the same goal.
    const monthlyGoalObligations = totalMonthlyGoalObligation(activeGoals)
    
    // Get recurring expenses
    const recurringExpenses = await getRecurringExpenses(userId)
    const monthlyRecurringTotal = recurringExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    
    // Total monthly obligations
    const totalMonthlyObligations = monthlyGoalObligations + monthlyRecurringTotal
    
    // Convert to daily target
    const dailyTarget = monthlyToDaily(totalMonthlyObligations)
    
    // Get side projects income
    const sideProjects = await getSideProjects(userId)
    const activeSideProjects = sideProjects.filter(project => project.status === 'active')
    const monthlyProjectIncome = activeSideProjects.reduce((sum, project) => sum + project.current_monthly_earnings, 0)
    
    // Get income from income sources (NEW)
    let incomeFromSources = 0
    let hasCommissionIncome = false
    let incomeEstimateLow = 0
    let incomeEstimateMid = 0
    let incomeEstimateHigh = 0
    
    try {
      const incomeSources = await getIncomeSources(userId)
      const activeSources = incomeSources.filter(s => isIncomeSourceActive(s))
      
      if (activeSources.length > 0) {
        hasCommissionIncome = activeSources.some(s => s.is_commission_based)
        incomeEstimateLow = activeSources.reduce((sum, s) => sum + s.estimated_monthly_low, 0)
        incomeEstimateMid = activeSources.reduce((sum, s) => sum + s.estimated_monthly_mid, 0)
        incomeEstimateHigh = activeSources.reduce((sum, s) => sum + s.estimated_monthly_high, 0)
        
        // Use the safe middle estimate for calculations
        incomeFromSources = incomeEstimateMid
      }
    } catch {
      // Income sources table might not exist yet, fall back to transaction-based estimate
    }
    
    // Fall back to transaction-based income estimate if no income sources
    let recurringMonthlyIncome = 0
    if (incomeFromSources === 0) {
      const recentTransactions = await getTransactions(userId)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const recentIncomeTransactions = recentTransactions.filter(t => 
        t.type === 'income' && new Date(t.created_at) >= thirtyDaysAgo
      )
      
      const recurringIncome = recentIncomeTransactions.filter(t => 
        t.category === 'salary' || t.category === 'freelance' || t.category === 'business'
      )
      
      recurringMonthlyIncome = recurringIncome.length > 0 
        ? (recurringIncome.reduce((sum, t) => sum + t.amount, 0) / recurringIncome.length) * 4.33
        : 0
    }
    
    // Total monthly income: income sources + side projects (or transaction fallback + side projects)
    const estimatedMonthlyIncome = (incomeFromSources > 0 ? incomeFromSources : recurringMonthlyIncome) + monthlyProjectIncome
    
    const monthlySurplusDeficit = estimatedMonthlyIncome - totalMonthlyObligations
    const dailySurplusDeficit = monthlyToDaily(monthlySurplusDeficit)
    
    return {
      dailyTarget: toCents(dailyTarget),
      monthlyGoalObligations: toCents(monthlyGoalObligations),
      monthlyRecurringTotal: toCents(monthlyRecurringTotal),
      totalMonthlyObligations: toCents(totalMonthlyObligations),
      estimatedMonthlyIncome: toCents(estimatedMonthlyIncome),
      monthlyProjectIncome: toCents(monthlyProjectIncome),
      monthlySurplusDeficit: toCents(monthlySurplusDeficit),
      dailySurplusDeficit: toCents(dailySurplusDeficit),
      activeGoalsCount: activeGoals.length,
      recurringExpensesCount: recurringExpenses.length,
      // New income source fields
      hasCommissionIncome,
      incomeEstimateLow: toCents(incomeEstimateLow),
      incomeEstimateMid: toCents(incomeEstimateMid),
      incomeEstimateHigh: toCents(incomeEstimateHigh),
    }
  } catch (error) {
    console.error('Error calculating daily target:', error)
    return {
      dailyTarget: 150,
      monthlyGoalObligations: 0,
      monthlyRecurringTotal: 0,
      totalMonthlyObligations: 0,
      estimatedMonthlyIncome: 0,
      monthlyProjectIncome: 0,
      monthlySurplusDeficit: 0,
      dailySurplusDeficit: 0,
      activeGoalsCount: 0,
      recurringExpensesCount: 0,
      hasCommissionIncome: false,
      incomeEstimateLow: 0,
      incomeEstimateMid: 0,
      incomeEstimateHigh: 0,
    }
  }
}

// =============================================
// Goal Projections (Automatic Progress Tracking)
// =============================================

export interface GoalProjection {
  goalId: string
  title: string
  targetAmount: number
  currentAmount: number // Manual contributions
  projectedAmount: number // Based on income surplus allocation
  totalProjectedProgress: number // currentAmount + projectedAmount
  progressPercentage: number
  monthlyAllocation: number // How much surplus goes to this goal monthly
  urgencyScore: number // 1-5, affects allocation priority
  originalDeadline: string
  projectedCompletionDate: string
  daysUntilProjectedCompletion: number
  isOnTrack: boolean // Will complete before deadline?
  daysAheadOrBehind: number // Positive = ahead of schedule
  status: 'on_track' | 'ahead' | 'behind' | 'at_risk' | 'completed'
  category: string
  suggestedDeadline?: string
}

export interface ProjectionSummary {
  goals: GoalProjection[]
  totalMonthlyIncome: number
  totalMonthlyExpenses: number
  monthlySurplus: number
  surplusAllocatedToGoals: number
  bankReserve: number
  hasVariableIncome: boolean
  oneTimeNet?: number
  /** Whether the surplus came from measured bank data or the budget. */
  surplusBasis?: 'actual' | 'plan'
  /** Complete months of real data behind an 'actual' basis. */
  surplusMonthsOfData?: number
  // Scenarios for variable income
  scenarios?: {
    conservative: GoalProjection[]
    expected: GoalProjection[]
    optimistic: GoalProjection[]
  }
}

export function goalImportance(priority: Goal['priority']): number {
  if (priority === 'high') return 1.5
  if (priority === 'low') return 0.6
  return 1
}

export function goalAllocationWeight(
  monthlyRequirement: number,
  priority: Goal['priority'],
  monthsUntilDeadline: number
): number {
  const timePressure = Math.max(0.1, 12 / monthsUntilDeadline)
  return monthlyRequirement * goalImportance(priority) * timePressure
}

export function effectiveCurrentAmount(
  balance: number,
  allocationPercent: number | null
): number {
  return balance * ((allocationPercent ?? 100) / 100)
}

export function statusForGoal({
  progressPercentage,
  completed,
  projectedAfterDeadline,
  unreachable,
  daysAheadOrBehind,
}: {
  progressPercentage: number
  completed: boolean
  projectedAfterDeadline: boolean
  unreachable: boolean
  daysAheadOrBehind: number
}): GoalProjection['status'] {
  if (progressPercentage >= 100) return 'completed'
  if (!completed && (unreachable || projectedAfterDeadline)) return 'at_risk'
  if (daysAheadOrBehind > 30) return 'ahead'
  if (daysAheadOrBehind >= 0) return 'on_track'
  if (daysAheadOrBehind >= -30) return 'behind'
  return 'at_risk'
}

export const calculateGoalProjections = async (userId: string): Promise<ProjectionSummary> => {
  try {
    // Get all required data
    const [goals, recurringExpenses, incomeSources, sideProjects, monthlyTransactions, userSettings] = await Promise.all([
      getGoals(userId),
      getRecurringExpenses(userId),
      getIncomeSources(userId).catch(() => []),
      getSideProjects(userId),
      getTransactionsForMonth(userId),
      getUserSettings(userId)
    ])
    
    const allActiveGoals = goals.filter(g => g.status === 'active')
    const linkedBankIds = [...new Set(
      allActiveGoals
        .filter(goal => goal.linked_account_kind === 'bank' && goal.linked_account_id)
        .map(goal => goal.linked_account_id as string)
    )]
    const linkedInvestmentIds = [...new Set(
      allActiveGoals
        .filter(goal => goal.linked_account_kind === 'investment' && goal.linked_account_id)
        .map(goal => goal.linked_account_id as string)
    )]

    const [bankAccountsResult, investmentAccountsResult] = await Promise.all([
      linkedBankIds.length > 0
        ? db.execute({
            sql: `SELECT id, current_balance
                  FROM bank_accounts
                  WHERE id IN (${linkedBankIds.map(() => '?').join(', ')})
                    AND user_id = ?
                    AND is_excluded = 0`,
            args: [...linkedBankIds, userId],
          }).catch(() => null)
        : Promise.resolve(null),
      linkedInvestmentIds.length > 0
        ? db.execute({
            sql: `SELECT id, balance, risk_profile
                  FROM investment_accounts
                  WHERE id IN (${linkedInvestmentIds.map(() => '?').join(', ')})
                    AND user_id = ?`,
            args: [...linkedInvestmentIds, userId],
          }).catch(() => null)
        : Promise.resolve(null),
    ])

    const linkedBankBalances = new Map<string, number>()
    bankAccountsResult?.rows.forEach(row => {
      linkedBankBalances.set(String(row.id), Number(row.current_balance ?? 0))
    })

    const linkedInvestmentAccounts = new Map<
      string,
      { balance: number; riskProfile: keyof typeof RISK_PROFILE_RATES }
    >()
    investmentAccountsResult?.rows.forEach(row => {
      linkedInvestmentAccounts.set(String(row.id), {
        balance: Number(row.balance ?? 0),
        riskProfile: row.risk_profile as keyof typeof RISK_PROFILE_RATES,
      })
    })

    const currentAmountForGoal = (goal: Goal): number => {
      if (!goal.linked_account_id) return goal.current_amount

      if (goal.linked_account_kind === 'bank') {
        const balance = linkedBankBalances.get(goal.linked_account_id)
        return balance === undefined
          ? goal.current_amount
          : effectiveCurrentAmount(balance, goal.allocation_percent)
      }

      if (goal.linked_account_kind === 'investment') {
        const account = linkedInvestmentAccounts.get(goal.linked_account_id)
        return account
          ? effectiveCurrentAmount(account.balance, goal.allocation_percent)
          : goal.current_amount
      }

      return goal.current_amount
    }

    const growthRateForGoal = (goal: Goal): number | null => {
      if (goal.linked_account_kind === 'investment' && goal.linked_account_id) {
        const account = linkedInvestmentAccounts.get(goal.linked_account_id)
        if (account) {
          return goal.interest_rate ?? RISK_PROFILE_RATES[account.riskProfile]
        }
      }

      return effectiveRate(goal)
    }

    const activeSources = incomeSources.filter(s => isIncomeSourceActive(s))
    const activeSideProjects = sideProjects.filter(p => p.status === 'active')

    // Surplus is pooled per entity. Business money cannot fund a personal goal
    // without first leaving the company as salary or a distribution, which is a
    // taxable event -- so the two pools are allocated independently rather than
    // summed. Side projects and one-time transactions carry no entity and are
    // treated as personal, matching the column defaults.
    const businessSources = activeSources.filter(s => s.entity === 'business')
    const businessExpenses = recurringExpenses.filter(e => e.entity === 'business')
    const businessIncomeMid = businessSources.reduce((sum, s) => sum + s.estimated_monthly_mid, 0)
    const businessExpenseTotal = businessExpenses.reduce((sum, e) => sum + e.amount, 0)
    const businessSurplus = Math.max(0, businessIncomeMid - businessExpenseTotal)
    
    // Calculate one-time net for the current month
    const oneTimeNet = monthlyTransactions.reduce((sum, transaction) => {
      return sum + (transaction.type === 'income' ? transaction.amount : -transaction.amount)
    }, 0)

    // Calculate monthly income
    const hasVariableIncome = activeSources.some(s => s.is_commission_based)
    
    const personalSources = activeSources.filter(s => s.entity !== 'business')
    let monthlyIncomeLow = personalSources.reduce((sum, s) => sum + s.estimated_monthly_low, 0)
    let monthlyIncomeMid = personalSources.reduce((sum, s) => sum + s.estimated_monthly_mid, 0)
    let monthlyIncomeHigh = personalSources.reduce((sum, s) => sum + s.estimated_monthly_high, 0)
    
    // Add side project income
    const sideProjectIncome = activeSideProjects.reduce((sum, p) => sum + p.current_monthly_earnings, 0)
    monthlyIncomeLow += sideProjectIncome
    monthlyIncomeMid += sideProjectIncome
    monthlyIncomeHigh += sideProjectIncome

    // Apply one-time net impact for the current month
    monthlyIncomeLow += oneTimeNet
    monthlyIncomeMid += oneTimeNet
    monthlyIncomeHigh += oneTimeNet
    
    // Calculate monthly expenses
    const monthlyExpenses = recurringExpenses
      .filter(e => e.entity !== 'business')
      .reduce((sum, e) => sum + e.amount, 0)
    
    // Calculate surplus for each scenario
    const surplusLow = Math.max(0, monthlyIncomeLow - monthlyExpenses)
    const surplusMid = Math.max(0, monthlyIncomeMid - monthlyExpenses)
    const surplusHigh = Math.max(0, monthlyIncomeHigh - monthlyExpenses)

    // Compute bank reserve from user settings
    const computeReserve = (surplus: number): number => {
      if (!userSettings) return 0
      const { bank_reserve_amount, bank_reserve_type } = userSettings
      if (bank_reserve_type === 'percentage') {
        return Math.min(surplus, surplus * (bank_reserve_amount / 100))
      }
      return Math.min(surplus, bank_reserve_amount)
    }
    const reserveLow = computeReserve(surplusLow)
    const reserveMid = computeReserve(surplusMid)
    const reserveHigh = computeReserve(surplusHigh)
    const allocatableLow = Math.max(0, surplusLow - reserveLow)
    let allocatableMid = Math.max(0, surplusMid - reserveMid)
    const allocatableHigh = Math.max(0, surplusHigh - reserveHigh)

    // Prefer measured surplus over the budget once real months exist. A plan is
    // a hypothesis; what actually cleared the account last quarter is evidence,
    // and it predicts next quarter better. Falls back to the plan silently when
    // no bank data is connected, so behaviour is unchanged for manual-only use.
    // Dynamic import avoids a module cycle: ledger reads from this file.
    let surplusBasis: 'actual' | 'plan' = 'plan'
    let surplusMonthsOfData = 0
    try {
      const { getTrailingActualSurplus } = await import('./ledger')
      const measured = await getTrailingActualSurplus(userId, { entity: 'personal' })

      if (measured.basis === 'actual') {
        surplusBasis = 'actual'
        surplusMonthsOfData = measured.monthsOfData
        allocatableMid = Math.max(0, measured.monthlySurplus - computeReserve(Math.max(0, measured.monthlySurplus)))
      }
    } catch (error) {
      // Never let the ledger break projections that worked before it existed
      console.error('Trailing surplus unavailable, using plan:', error)
    }

    const calculateProjectionsForSurplus = (
      monthlySurplus: number,
      entityFilter: 'personal' | 'business' = 'personal'
    ): GoalProjection[] => {
      // Only goals belonging to this entity compete for this pool
      const activeGoals = allActiveGoals.filter(goal =>
        entityFilter === 'business' ? goal.entity === 'business' : goal.entity !== 'business'
      )
      if (activeGoals.length === 0) return []

      const today = new Date()
      const startOfMonth = getMonthStart(today)
      const maxDeadline = activeGoals.reduce((max, goal) => {
        const deadline = parseLocalDate(goal.deadline)
        return deadline > max ? deadline : max
      }, startOfMonth)
      const monthsToMaxDeadline = Math.max(1, diffMonths(startOfMonth, maxDeadline) + 1)
      const simulationMonths = Math.min(monthsToMaxDeadline + 120, 240)

      const goalStates = activeGoals.map(goal => {
        const currentAmount = currentAmountForGoal(goal)

        return {
          goal,
          currentAmount,
          annualGrowthRate: growthRateForGoal(goal),
          balance: currentAmount,
          startDate: goal.start_date ? getMonthStart(parseLocalDate(goal.start_date)) : startOfMonth,
          deadline: getMonthStart(parseLocalDate(goal.deadline)),
          totalAllocated: 0,
          allocationMonths: 0,
          completionDate: null as Date | null,
          balanceAtDeadline: null as number | null
        }
      })

      for (let monthIndex = 0; monthIndex < simulationMonths; monthIndex += 1) {
        const monthDate = addMonths(startOfMonth, monthIndex)
        const activeThisMonth = goalStates.filter(state => {
          return !state.completionDate && monthDate >= state.startDate
        })

        // Calculate weighted monthly requirements for allocation
        // Goals due sooner and with higher importance get proportionally more
        const goalsWithWeights = activeThisMonth.map(state => {
          const remaining = Math.max(0, state.goal.target_amount - state.balance)
          const monthsUntilDeadline = Math.max(1, diffMonths(monthDate, state.deadline))
          
          // Calculate monthly requirement to meet deadline
          const monthlyRequirement = remaining / monthsUntilDeadline
          
          // Priority captures importance; the deadline independently supplies urgency.
          const weight = goalAllocationWeight(
            monthlyRequirement,
            state.goal.priority,
            monthsUntilDeadline
          )
          
          return { state, weight }
        })

        const totalWeight = goalsWithWeights.reduce((sum, g) => sum + g.weight, 0)

        goalsWithWeights.forEach(({ state, weight }) => {
          const allocationRatio = totalWeight > 0 ? weight / totalWeight : 0
          const allocation = monthlySurplus > 0 ? monthlySurplus * allocationRatio : 0

          if (allocation > 0) {
            state.totalAllocated += allocation
            state.allocationMonths += 1
          }

          const monthlyRate = getMonthlyGrowthRate(state.annualGrowthRate)

          state.balance = state.balance * (1 + monthlyRate) + allocation

          if (!state.balanceAtDeadline && monthDate >= state.deadline) {
            state.balanceAtDeadline = state.balance
          }

          if (!state.completionDate && state.balance >= state.goal.target_amount) {
            state.completionDate = new Date(monthDate)
          }
        })
      }

      const sortedGoals = [...goalStates].sort((a, b) => (b.goal.urgency_score || 3) - (a.goal.urgency_score || 3))

      return sortedGoals.map(state => {
        const monthlyAllocation = state.allocationMonths > 0
          ? state.totalAllocated / state.allocationMonths
          : 0

        const effectiveStart = state.startDate > startOfMonth ? state.startDate : startOfMonth
        const completionMonths = estimateMonthsToComplete(
          state.currentAmount,
          state.goal.target_amount,
          monthlyAllocation,
          state.annualGrowthRate
        )

        const projectedCompletionDate = state.completionDate
          ? state.completionDate
          : (completionMonths !== Infinity
              ? addMonths(effectiveStart, Math.ceil(completionMonths))
              : state.deadline)

        const projectedAmount = Math.min(
          state.balanceAtDeadline ?? state.balance,
          state.goal.target_amount
        )
        const progressPercentage = state.goal.target_amount > 0
          ? (projectedAmount / state.goal.target_amount) * 100
          : 0

        const isOnTrack = Boolean(state.completionDate && state.completionDate <= state.deadline)
        const daysAheadOrBehind = Math.round((state.deadline.getTime() - projectedCompletionDate.getTime()) / (1000 * 60 * 60 * 24))
        const status = statusForGoal({
          progressPercentage,
          completed: Boolean(state.completionDate),
          projectedAfterDeadline: projectedCompletionDate > state.deadline,
          unreachable: completionMonths === Infinity,
          daysAheadOrBehind,
        })

        // Suggest a realistic deadline for behind/at_risk goals
        let suggestedDeadline: string | undefined
        if ((status === 'behind' || status === 'at_risk') && monthlyAllocation > 0) {
          const monthsNeeded = estimateMonthsToComplete(
            state.currentAmount,
            state.goal.target_amount,
            monthlyAllocation,
            state.annualGrowthRate
          )
          if (monthsNeeded !== Infinity && monthsNeeded > 0) {
            const suggested = addMonths(startOfMonth, Math.ceil(monthsNeeded) + 1)
            suggestedDeadline = suggested.toISOString().split('T')[0]
          }
        }

        return {
          goalId: state.goal.id,
          title: state.goal.title,
          targetAmount: state.goal.target_amount,
          currentAmount: state.currentAmount,
          projectedAmount: toCents(projectedAmount),
          totalProjectedProgress: toCents(projectedAmount),
          progressPercentage: toCents(progressPercentage),
          monthlyAllocation: toCents(monthlyAllocation),
          urgencyScore: state.goal.urgency_score || 3,
          originalDeadline: state.goal.deadline,
          projectedCompletionDate: projectedCompletionDate.toISOString().split('T')[0],
          daysUntilProjectedCompletion: diffMonths(startOfMonth, projectedCompletionDate) * 30,
          isOnTrack,
          daysAheadOrBehind,
          status,
          category: state.goal.category,
          suggestedDeadline
        }
      })
    }
    
    // Calculate projections for expected (mid) allocatable surplus
    const goalProjections = [
      ...calculateProjectionsForSurplus(allocatableMid, 'personal'),
      ...calculateProjectionsForSurplus(businessSurplus, 'business'),
    ]

    const result: ProjectionSummary = {
      goals: goalProjections,
      surplusBasis,
      surplusMonthsOfData,
      totalMonthlyIncome: toCents(monthlyIncomeMid),
      totalMonthlyExpenses: toCents(monthlyExpenses),
      monthlySurplus: toCents(surplusMid),
      surplusAllocatedToGoals: toCents(allocatableMid),
      bankReserve: toCents(reserveMid),
      hasVariableIncome,
      oneTimeNet: toCents(oneTimeNet)
    }

    // Add scenarios if variable income
    if (hasVariableIncome) {
      result.scenarios = {
        conservative: calculateProjectionsForSurplus(allocatableLow, 'personal'),
        expected: goalProjections,
        optimistic: calculateProjectionsForSurplus(allocatableHigh, 'personal')
      }
    }
    
    return result
  } catch (error) {
    console.error('Error calculating goal projections:', error)
    return {
      goals: [],
      totalMonthlyIncome: 0,
      totalMonthlyExpenses: 0,
      monthlySurplus: 0,
      surplusAllocatedToGoals: 0,
      bankReserve: 0,
      hasVariableIncome: false
    }
  }
}

// =============================================
// Income Sources
// =============================================

export type IncomeSource = {
  id: string
  user_id: string
  name: string
  description: string | null
  income_type: 'salary' | 'hourly' | 'commission' | 'freelance' | 'other'
  pay_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'variable'
  base_amount: number
  hours_per_week: number
  is_commission_based: boolean
  commission_high: number
  commission_low: number
  commission_frequency_per_period: number
  estimated_monthly_low: number
  estimated_monthly_mid: number
  estimated_monthly_high: number
  status: 'active' | 'paused' | 'ended'
  entity: 'personal' | 'business'
  entity_label: string | null
  start_date: string | null
  end_date: string | null
  // Contract/schedule fields
  initial_payment: number // Down payment / signing bonus at start
  final_payment: number // Completion payment at end
  final_payment_date: string | null // When final payment is expected (can differ from end_date)
  is_primary: boolean
  created_at: string
  updated_at: string
}

// Helper to calculate monthly estimates based on income type and frequency
function calculateMonthlyEstimates(source: Partial<IncomeSource>): { low: number; mid: number; high: number } {
  const baseAmount = source.base_amount || 0
  const frequency = source.pay_frequency || 'monthly'
  
  // Calculate base monthly income
  let baseMonthly = 0
  switch (frequency) {
    case 'weekly':
      baseMonthly = baseAmount * 4.33
      break
    case 'biweekly':
      baseMonthly = baseAmount * 2.17
      break
    case 'semimonthly':
      baseMonthly = baseAmount * 2
      break
    case 'monthly':
    case 'variable':
      baseMonthly = baseAmount
      break
  }
  
  // For hourly, calculate based on hours per week
  if (source.income_type === 'hourly' && source.hours_per_week) {
    baseMonthly = baseAmount * source.hours_per_week * 4.33
  }
  
  // If commission-based, calculate the variable component
  if (source.is_commission_based) {
    const commissionLow = source.commission_low || 0
    const commissionHigh = source.commission_high || 0
    const frequency = source.commission_frequency_per_period || 0
    
    // Calculate per pay period commission
    const commissionPerPeriodLow = commissionLow * frequency
    const commissionPerPeriodHigh = commissionHigh * frequency
    const commissionPerPeriodMid = ((commissionLow + commissionHigh) / 2) * frequency
    
    // Convert to monthly based on pay frequency
    let commissionMultiplier = 1
    switch (source.pay_frequency) {
      case 'weekly':
        commissionMultiplier = 4.33
        break
      case 'biweekly':
        commissionMultiplier = 2.17
        break
      case 'semimonthly':
        commissionMultiplier = 2
        break
      case 'monthly':
      case 'variable':
        commissionMultiplier = 1
        break
    }
    
    const monthlyCommissionLow = commissionPerPeriodLow * commissionMultiplier
    const monthlyCommissionMid = commissionPerPeriodMid * commissionMultiplier
    const monthlyCommissionHigh = commissionPerPeriodHigh * commissionMultiplier
    
    baseMonthly += monthlyCommissionMid
    
    // For contract income with schedule, amortize initial/final payments
    const { initialAmortized, finalAmortized } = calculateContractAmortization(source)
    
    return {
      low: toCents((baseMonthly + monthlyCommissionLow - monthlyCommissionMid + initialAmortized + finalAmortized)),
      mid: toCents((baseMonthly + initialAmortized + finalAmortized)),
      high: toCents((baseMonthly + monthlyCommissionHigh - monthlyCommissionMid + initialAmortized + finalAmortized))
    }
  }
  
  // For contract income with schedule, amortize initial/final payments over duration
  const { initialAmortized, finalAmortized } = calculateContractAmortization(source)
  const totalMonthly = baseMonthly + initialAmortized + finalAmortized
  
  // Non-commission income has same low/mid/high
  return {
    low: toCents(totalMonthly),
    mid: toCents(totalMonthly),
    high: toCents(totalMonthly)
  }
}

// Helper to calculate amortized monthly value of initial/final payments
function calculateContractAmortization(source: Partial<IncomeSource>): { 
  initialAmortized: number
  finalAmortized: number
  contractMonths: number 
} {
  const initialPayment = source.initial_payment || 0
  const finalPayment = source.final_payment || 0
  
  // No contract payments to amortize
  if (initialPayment === 0 && finalPayment === 0) {
    return { initialAmortized: 0, finalAmortized: 0, contractMonths: 0 }
  }
  
  // Calculate contract duration in months
  let contractMonths = 0
  
  if (source.start_date && source.end_date) {
    const startDate = new Date(source.start_date)
    const endDate = new Date(source.end_date)
    const diffTime = endDate.getTime() - startDate.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    contractMonths = Math.max(1, Math.round(diffDays / 30.44))
  } else if (source.start_date && source.final_payment_date) {
    // Use final payment date as pseudo end date
    const startDate = new Date(source.start_date)
    const endDate = new Date(source.final_payment_date)
    const diffTime = endDate.getTime() - startDate.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    contractMonths = Math.max(1, Math.round(diffDays / 30.44))
  }
  
  // If no duration can be calculated, don't amortize (show as one-time)
  if (contractMonths === 0) {
    return { initialAmortized: 0, finalAmortized: 0, contractMonths: 0 }
  }
  
  // Amortize payments over contract duration for monthly estimate
  const initialAmortized = initialPayment / contractMonths
  const finalAmortized = finalPayment / contractMonths
  
  return { initialAmortized, finalAmortized, contractMonths }
}

// Get total contract value (useful for displaying full contract worth)
export function calculateTotalContractValue(source: IncomeSource): {
  totalValue: number
  recurringTotal: number
  initialPayment: number
  finalPayment: number
  contractMonths: number
  isContract: boolean
} {
  const hasSchedule = Boolean(source.start_date || source.end_date || source.initial_payment || source.final_payment)
  
  if (!hasSchedule) {
    return {
      totalValue: 0,
      recurringTotal: 0,
      initialPayment: 0,
      finalPayment: 0,
      contractMonths: 0,
      isContract: false
    }
  }
  
  // Calculate contract duration
  let contractMonths = 0
  if (source.start_date && source.end_date) {
    const startDate = new Date(source.start_date)
    const endDate = new Date(source.end_date)
    const diffTime = endDate.getTime() - startDate.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    contractMonths = Math.max(1, Math.round(diffDays / 30.44))
  }
  
  // Calculate recurring portion - exclude amortized initial/final to avoid double counting
  const { initialAmortized, finalAmortized } = calculateContractAmortization(source)
  const recurringTotal = (source.estimated_monthly_mid - initialAmortized - finalAmortized) * contractMonths
  
  const totalValue = recurringTotal + (source.initial_payment || 0) + (source.final_payment || 0)
  
  return {
    totalValue: toCents(totalValue),
    recurringTotal: toCents(recurringTotal),
    initialPayment: source.initial_payment || 0,
    finalPayment: source.final_payment || 0,
    contractMonths,
    isContract: true
  }
}

function rowToIncomeSource(row: Record<string, unknown>): IncomeSource {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    description: row.description as string | null,
    income_type: row.income_type as IncomeSource['income_type'],
    pay_frequency: row.pay_frequency as IncomeSource['pay_frequency'],
    base_amount: row.base_amount as number,
    hours_per_week: row.hours_per_week as number,
    is_commission_based: Boolean(row.is_commission_based),
    commission_high: row.commission_high as number,
    commission_low: row.commission_low as number,
    commission_frequency_per_period: row.commission_frequency_per_period as number,
    estimated_monthly_low: row.estimated_monthly_low as number,
    estimated_monthly_mid: row.estimated_monthly_mid as number,
    estimated_monthly_high: row.estimated_monthly_high as number,
    status: row.status as IncomeSource['status'],
    entity: (row.entity as IncomeSource['entity']) ?? 'personal',
    entity_label: (row.entity_label as string | null) ?? null,
    start_date: row.start_date as string | null,
    end_date: row.end_date as string | null,
    initial_payment: (row.initial_payment as number) || 0,
    final_payment: (row.final_payment as number) || 0,
    final_payment_date: row.final_payment_date as string | null,
    is_primary: Boolean(row.is_primary),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }
}

export const getIncomeSources = async (userId: string): Promise<IncomeSource[]> => {
  const result = await db.execute({
    sql: 'SELECT * FROM income_sources WHERE user_id = ? AND status != ? ORDER BY is_primary DESC, created_at DESC',
    args: [userId, 'ended']
  })
  return result.rows.map(row => rowToIncomeSource(row as Record<string, unknown>))
}

export const getIncomeSourceById = async (userId: string, id: string): Promise<IncomeSource | null> => {
  const result = await db.execute({
    sql: 'SELECT * FROM income_sources WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })
  return result.rows.length > 0 ? rowToIncomeSource(result.rows[0] as Record<string, unknown>) : null
}

export const createIncomeSource = async (source: Omit<IncomeSource, 'id' | 'created_at' | 'updated_at' | 'estimated_monthly_low' | 'estimated_monthly_mid' | 'estimated_monthly_high'>): Promise<IncomeSource> => {
  const id = generateUUID()
  const now = getCurrentTimestamp()
  
  // Calculate monthly estimates
  const estimates = calculateMonthlyEstimates(source)
  
  await db.execute({
    sql: `INSERT INTO income_sources (
      id, user_id, name, description, income_type, pay_frequency,
      base_amount, hours_per_week, is_commission_based,
      commission_high, commission_low, commission_frequency_per_period,
      estimated_monthly_low, estimated_monthly_mid, estimated_monthly_high,
      status, start_date, end_date,
      initial_payment, final_payment, final_payment_date,
      is_primary, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, source.user_id, source.name, source.description || null,
      source.income_type, source.pay_frequency,
      source.base_amount || 0, source.hours_per_week || 0,
      source.is_commission_based ? 1 : 0,
      source.commission_high || 0, source.commission_low || 0,
      source.commission_frequency_per_period || 0,
      estimates.low, estimates.mid, estimates.high,
      source.status || 'active',
      source.start_date || null, source.end_date || null,
      source.initial_payment || 0, source.final_payment || 0,
      source.final_payment_date || null,
      source.is_primary ? 1 : 0, now, now
    ]
  })
  
  return getIncomeSourceById(source.user_id, id) as Promise<IncomeSource>
}

export const updateIncomeSource = async (userId: string, id: string, updates: Partial<IncomeSource>): Promise<IncomeSource> => {
  const now = getCurrentTimestamp()
  
  // Get current source to merge with updates for estimate calculation
  const current = await getIncomeSourceById(userId, id)
  if (!current) throw new Error('Income source not found')
  
  const merged = { ...current, ...updates }
  const estimates = calculateMonthlyEstimates(merged)
  
  const fields: string[] = []
  const values: (string | number | boolean | null)[] = []
  
  // Build dynamic update query
  const allowedFields = [
    'name', 'description', 'income_type', 'pay_frequency',
    'base_amount', 'hours_per_week', 'is_commission_based',
    'commission_high', 'commission_low', 'commission_frequency_per_period',
    'status', 'start_date', 'end_date',
    'initial_payment', 'final_payment', 'final_payment_date',
    'is_primary'
  ]
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`)
      if (key === 'is_commission_based' || key === 'is_primary') {
        values.push(value ? 1 : 0)
      } else {
        values.push(value ?? null)
      }
    }
  }
  
  // Always update estimates and timestamp
  fields.push('estimated_monthly_low = ?', 'estimated_monthly_mid = ?', 'estimated_monthly_high = ?', 'updated_at = ?')
  values.push(estimates.low, estimates.mid, estimates.high, now)
  values.push(id)
  
  await db.execute({
    sql: `UPDATE income_sources SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    args: values
  })
  
  return getIncomeSourceById(userId, id) as Promise<IncomeSource>
}

export const deleteIncomeSource = async (userId: string, id: string): Promise<void> => {
  await db.execute({
    sql: 'UPDATE income_sources SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?',
    args: ['ended', getCurrentTimestamp(), id, userId]
  })
}

// Get income summary for a user (used in dashboard/summary)
export const getIncomeSummary = async (userId: string) => {
  const sources = await getIncomeSources(userId)
  const activeSources = sources.filter(s => isIncomeSourceActive(s))
  
  const hasCommissionIncome = activeSources.some(s => s.is_commission_based)
  
  const totalMonthlyLow = activeSources.reduce((sum, s) => sum + s.estimated_monthly_low, 0)
  const totalMonthlyMid = activeSources.reduce((sum, s) => sum + s.estimated_monthly_mid, 0)
  const totalMonthlyHigh = activeSources.reduce((sum, s) => sum + s.estimated_monthly_high, 0)
  
  const primarySource = activeSources.find(s => s.is_primary)
  
  return {
    sources: activeSources,
    hasCommissionIncome,
    totalMonthlyLow: toCents(totalMonthlyLow),
    totalMonthlyMid: toCents(totalMonthlyMid),
    totalMonthlyHigh: toCents(totalMonthlyHigh),
    primarySource: primarySource || null,
    sourceCount: activeSources.length
  }
}

// =============================================
// AI Financial Reports
// =============================================

export type AIFinancialReport = {
  id: string
  user_id: string
  report_content: string
  financial_health_score: number | null
  context_hash: string
  model_used: string
  total_monthly_income: number
  total_monthly_expenses: number
  total_goals_amount: number
  active_goals_count: number
  generated_at: string
  created_at: string
  updated_at: string
}

function rowToAIFinancialReport(row: Record<string, unknown>): AIFinancialReport {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    report_content: row.report_content as string,
    financial_health_score: row.financial_health_score as number | null,
    context_hash: row.context_hash as string,
    model_used: row.model_used as string,
    total_monthly_income: row.total_monthly_income as number,
    total_monthly_expenses: row.total_monthly_expenses as number,
    total_goals_amount: row.total_goals_amount as number,
    active_goals_count: row.active_goals_count as number,
    generated_at: row.generated_at as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }
}

export const getAIFinancialReport = async (userId: string): Promise<AIFinancialReport | null> => {
  const result = await db.execute({
    sql: 'SELECT * FROM ai_financial_reports WHERE user_id = ?',
    args: [userId]
  })
  
  if (!result.rows[0]) return null
  if (result.rows.length === 0) {
    throw new Error('Record not found or not owned by this user')
  }

  return rowToAIFinancialReport(result.rows[0] as Record<string, unknown>)
}

export const createOrUpdateAIFinancialReport = async (
  userId: string,
  reportContent: string,
  contextHash: string,
  modelUsed: string,
  metrics: {
    financialHealthScore?: number
    totalMonthlyIncome: number
    totalMonthlyExpenses: number
    totalGoalsAmount: number
    activeGoalsCount: number
  }
): Promise<AIFinancialReport> => {
  const now = getCurrentTimestamp()
  const existingReport = await getAIFinancialReport(userId)
  
  if (existingReport) {
    // Update existing report
    await db.execute({
      sql: `UPDATE ai_financial_reports SET 
        report_content = ?,
        financial_health_score = ?,
        context_hash = ?,
        model_used = ?,
        total_monthly_income = ?,
        total_monthly_expenses = ?,
        total_goals_amount = ?,
        active_goals_count = ?,
        generated_at = ?,
        updated_at = ?
        WHERE user_id = ?`,
      args: [
        reportContent,
        metrics.financialHealthScore ?? null,
        contextHash,
        modelUsed,
        metrics.totalMonthlyIncome,
        metrics.totalMonthlyExpenses,
        metrics.totalGoalsAmount,
        metrics.activeGoalsCount,
        now,
        now,
        userId
      ]
    })
  } else {
    // Create new report
    const id = generateUUID()
    await db.execute({
      sql: `INSERT INTO ai_financial_reports (
        id, user_id, report_content, financial_health_score, context_hash, model_used,
        total_monthly_income, total_monthly_expenses, total_goals_amount, active_goals_count,
        generated_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        userId,
        reportContent,
        metrics.financialHealthScore ?? null,
        contextHash,
        modelUsed,
        metrics.totalMonthlyIncome,
        metrics.totalMonthlyExpenses,
        metrics.totalGoalsAmount,
        metrics.activeGoalsCount,
        now,
        now,
        now
      ]
    })
  }
  
  const result = await getAIFinancialReport(userId)
  if (!result) throw new Error('Failed to create/update AI financial report')
  return result
}

// Generate a hash of financial data to detect changes
export const generateFinancialContextHash = (data: {
  goals: Goal[]
  recurringExpenses: RecurringExpense[]
  incomeSources: IncomeSource[]
  sideProjects: SideProject[]
  financialAccounts?: FinancialAccount[]
  oneTimeIncomes?: OneTimeIncome[]
}): string => {
  const contextData = {
    goals: data.goals.map(g => ({
      id: g.id,
      amount: g.target_amount,
      current: g.current_amount,
      start: g.start_date,
      deadline: g.deadline
    })),
    expenses: data.recurringExpenses.map(e => ({
      id: e.id,
      amount: e.amount,
      description: e.description
    })),
    income: data.incomeSources.map(i => ({
      id: i.id,
      low: i.estimated_monthly_low,
      mid: i.estimated_monthly_mid,
      high: i.estimated_monthly_high,
      description: i.description
    })),
    projects: data.sideProjects.map(p => ({ id: p.id, earnings: p.current_monthly_earnings })),
    accounts: data.financialAccounts?.map(a => ({ id: a.id, type: a.account_type, balance: a.balance })) || [],
    oneTime: data.oneTimeIncomes?.map(o => ({ id: o.id, amount: o.amount, applied: o.applied_to_goals })) || [],
    oneTimeTransactions: (data as { oneTimeTransactions?: Transaction[] }).oneTimeTransactions?.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      date: t.transaction_date
    })) || []
  }
  // Simple hash based on JSON string
  const jsonStr = JSON.stringify(contextData)
  let hash = 0
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(16)
}

// Build context for AI prompt
export const buildAIContext = async (userId: string) => {
  const [goals, recurringExpenses, incomeSources, sideProjects, financialAccounts, oneTimeIncomes, oneTimeTransactions] = await Promise.all([
    getGoals(userId),
    getRecurringExpenses(userId),
    getIncomeSources(userId).catch(() => []),
    getSideProjects(userId),
    getFinancialAccounts(userId).catch(() => []),
    getOneTimeIncomes(userId).catch(() => []),
    getTransactionsForMonth(userId)
  ])
  
  const activeGoals = goals.filter(g => g.status === 'active')
  const activeSources = incomeSources.filter(s => isIncomeSourceActive(s))
  const activeSideProjects = sideProjects.filter(p => p.status === 'active')
  
  // Calculate income estimates
  const hasVariableIncome = activeSources.some(s => s.is_commission_based)
  const totalMonthlyLow = activeSources.reduce((sum, s) => sum + s.estimated_monthly_low, 0)
  const totalMonthlyMid = activeSources.reduce((sum, s) => sum + s.estimated_monthly_mid, 0)
  const totalMonthlyHigh = activeSources.reduce((sum, s) => sum + s.estimated_monthly_high, 0)
  
  // Side project income
  const sideProjectIncome = activeSideProjects.reduce((sum, p) => sum + p.current_monthly_earnings, 0)
  
  // Recurring expenses total
  const monthlyExpenses = recurringExpenses.reduce((sum, e) => sum + e.amount, 0)
  
  // Calculate goal requirements
  const today = new Date()
  const goalsWithTimeline = activeGoals.map(goal => {
    const deadline = new Date(goal.deadline)
    const startDate = goal.start_date ? new Date(goal.start_date) : today
    const effectiveStart = startDate > today ? startDate : today
    const monthsLeft = Math.max(1, Math.round((deadline.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
    const remainingAmount = goal.target_amount - goal.current_amount
    const monthlyRequired = calculateMonthlyRequired(
      goal.target_amount,
      goal.current_amount,
      monthsLeft,
      goal.category === 'investment' ? goal.interest_rate : null
    )
    
    return {
      title: goal.title,
      category: goal.category,
      targetAmount: goal.target_amount,
      currentAmount: goal.current_amount,
      remainingAmount,
      startDate: goal.start_date,
      interestRate: goal.interest_rate,
      deadline: goal.deadline,
      monthsRemaining: monthsLeft,
      monthlyRequired: toCents(monthlyRequired),
      progressPercentage: Math.round((goal.current_amount / goal.target_amount) * 100),
      priority: goal.priority,
      urgencyScore: goal.urgency_score
    }
  })
  
  const totalGoalsAmount = activeGoals.reduce((sum, g) => sum + g.target_amount, 0)
  const totalGoalsRemaining = activeGoals.reduce((sum, g) => sum + (g.target_amount - g.current_amount), 0)
  const monthlyGoalRequirements = goalsWithTimeline.reduce((sum, g) => sum + g.monthlyRequired, 0)
  
  // Calculate account balances
  const checkingBalance = financialAccounts
    .filter(a => a.account_type === 'checking')
    .reduce((sum, a) => sum + a.balance, 0)
  const savingsBalance = financialAccounts
    .filter(a => a.account_type === 'savings')
    .reduce((sum, a) => sum + a.balance, 0)
  const totalAccountBalance = checkingBalance + savingsBalance
  
  // Calculate one-time income
  const unappliedOneTimeIncome = oneTimeIncomes
    .filter(i => !i.applied_to_goals)
    .reduce((sum, i) => sum + i.amount, 0)
  const appliedOneTimeIncome = oneTimeIncomes
    .filter(i => i.applied_to_goals)
    .reduce((sum, i) => sum + i.amount, 0)

  const oneTimeTransactionNet = oneTimeTransactions.reduce((sum, t) => {
    return sum + (t.type === 'income' ? t.amount : -t.amount)
  }, 0)
  
  // Calculate financial metrics
  const totalMonthlyIncome = totalMonthlyMid + sideProjectIncome
  const totalMonthlyObligations = monthlyExpenses + monthlyGoalRequirements
  const monthlySurplus = totalMonthlyIncome - totalMonthlyObligations
  const savingsRate = totalMonthlyIncome > 0 ? (monthlyGoalRequirements / totalMonthlyIncome) * 100 : 0
  
  return {
    incomeSources: {
      totalMonthlyLow: totalMonthlyLow + sideProjectIncome,
      totalMonthlyMid: totalMonthlyMid + sideProjectIncome,
      totalMonthlyHigh: totalMonthlyHigh + sideProjectIncome,
      hasVariableIncome,
      sources: activeSources.map(s => ({
        name: s.name,
        type: s.income_type,
        isCommissionBased: s.is_commission_based,
        description: s.description,
        monthlyEstimate: {
          low: s.estimated_monthly_low,
          mid: s.estimated_monthly_mid,
          high: s.estimated_monthly_high
        }
      }))
    },
    goals: goalsWithTimeline,
    expenses: recurringExpenses.map(e => ({
      name: e.name,
      amount: e.amount,
      category: e.category,
      description: e.description
    })),
    sideProjects: activeSideProjects.map(p => ({
      name: p.name,
      monthlyEarnings: p.current_monthly_earnings,
      status: p.status
    })),
    oneTimeTransactions: oneTimeTransactions.map(t => ({
      type: t.type,
      amount: t.amount,
      description: t.description,
      date: t.transaction_date
    })),
    accounts: {
      checking: {
        count: financialAccounts.filter(a => a.account_type === 'checking').length,
        balance: checkingBalance,
        accounts: financialAccounts.filter(a => a.account_type === 'checking').map(a => ({
          name: a.name,
          balance: a.balance,
          institution: a.institution
        }))
      },
      savings: {
        count: financialAccounts.filter(a => a.account_type === 'savings').length,
        balance: savingsBalance,
        accounts: financialAccounts.filter(a => a.account_type === 'savings').map(a => ({
          name: a.name,
          balance: a.balance,
          institution: a.institution
        }))
      },
      totalBalance: totalAccountBalance
    },
    oneTimeIncome: {
      unapplied: oneTimeIncomes.filter(i => !i.applied_to_goals).map(i => ({
        amount: i.amount,
        description: i.description,
        source: i.source,
        date: i.income_date
      })),
      unappliedTotal: unappliedOneTimeIncome,
      appliedTotal: appliedOneTimeIncome,
      totalReceived: unappliedOneTimeIncome + appliedOneTimeIncome
    },
    metrics: {
      totalMonthlyIncome,
      totalMonthlyExpenses: monthlyExpenses,
      totalMonthlyObligations,
      monthlySurplus,
      savingsRate: toCents(savingsRate),
      totalGoalsAmount,
      totalGoalsRemaining,
      activeGoalsCount: activeGoals.length,
      recurringExpensesCount: recurringExpenses.length,
      // New account metrics
      checkingBalance,
      savingsBalance,
      totalAccountBalance,
      unappliedOneTimeIncome,
      oneTimeTransactionNet,
      // Financial cushion: savings + unapplied one-time income
      financialCushion: savingsBalance + unappliedOneTimeIncome
    },
    // Raw data for hash generation
    _rawData: {
      goals,
      recurringExpenses,
      incomeSources,
      sideProjects,
      financialAccounts,
      oneTimeIncomes,
      oneTimeTransactions
    }
  }
}

// =============================================
// Financial Accounts (Checking & Savings)
// =============================================

export type FinancialAccount = {
  id: string
  user_id: string
  account_type: 'checking' | 'savings'
  name: string
  balance: number
  institution: string | null
  notes: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

function rowToFinancialAccount(row: Record<string, unknown>): FinancialAccount {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    account_type: row.account_type as FinancialAccount['account_type'],
    name: row.name as string,
    balance: row.balance as number,
    institution: row.institution as string | null,
    notes: row.notes as string | null,
    is_primary: Boolean(row.is_primary),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }
}

export const getFinancialAccounts = async (userId: string): Promise<FinancialAccount[]> => {
  const result = await db.execute({
    sql: 'SELECT * FROM financial_accounts WHERE user_id = ? ORDER BY is_primary DESC, account_type ASC, created_at DESC',
    args: [userId]
  })
  return result.rows.map(row => rowToFinancialAccount(row as Record<string, unknown>))
}

export const getFinancialAccountById = async (userId: string, id: string): Promise<FinancialAccount | null> => {
  const result = await db.execute({
    sql: 'SELECT * FROM financial_accounts WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })
  return result.rows.length > 0 ? rowToFinancialAccount(result.rows[0] as Record<string, unknown>) : null
}

export const createFinancialAccount = async (account: Omit<FinancialAccount, 'id' | 'created_at' | 'updated_at'>): Promise<FinancialAccount> => {
  const id = generateUUID()
  const now = getCurrentTimestamp()
  
  await db.execute({
    sql: `INSERT INTO financial_accounts (id, user_id, account_type, name, balance, institution, notes, is_primary, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      account.user_id,
      account.account_type,
      account.name,
      account.balance || 0,
      account.institution || null,
      account.notes || null,
      account.is_primary ? 1 : 0,
      now,
      now
    ]
  })
  
  return getFinancialAccountById(account.user_id, id) as Promise<FinancialAccount>
}

export const updateFinancialAccount = async (userId: string, id: string, updates: Partial<FinancialAccount>): Promise<FinancialAccount> => {
  const now = getCurrentTimestamp()
  const fields: string[] = ['updated_at = ?']
  const args: (string | number | null)[] = [now]
  
  if (updates.name !== undefined) {
    fields.push('name = ?')
    args.push(updates.name)
  }
  if (updates.balance !== undefined) {
    fields.push('balance = ?')
    args.push(updates.balance)
  }
  if (updates.institution !== undefined) {
    fields.push('institution = ?')
    args.push(updates.institution)
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?')
    args.push(updates.notes)
  }
  if (updates.is_primary !== undefined) {
    fields.push('is_primary = ?')
    args.push(updates.is_primary ? 1 : 0)
  }
  if (updates.account_type !== undefined) {
    fields.push('account_type = ?')
    args.push(updates.account_type)
  }
  
  args.push(id, userId)
  
  await db.execute({
    sql: `UPDATE financial_accounts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    args
  })
  
  return getFinancialAccountById(userId, id) as Promise<FinancialAccount>
}

export const deleteFinancialAccount = async (userId: string, id: string): Promise<void> => {
  await db.execute({
    sql: 'DELETE FROM financial_accounts WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })
}

// Get account summary for a user
export const getAccountsSummary = async (userId: string) => {
  const accounts = await getFinancialAccounts(userId)
  
  const checkingAccounts = accounts.filter(a => a.account_type === 'checking')
  const savingsAccounts = accounts.filter(a => a.account_type === 'savings')
  
  const totalChecking = checkingAccounts.reduce((sum, a) => sum + a.balance, 0)
  const totalSavings = savingsAccounts.reduce((sum, a) => sum + a.balance, 0)
  const totalBalance = totalChecking + totalSavings
  
  return {
    accounts,
    checkingAccounts,
    savingsAccounts,
    totalChecking: toCents(totalChecking),
    totalSavings: toCents(totalSavings),
    totalBalance: toCents(totalBalance),
    checkingCount: checkingAccounts.length,
    savingsCount: savingsAccounts.length
  }
}

// =============================================
// One-Time Income
// =============================================

export type OneTimeIncome = {
  id: string
  user_id: string
  amount: number
  description: string
  source: 'sale' | 'gift' | 'bonus' | 'refund' | 'cashback' | 'settlement' | 'inheritance' | 'other'
  income_date: string
  applied_to_goals: boolean
  goal_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

function rowToOneTimeIncome(row: Record<string, unknown>): OneTimeIncome {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    amount: row.amount as number,
    description: row.description as string,
    source: row.source as OneTimeIncome['source'],
    income_date: row.income_date as string,
    applied_to_goals: Boolean(row.applied_to_goals),
    goal_id: row.goal_id as string | null,
    notes: row.notes as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }
}

export const getOneTimeIncomes = async (userId: string): Promise<OneTimeIncome[]> => {
  const result = await db.execute({
    sql: 'SELECT * FROM one_time_income WHERE user_id = ? ORDER BY income_date DESC, created_at DESC',
    args: [userId]
  })
  return result.rows.map(row => rowToOneTimeIncome(row as Record<string, unknown>))
}

export const getOneTimeIncomeById = async (userId: string, id: string): Promise<OneTimeIncome | null> => {
  const result = await db.execute({
    sql: 'SELECT * FROM one_time_income WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })
  return result.rows.length > 0 ? rowToOneTimeIncome(result.rows[0] as Record<string, unknown>) : null
}

export const getUnappliedOneTimeIncomes = async (userId: string): Promise<OneTimeIncome[]> => {
  const result = await db.execute({
    sql: 'SELECT * FROM one_time_income WHERE user_id = ? AND applied_to_goals = 0 ORDER BY income_date DESC',
    args: [userId]
  })
  return result.rows.map(row => rowToOneTimeIncome(row as Record<string, unknown>))
}

export const createOneTimeIncome = async (income: Omit<OneTimeIncome, 'id' | 'created_at' | 'updated_at'>): Promise<OneTimeIncome> => {
  const id = generateUUID()
  const now = getCurrentTimestamp()
  const today = getCurrentDate()
  
  await db.execute({
    sql: `INSERT INTO one_time_income (id, user_id, amount, description, source, income_date, applied_to_goals, goal_id, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      income.user_id,
      income.amount,
      income.description,
      income.source,
      income.income_date || today,
      income.applied_to_goals ? 1 : 0,
      income.goal_id || null,
      income.notes || null,
      now,
      now
    ]
  })
  
  return getOneTimeIncomeById(income.user_id, id) as Promise<OneTimeIncome>
}

export const updateOneTimeIncome = async (userId: string, id: string, updates: Partial<OneTimeIncome>): Promise<OneTimeIncome> => {
  const now = getCurrentTimestamp()
  const fields: string[] = ['updated_at = ?']
  const args: (string | number | null)[] = [now]
  
  if (updates.amount !== undefined) {
    fields.push('amount = ?')
    args.push(updates.amount)
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    args.push(updates.description)
  }
  if (updates.source !== undefined) {
    fields.push('source = ?')
    args.push(updates.source)
  }
  if (updates.income_date !== undefined) {
    fields.push('income_date = ?')
    args.push(updates.income_date)
  }
  if (updates.applied_to_goals !== undefined) {
    fields.push('applied_to_goals = ?')
    args.push(updates.applied_to_goals ? 1 : 0)
  }
  if (updates.goal_id !== undefined) {
    fields.push('goal_id = ?')
    args.push(updates.goal_id)
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?')
    args.push(updates.notes)
  }
  
  args.push(id, userId)
  
  await db.execute({
    sql: `UPDATE one_time_income SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    args
  })
  
  return getOneTimeIncomeById(userId, id) as Promise<OneTimeIncome>
}

export const deleteOneTimeIncome = async (userId: string, id: string): Promise<void> => {
  await db.execute({
    sql: 'DELETE FROM one_time_income WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })
}

// Apply one-time income to a goal (updates both the income record and the goal's current_amount)
export const applyOneTimeIncomeToGoal = async (userId: string, incomeId: string, goalId: string): Promise<{ income: OneTimeIncome, goal: Goal }> => {
  const income = await getOneTimeIncomeById(userId, incomeId)
  if (!income) throw new Error('One-time income not found')
  if (income.applied_to_goals) throw new Error('Income already applied to a goal')
  
  const goal = await db.execute({
    sql: 'SELECT * FROM financial_goals WHERE id = ? AND user_id = ?',
    args: [goalId, userId]
  })
  if (!goal.rows[0]) throw new Error('Goal not found')
  
  const currentGoal = rowToGoal(goal.rows[0] as Record<string, unknown>)
  const newAmount = Math.min(currentGoal.current_amount + income.amount, currentGoal.target_amount)
  
  // Update the goal's current_amount
  const updatedGoal = await updateGoal(userId, goalId, { 
    current_amount: newAmount,
    status: newAmount >= currentGoal.target_amount ? 'completed' : currentGoal.status
  })
  
  // Mark the income as applied
  const updatedIncome = await updateOneTimeIncome(userId, incomeId, {
    applied_to_goals: true,
    goal_id: goalId
  })
  
  return { income: updatedIncome, goal: updatedGoal }
}

// Get one-time income summary
export const getOneTimeIncomeSummary = async (userId: string) => {
  const incomes = await getOneTimeIncomes(userId)
  
  const appliedIncomes = incomes.filter(i => i.applied_to_goals)
  const unappliedIncomes = incomes.filter(i => !i.applied_to_goals)
  
  const totalAmount = incomes.reduce((sum, i) => sum + i.amount, 0)
  const appliedAmount = appliedIncomes.reduce((sum, i) => sum + i.amount, 0)
  const unappliedAmount = unappliedIncomes.reduce((sum, i) => sum + i.amount, 0)
  
  // Get recent (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentIncomes = incomes.filter(i => new Date(i.income_date) >= thirtyDaysAgo)
  const recentTotal = recentIncomes.reduce((sum, i) => sum + i.amount, 0)
  
  return {
    incomes,
    appliedIncomes,
    unappliedIncomes,
    totalAmount: toCents(totalAmount),
    appliedAmount: toCents(appliedAmount),
    unappliedAmount: toCents(unappliedAmount),
    recentTotal: toCents(recentTotal),
    totalCount: incomes.length,
    unappliedCount: unappliedIncomes.length
  }
}
