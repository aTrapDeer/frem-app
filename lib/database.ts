import { db, generateUUID, getCurrentTimestamp, getCurrentDate } from './turso'

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
  deadline: string
  priority: 'low' | 'medium' | 'high'
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  created_at: string
  updated_at: string
  completed_at: string | null
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
    deadline: row.deadline as string,
    priority: row.priority as Goal['priority'],
    status: row.status as Goal['status'],
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
    sql: 'SELECT * FROM daily_transactions WHERE id = ?',
    args: [id]
  })
  
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

export const updateTransaction = async (id: string, updates: Partial<Transaction>): Promise<Transaction> => {
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
  
  args.push(id)
  
  await db.execute({
    sql: `UPDATE daily_transactions SET ${fields.join(', ')} WHERE id = ?`,
    args
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM daily_transactions WHERE id = ?',
    args: [id]
  })
  
  return rowToTransaction(result.rows[0] as Record<string, unknown>)
}

export const deleteTransaction = async (id: string): Promise<void> => {
  await db.execute({
    sql: 'DELETE FROM daily_transactions WHERE id = ?',
    args: [id]
  })
}

// =============================================
// Financial Goals
// =============================================

export const createGoal = async (goal: Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'completed_at'>): Promise<Goal> => {
  const id = generateUUID()
  const now = getCurrentTimestamp()
  
  await db.execute({
    sql: `INSERT INTO financial_goals (id, user_id, title, description, target_amount, current_amount, category, deadline, priority, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      goal.user_id,
      goal.title,
      goal.description ?? null,
      goal.target_amount,
      goal.current_amount ?? 0,
      goal.category,
      goal.deadline,
      goal.priority ?? 'medium',
      goal.status ?? 'active',
      now,
      now
    ]
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM financial_goals WHERE id = ?',
    args: [id]
  })
  
  return rowToGoal(result.rows[0] as Record<string, unknown>)
}

export const getGoals = async (userId: string): Promise<Goal[]> => {
  const result = await db.execute({
    sql: 'SELECT * FROM financial_goals WHERE user_id = ? ORDER BY created_at DESC',
    args: [userId]
  })
  
  return result.rows.map(row => rowToGoal(row as Record<string, unknown>))
}

export const updateGoal = async (id: string, updates: Partial<Goal>): Promise<Goal> => {
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
  if (updates.deadline !== undefined) {
    fields.push('deadline = ?')
    args.push(updates.deadline)
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
  
  args.push(id)
  
  await db.execute({
    sql: `UPDATE financial_goals SET ${fields.join(', ')} WHERE id = ?`,
    args
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM financial_goals WHERE id = ?',
    args: [id]
  })
  
  return rowToGoal(result.rows[0] as Record<string, unknown>)
}

export const deleteGoal = async (id: string): Promise<void> => {
  await db.execute({
    sql: 'DELETE FROM financial_goals WHERE id = ?',
    args: [id]
  })
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
    sql: 'SELECT * FROM recurring_expenses WHERE id = ?',
    args: [id]
  })
  
  return rowToRecurringExpense(result.rows[0] as Record<string, unknown>)
}

export const getRecurringExpenses = async (userId: string): Promise<RecurringExpense[]> => {
  const result = await db.execute({
    sql: 'SELECT * FROM recurring_expenses WHERE user_id = ? AND status = ? ORDER BY due_date ASC',
    args: [userId, 'active']
  })
  
  return result.rows.map(row => rowToRecurringExpense(row as Record<string, unknown>))
}

export const updateRecurringExpense = async (id: string, updates: Partial<RecurringExpense>): Promise<RecurringExpense> => {
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
  
  args.push(id)
  
  await db.execute({
    sql: `UPDATE recurring_expenses SET ${fields.join(', ')} WHERE id = ?`,
    args
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM recurring_expenses WHERE id = ?',
    args: [id]
  })
  
  return rowToRecurringExpense(result.rows[0] as Record<string, unknown>)
}

export const deleteRecurringExpense = async (id: string): Promise<void> => {
  await db.execute({
    sql: 'DELETE FROM recurring_expenses WHERE id = ?',
    args: [id]
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
    sql: 'SELECT * FROM side_projects WHERE id = ?',
    args: [id]
  })
  
  return rowToSideProject(result.rows[0] as Record<string, unknown>)
}

export const getSideProjects = async (userId: string): Promise<SideProject[]> => {
  const result = await db.execute({
    sql: 'SELECT * FROM side_projects WHERE user_id = ? ORDER BY created_at DESC',
    args: [userId]
  })
  
  return result.rows.map(row => rowToSideProject(row as Record<string, unknown>))
}

export const updateSideProject = async (id: string, updates: Partial<SideProject>): Promise<SideProject> => {
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
  
  args.push(id)
  
  await db.execute({
    sql: `UPDATE side_projects SET ${fields.join(', ')} WHERE id = ?`,
    args
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM side_projects WHERE id = ?',
    args: [id]
  })
  
  return rowToSideProject(result.rows[0] as Record<string, unknown>)
}

export const deleteSideProject = async (id: string): Promise<void> => {
  await db.execute({
    sql: 'DELETE FROM side_projects WHERE id = ?',
    args: [id]
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
    sql: 'SELECT * FROM financial_milestones WHERE id = ?',
    args: [id]
  })
  
  return rowToMilestone(result.rows[0] as Record<string, unknown>)
}

export const getMilestones = async (userId: string): Promise<Milestone[]> => {
  const result = await db.execute({
    sql: 'SELECT * FROM financial_milestones WHERE user_id = ? ORDER BY deadline ASC',
    args: [userId]
  })
  
  return result.rows.map(row => rowToMilestone(row as Record<string, unknown>))
}

export const updateMilestone = async (id: string, updates: Partial<Milestone>): Promise<Milestone> => {
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
  
  args.push(id)
  
  await db.execute({
    sql: `UPDATE financial_milestones SET ${fields.join(', ')} WHERE id = ?`,
    args
  })
  
  const result = await db.execute({
    sql: 'SELECT * FROM financial_milestones WHERE id = ?',
    args: [id]
  })
  
  return rowToMilestone(result.rows[0] as Record<string, unknown>)
}

export const deleteMilestone = async (id: string): Promise<void> => {
  await db.execute({
    sql: 'DELETE FROM financial_milestones WHERE id = ?',
    args: [id]
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
    
    const monthlyGoalObligations = activeGoals.reduce((sum, goal) => {
      const today = new Date()
      const deadline = new Date(goal.deadline)
      const monthsLeft = Math.max(1, Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
      
      const remainingAmount = goal.target_amount - goal.current_amount
      const monthlyRequired = remainingAmount / monthsLeft
      
      return sum + Math.max(0, monthlyRequired)
    }, 0)
    
    // Get recurring expenses
    const recurringExpenses = await getRecurringExpenses(userId)
    const monthlyRecurringTotal = recurringExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    
    // Total monthly obligations
    const totalMonthlyObligations = monthlyGoalObligations + monthlyRecurringTotal
    
    // Convert to daily target
    const dailyTarget = totalMonthlyObligations / 30.44
    
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
      const activeSources = incomeSources.filter(s => s.status === 'active')
      
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
    const dailySurplusDeficit = monthlySurplusDeficit / 30.44
    
    return {
      dailyTarget: Math.round(dailyTarget * 100) / 100,
      monthlyGoalObligations: Math.round(monthlyGoalObligations * 100) / 100,
      monthlyRecurringTotal: Math.round(monthlyRecurringTotal * 100) / 100,
      totalMonthlyObligations: Math.round(totalMonthlyObligations * 100) / 100,
      estimatedMonthlyIncome: Math.round(estimatedMonthlyIncome * 100) / 100,
      monthlyProjectIncome: Math.round(monthlyProjectIncome * 100) / 100,
      monthlySurplusDeficit: Math.round(monthlySurplusDeficit * 100) / 100,
      dailySurplusDeficit: Math.round(dailySurplusDeficit * 100) / 100,
      activeGoalsCount: activeGoals.length,
      recurringExpensesCount: recurringExpenses.length,
      // New income source fields
      hasCommissionIncome,
      incomeEstimateLow: Math.round(incomeEstimateLow * 100) / 100,
      incomeEstimateMid: Math.round(incomeEstimateMid * 100) / 100,
      incomeEstimateHigh: Math.round(incomeEstimateHigh * 100) / 100,
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
  start_date: string | null
  end_date: string | null
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
    
    return {
      low: Math.round((baseMonthly + monthlyCommissionLow) * 100) / 100,
      mid: Math.round((baseMonthly + monthlyCommissionMid) * 100) / 100,
      high: Math.round((baseMonthly + monthlyCommissionHigh) * 100) / 100
    }
  }
  
  // Non-commission income has same low/mid/high
  return {
    low: Math.round(baseMonthly * 100) / 100,
    mid: Math.round(baseMonthly * 100) / 100,
    high: Math.round(baseMonthly * 100) / 100
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
    start_date: row.start_date as string | null,
    end_date: row.end_date as string | null,
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

export const getIncomeSourceById = async (id: string): Promise<IncomeSource | null> => {
  const result = await db.execute({
    sql: 'SELECT * FROM income_sources WHERE id = ?',
    args: [id]
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
      status, start_date, end_date, is_primary, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      source.is_primary ? 1 : 0, now, now
    ]
  })
  
  return getIncomeSourceById(id) as Promise<IncomeSource>
}

export const updateIncomeSource = async (id: string, updates: Partial<IncomeSource>): Promise<IncomeSource> => {
  const now = getCurrentTimestamp()
  
  // Get current source to merge with updates for estimate calculation
  const current = await getIncomeSourceById(id)
  if (!current) throw new Error('Income source not found')
  
  const merged = { ...current, ...updates }
  const estimates = calculateMonthlyEstimates(merged)
  
  const fields: string[] = []
  const values: unknown[] = []
  
  // Build dynamic update query
  const allowedFields = [
    'name', 'description', 'income_type', 'pay_frequency',
    'base_amount', 'hours_per_week', 'is_commission_based',
    'commission_high', 'commission_low', 'commission_frequency_per_period',
    'status', 'start_date', 'end_date', 'is_primary'
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
    sql: `UPDATE income_sources SET ${fields.join(', ')} WHERE id = ?`,
    args: values
  })
  
  return getIncomeSourceById(id) as Promise<IncomeSource>
}

export const deleteIncomeSource = async (id: string): Promise<void> => {
  await db.execute({
    sql: 'UPDATE income_sources SET status = ?, updated_at = ? WHERE id = ?',
    args: ['ended', getCurrentTimestamp(), id]
  })
}

// Get income summary for a user (used in dashboard/summary)
export const getIncomeSummary = async (userId: string) => {
  const sources = await getIncomeSources(userId)
  const activeSources = sources.filter(s => s.status === 'active')
  
  const hasCommissionIncome = activeSources.some(s => s.is_commission_based)
  
  const totalMonthlyLow = activeSources.reduce((sum, s) => sum + s.estimated_monthly_low, 0)
  const totalMonthlyMid = activeSources.reduce((sum, s) => sum + s.estimated_monthly_mid, 0)
  const totalMonthlyHigh = activeSources.reduce((sum, s) => sum + s.estimated_monthly_high, 0)
  
  const primarySource = activeSources.find(s => s.is_primary)
  
  return {
    sources: activeSources,
    hasCommissionIncome,
    totalMonthlyLow: Math.round(totalMonthlyLow * 100) / 100,
    totalMonthlyMid: Math.round(totalMonthlyMid * 100) / 100,
    totalMonthlyHigh: Math.round(totalMonthlyHigh * 100) / 100,
    primarySource: primarySource || null,
    sourceCount: activeSources.length
  }
}
