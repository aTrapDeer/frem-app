import { supabase } from './supabase'
import { Database } from './supabase'

export type Transaction = Database['public']['Tables']['daily_transactions']['Row']
export type Goal = Database['public']['Tables']['financial_goals']['Row']
export type RecurringExpense = Database['public']['Tables']['recurring_expenses']['Row']
export type SideProject = Database['public']['Tables']['side_projects']['Row']
export type Milestone = Database['public']['Tables']['financial_milestones']['Row']

// Daily Transactions
export const createTransaction = async (transaction: Database['public']['Tables']['daily_transactions']['Insert']) => {
  const { data, error } = await supabase
    .from('daily_transactions')
    .insert(transaction)
    .select()
    .single()

  if (error) {
    console.error('Error creating transaction:', error.message)
    throw error
  }

  return data
}

export const getTransactions = async (userId: string, date?: string): Promise<Transaction[]> => {
  let query = supabase
    .from('daily_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_time', { ascending: false })

  if (date) {
    query = query.eq('transaction_date', date)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching transactions:', error.message)
    throw error
  }

  return data || []
}

export const updateTransaction = async (id: string, updates: Database['public']['Tables']['daily_transactions']['Update']) => {
  const { data, error } = await supabase
    .from('daily_transactions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating transaction:', error.message)
    throw error
  }

  return data
}

export const deleteTransaction = async (id: string) => {
  const { error } = await supabase
    .from('daily_transactions')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting transaction:', error.message)
    throw error
  }
}

// Financial Goals
export const createGoal = async (goal: Database['public']['Tables']['financial_goals']['Insert']) => {
  const { data, error } = await supabase
    .from('financial_goals')
    .insert(goal)
    .select()
    .single()

  if (error) {
    console.error('Error creating goal:', error.message)
    throw error
  }

  return data
}

export const getGoals = async (userId: string): Promise<Goal[]> => {
  const { data, error } = await supabase
    .from('financial_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching goals:', error.message)
    throw error
  }

  return data || []
}

export const updateGoal = async (id: string, updates: Database['public']['Tables']['financial_goals']['Update']) => {
  const { data, error } = await supabase
    .from('financial_goals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating goal:', error.message)
    throw error
  }

  return data
}

export const deleteGoal = async (id: string) => {
  const { error } = await supabase
    .from('financial_goals')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting goal:', error.message)
    throw error
  }
}

// Recurring Expenses
export const createRecurringExpense = async (expense: Database['public']['Tables']['recurring_expenses']['Insert']) => {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert(expense)
    .select()
    .single()

  if (error) {
    console.error('Error creating recurring expense:', error.message)
    throw error
  }

  return data
}

export const getRecurringExpenses = async (userId: string): Promise<RecurringExpense[]> => {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching recurring expenses:', error.message)
    throw error
  }

  return data || []
}

export const updateRecurringExpense = async (id: string, updates: Database['public']['Tables']['recurring_expenses']['Update']) => {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating recurring expense:', error.message)
    throw error
  }

  return data
}

export const deleteRecurringExpense = async (id: string) => {
  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting recurring expense:', error.message)
    throw error
  }
}

// Side Projects
export const createSideProject = async (project: Database['public']['Tables']['side_projects']['Insert']) => {
  const { data, error } = await supabase
    .from('side_projects')
    .insert(project)
    .select()
    .single()

  if (error) {
    console.error('Error creating side project:', error.message)
    throw error
  }

  return data
}

export const getSideProjects = async (userId: string): Promise<SideProject[]> => {
  const { data, error } = await supabase
    .from('side_projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching side projects:', error.message)
    throw error
  }

  return data || []
}

export const updateSideProject = async (id: string, updates: Database['public']['Tables']['side_projects']['Update']) => {
  const { data, error } = await supabase
    .from('side_projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating side project:', error.message)
    throw error
  }

  return data
}

export const deleteSideProject = async (id: string) => {
  const { error } = await supabase
    .from('side_projects')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting side project:', error.message)
    throw error
  }
}

// Financial Milestones
export const createMilestone = async (milestone: Database['public']['Tables']['financial_milestones']['Insert']) => {
  const { data, error } = await supabase
    .from('financial_milestones')
    .insert(milestone)
    .select()
    .single()

  if (error) {
    console.error('Error creating milestone:', error.message)
    throw error
  }

  return data
}

export const getMilestones = async (userId: string): Promise<Milestone[]> => {
  const { data, error } = await supabase
    .from('financial_milestones')
    .select('*')
    .eq('user_id', userId)
    .order('deadline', { ascending: true })

  if (error) {
    console.error('Error fetching milestones:', error.message)
    throw error
  }

  return data || []
}

export const updateMilestone = async (id: string, updates: Database['public']['Tables']['financial_milestones']['Update']) => {
  const { data, error } = await supabase
    .from('financial_milestones')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating milestone:', error.message)
    throw error
  }

  return data
}

