import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getGoals, getRecurringExpenses, getIncomeSources, getSideProjects, getTransactionsForMonth } from '@/lib/database'

// Helper to get monthly growth rate from annual percentage
const getMonthlyGrowthRate = (annualRatePercent: number | null | undefined): number => {
  if (!annualRatePercent || annualRatePercent <= 0) return 0
  return Math.pow(1 + annualRatePercent / 100, 1 / 12) - 1
}

interface MonthlyProjection {
  month: string // YYYY-MM format
  monthLabel: string // "Jan 2026"
  activeGoals: {
    goalId: string
    title: string
    category: string
    targetAmount: number
    projectedBalance: number
    monthlyAllocation: number
    progressPercentage: number
    status: 'active' | 'completed' | 'not_started' | 'at_risk'
    deadline: string
    startDate: string | null
    isCompletedThisMonth: boolean
    isStartingThisMonth: boolean
  }[]
  completedGoals: {
    goalId: string
    title: string
    completedInMonth: string
  }[]
  upcomingGoals: {
    goalId: string
    title: string
    startsInMonth: string
  }[]
  financials: {
    totalMonthlyIncome: number
    totalMonthlyExpenses: number
    monthlySurplus: number
    savingsRate: number
    totalAllocatedToGoals: number
  }
  summary: {
    activeGoalsCount: number
    completedGoalsCount: number
    upcomingGoalsCount: number
    totalGoalProgress: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      console.log('[Monthly Projections] Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const searchParams = request.nextUrl.searchParams
    const monthOffset = parseInt(searchParams.get('monthOffset') || '0', 10)
    // Limit to 12 months for performance
    const monthsToFetch = Math.min(parseInt(searchParams.get('months') || '12', 10), 24)
    
    console.log('[Monthly Projections] Fetching for user:', userId, 'months:', monthsToFetch)

    // Fetch all data
    const [goals, recurringExpenses, incomeSources, sideProjects, monthlyTransactions] = await Promise.all([
      getGoals(userId),
      getRecurringExpenses(userId),
      getIncomeSources(userId).catch(() => []),
      getSideProjects(userId),
      getTransactionsForMonth(userId)
    ])

    const activeGoals = goals.filter(g => g.status === 'active')
    const activeSources = incomeSources.filter(s => s.status === 'active')
    const activeSideProjects = sideProjects.filter(p => p.status === 'active')

    // Calculate base income
    const baseMonthlyIncome = activeSources.reduce((sum, s) => sum + s.estimated_monthly_mid, 0)
    const sideProjectIncome = activeSideProjects.reduce((sum, p) => sum + p.current_monthly_earnings, 0)
    const monthlyExpenses = recurringExpenses.reduce((sum, e) => sum + e.amount, 0)

    // One-time transactions only affect current month
    const oneTimeNet = monthlyTransactions.reduce((sum, t) => 
      sum + (t.type === 'income' ? t.amount : -t.amount), 0
    )

    // Date helpers
    const getMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
    const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1)
    const diffMonths = (start: Date, end: Date) => {
      return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    }
    const formatMonth = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    const formatMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    const today = new Date()
    const startOfCurrentMonth = getMonthStart(today)

    // Initialize goal states for simulation
    interface GoalState {
      goal: typeof activeGoals[0]
      balance: number
      startDate: Date
      deadline: Date
      completionDate: Date | null
      monthlyAllocations: Map<string, number> // month key -> allocation
    }

    // Handle case with no goals
    if (activeGoals.length === 0) {
      const emptyMonths: MonthlyProjection[] = []
      for (let i = 0; i < monthsToFetch; i++) {
        const monthDate = addMonths(startOfCurrentMonth, monthOffset + i)
        const monthIncome = baseMonthlyIncome + sideProjectIncome + (monthOffset + i === 0 ? oneTimeNet : 0)
        const surplus = Math.max(0, monthIncome - monthlyExpenses)
        const savingsRate = monthIncome > 0 ? (surplus / monthIncome) * 100 : 0
        
        emptyMonths.push({
          month: formatMonthKey(monthDate),
          monthLabel: formatMonth(monthDate),
          activeGoals: [],
          completedGoals: [],
          upcomingGoals: [],
          financials: {
            totalMonthlyIncome: Math.round(monthIncome * 100) / 100,
            totalMonthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
            monthlySurplus: Math.round(surplus * 100) / 100,
            savingsRate: Math.round(savingsRate * 100) / 100,
            totalAllocatedToGoals: 0
          },
          summary: {
            activeGoalsCount: 0,
            completedGoalsCount: 0,
            upcomingGoalsCount: 0,
            totalGoalProgress: 0
          }
        })
      }
      return NextResponse.json({
        monthlyProjections: emptyMonths,
        currentMonthOffset: monthOffset,
        totalGoals: 0
      })
    }

    const goalStates: GoalState[] = activeGoals.map(goal => ({
      goal,
      balance: goal.current_amount,
      startDate: goal.start_date ? getMonthStart(new Date(goal.start_date)) : startOfCurrentMonth,
      deadline: getMonthStart(new Date(goal.deadline)),
      completionDate: null,
      monthlyAllocations: new Map()
    }))

    // Run simulation for all months up to monthOffset + monthsToFetch
    const totalMonthsToSimulate = monthOffset + monthsToFetch + 1
    
    for (let monthIndex = 0; monthIndex < totalMonthsToSimulate; monthIndex++) {
      const monthDate = addMonths(startOfCurrentMonth, monthIndex)
      const monthKey = formatMonthKey(monthDate)
      
      // Find goals active this month (started and not completed)
      const activeThisMonth = goalStates.filter(state => {
        const hasStarted = monthDate >= state.startDate
        const notCompleted = !state.completionDate
        return hasStarted && notCompleted
      })

      if (activeThisMonth.length === 0) continue

      // Calculate income for this month
      const currentMonthIncome = baseMonthlyIncome + sideProjectIncome + (monthIndex === 0 ? oneTimeNet : 0)
      const surplus = Math.max(0, currentMonthIncome - monthlyExpenses)

      // Calculate weighted allocations based on urgency and time pressure
      const goalsWithWeights = activeThisMonth.map(state => {
        const remaining = Math.max(0, state.goal.target_amount - state.balance)
        const monthsUntilDeadline = Math.max(1, diffMonths(monthDate, state.deadline))
        const urgencyWeight = state.goal.urgency_score || 3
        const monthlyRequirement = remaining / monthsUntilDeadline
        const timePressure = Math.max(0.1, 12 / monthsUntilDeadline)
        const weight = monthlyRequirement * urgencyWeight * timePressure
        return { state, weight }
      })

      const totalWeight = goalsWithWeights.reduce((sum, g) => sum + g.weight, 0)

      // Allocate surplus to goals
      goalsWithWeights.forEach(({ state, weight }) => {
        const allocationRatio = totalWeight > 0 ? weight / totalWeight : 0
        const allocation = surplus * allocationRatio

        state.monthlyAllocations.set(monthKey, allocation)

        // Apply compound growth for investment goals
        const monthlyRate = state.goal.category === 'investment'
          ? getMonthlyGrowthRate(state.goal.interest_rate)
          : 0

        state.balance = state.balance * (1 + monthlyRate) + allocation

        // Check if goal completed this month
        if (!state.completionDate && state.balance >= state.goal.target_amount) {
          state.completionDate = new Date(monthDate)
        }
      })
    }

    // Generate monthly projection snapshots
    const monthlyProjections: MonthlyProjection[] = []

    for (let i = 0; i < monthsToFetch; i++) {
      const targetMonthIndex = monthOffset + i
      const monthDate = addMonths(startOfCurrentMonth, targetMonthIndex)
      const monthKey = formatMonthKey(monthDate)
      
      // Income for this specific month
      const monthIncome = baseMonthlyIncome + sideProjectIncome + (targetMonthIndex === 0 ? oneTimeNet : 0)
      const surplus = Math.max(0, monthIncome - monthlyExpenses)
      const savingsRate = monthIncome > 0 ? (surplus / monthIncome) * 100 : 0

      // Categorize goals for this month
      const activeGoalsThisMonth: MonthlyProjection['activeGoals'] = []
      const completedGoalsThisMonth: MonthlyProjection['completedGoals'] = []
      const upcomingGoalsThisMonth: MonthlyProjection['upcomingGoals'] = []

      goalStates.forEach(state => {
        const hasStarted = monthDate >= state.startDate
        const isCompleted = state.completionDate && monthDate >= state.completionDate
        const startsThisMonth = formatMonthKey(state.startDate) === monthKey
        const completedThisMonth = state.completionDate && formatMonthKey(state.completionDate) === monthKey

        if (!hasStarted) {
          // Goal hasn't started yet
          upcomingGoalsThisMonth.push({
            goalId: state.goal.id,
            title: state.goal.title,
            startsInMonth: formatMonth(state.startDate)
          })
        } else if (isCompleted && !completedThisMonth) {
          // Goal was completed in a previous month
          completedGoalsThisMonth.push({
            goalId: state.goal.id,
            title: state.goal.title,
            completedInMonth: formatMonth(state.completionDate!)
          })
        } else {
          // Goal is active (or completing this month)
          const allocation = state.monthlyAllocations.get(monthKey) || 0
          
          // Calculate projected balance at this month
          let projectedBalance = state.goal.current_amount
          for (let m = 0; m <= targetMonthIndex; m++) {
            const mk = formatMonthKey(addMonths(startOfCurrentMonth, m))
            const alloc = state.monthlyAllocations.get(mk) || 0
            const monthlyRate = state.goal.category === 'investment'
              ? getMonthlyGrowthRate(state.goal.interest_rate)
              : 0
            projectedBalance = projectedBalance * (1 + monthlyRate) + alloc
          }

          const progressPercentage = state.goal.target_amount > 0
            ? (projectedBalance / state.goal.target_amount) * 100
            : 0

          const monthsUntilDeadline = diffMonths(monthDate, state.deadline)
          let status: 'active' | 'completed' | 'not_started' | 'at_risk' = 'active'
          
          if (completedThisMonth || projectedBalance >= state.goal.target_amount) {
            status = 'completed'
          } else if (monthsUntilDeadline <= 0 && projectedBalance < state.goal.target_amount) {
            status = 'at_risk'
          }

          activeGoalsThisMonth.push({
            goalId: state.goal.id,
            title: state.goal.title,
            category: state.goal.category,
            targetAmount: state.goal.target_amount,
            projectedBalance: Math.round(projectedBalance * 100) / 100,
            monthlyAllocation: Math.round(allocation * 100) / 100,
            progressPercentage: Math.round(progressPercentage * 100) / 100,
            status,
            deadline: state.goal.deadline,
            startDate: state.goal.start_date,
            isCompletedThisMonth: Boolean(completedThisMonth),
            isStartingThisMonth: startsThisMonth
          })
        }
      })

      const totalAllocated = activeGoalsThisMonth.reduce((sum, g) => sum + g.monthlyAllocation, 0)
      const avgProgress = activeGoalsThisMonth.length > 0
        ? activeGoalsThisMonth.reduce((sum, g) => sum + g.progressPercentage, 0) / activeGoalsThisMonth.length
        : 0

      monthlyProjections.push({
        month: monthKey,
        monthLabel: formatMonth(monthDate),
        activeGoals: activeGoalsThisMonth,
        completedGoals: completedGoalsThisMonth,
        upcomingGoals: upcomingGoalsThisMonth,
        financials: {
          totalMonthlyIncome: Math.round(monthIncome * 100) / 100,
          totalMonthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
          monthlySurplus: Math.round(surplus * 100) / 100,
          savingsRate: Math.round(savingsRate * 100) / 100,
          totalAllocatedToGoals: Math.round(totalAllocated * 100) / 100
        },
        summary: {
          activeGoalsCount: activeGoalsThisMonth.length,
          completedGoalsCount: completedGoalsThisMonth.length,
          upcomingGoalsCount: upcomingGoalsThisMonth.length,
          totalGoalProgress: Math.round(avgProgress * 100) / 100
        }
      })
    }

    console.log('[Monthly Projections] Returning', monthlyProjections.length, 'months of projections')
    
    return NextResponse.json({
      monthlyProjections,
      currentMonthOffset: monthOffset,
      totalGoals: activeGoals.length
    })
  } catch (error) {
    console.error('[Monthly Projections] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch monthly projections' }, { status: 500 })
  }
}