export const deleteMilestone = async (id: string) => {
  const { error } = await supabase
    .from('financial_milestones')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting milestone:', error.message)
    throw error
  }
}

// Dashboard Analytics
export const getDashboardData = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0]
  
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

// Transaction Allocation Functions
export const createTransactionWithAllocations = async (
  transaction: Database['public']['Tables']['daily_transactions']['Insert'],
  allocations?: { type: 'goal' | 'expense', id: string, amount: number, notes?: string }[]
) => {
  // Create the transaction first
  const newTransaction = await createTransaction(transaction)
  
  if (allocations && allocations.length > 0) {
    // Create allocation records
    for (const allocation of allocations) {
      await supabase
        .from('transaction_allocations')
        .insert({
          transaction_id: newTransaction.id,
          user_id: transaction.user_id,
          allocation_type: allocation.type,
          target_id: allocation.id,
          allocated_amount: allocation.amount,
          notes: allocation.notes
        })
    }
  }
  
  return newTransaction
}

export const getTransactionAllocations = async (transactionId: string) => {
  const { data, error } = await supabase
    .from('transaction_allocations')
    .select('*')
    .eq('transaction_id', transactionId)

  if (error) {
    console.error('Error fetching allocations:', error.message)
    throw error
  }

  return data
}

export const getAllocatedAmountForTarget = async (userId: string, targetType: 'goal' | 'expense', targetId: string) => {
  const { data, error } = await supabase
    .from('transaction_allocations')
    .select('allocated_amount')
    .eq('user_id', userId)
    .eq('allocation_type', targetType)
    .eq('target_id', targetId)

  if (error) {
    console.error('Error fetching allocated amount:', error.message)
    throw error
  }

  return data.reduce((sum, allocation) => sum + allocation.allocated_amount, 0)
}

// Calculate smart daily target based on goals and recurring expenses
export const calculateDailyTarget = async (userId: string) => {
  try {
    // Get active goals and calculate monthly obligations
    const goals = await getGoals(userId)
    const activeGoals = goals.filter(goal => goal.status === 'active')
    
    const monthlyGoalObligations = activeGoals.reduce((sum, goal) => {
      const today = new Date()
      const deadline = new Date(goal.deadline)
      const monthsLeft = Math.max(1, Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44))) // 30.44 days per month average
      
      const remainingAmount = goal.target_amount - goal.current_amount
      const monthlyRequired = remainingAmount / monthsLeft
      
      return sum + Math.max(0, monthlyRequired) // Don't count negative (already exceeded goals)
    }, 0)
    
    // Get recurring expenses
    const recurringExpenses = await getRecurringExpenses(userId)
    const monthlyRecurringTotal = recurringExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    
    // Total monthly obligations
    const totalMonthlyObligations = monthlyGoalObligations + monthlyRecurringTotal
    
    // Convert to daily target (divide by 30.44)
    const dailyTarget = totalMonthlyObligations / 30.44
    
    // Get available monthly income (from side projects + estimate from recent transactions)
    const sideProjects = await getSideProjects(userId)
    const activeSideProjects = sideProjects.filter(project => project.status === 'active')
    const monthlyProjectIncome = activeSideProjects.reduce((sum, project) => sum + project.current_monthly_earnings, 0)
    
    // Get recent transactions for more accurate income estimation
    const recentTransactions = await getTransactions(userId)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    // Only use transactions from last 30 days for monthly estimation
    const recentIncomeTransactions = recentTransactions.filter(t => 
      t.type === 'income' && new Date(t.created_at) >= thirtyDaysAgo
    )
    
    // Separate one-time events from recurring income
    const recurringIncome = recentIncomeTransactions.filter(t => 
      t.category === 'salary' || t.category === 'freelance' || t.category === 'business'
    )
    
    const oneTimeIncome = recentIncomeTransactions.filter(t => 
      t.category === 'investment' || t.category === 'bonus' || t.category === 'gift' || t.category === 'other'
    )
    
    // Only estimate monthly income from recurring sources
    const recurringMonthlyIncome = recurringIncome.length > 0 
      ? (recurringIncome.reduce((sum, t) => sum + t.amount, 0) / recurringIncome.length) * 4.33 // weeks to month
      : 0
    
    // Add side project income 
    const estimatedMonthlyIncome = recurringMonthlyIncome + monthlyProjectIncome
    
    // Calculate surplus/deficit
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
      recurringExpensesCount: recurringExpenses.length
    }
  } catch (error) {
    console.error('Error calculating daily target:', error)
    return {
      dailyTarget: 150, // Fallback to default
      monthlyGoalObligations: 0,
      monthlyRecurringTotal: 0,
      totalMonthlyObligations: 0,
      estimatedMonthlyIncome: 0,
      monthlyProjectIncome: 0,
      monthlySurplusDeficit: 0,
      dailySurplusDeficit: 0,
      activeGoalsCount: 0,
      recurringExpensesCount: 0
    }
  }
} 