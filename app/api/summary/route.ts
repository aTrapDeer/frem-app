import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getMilestones, getGoals, getRecurringExpenses, getSideProjects, getTransactions, calculateDailyTarget } from '@/lib/database'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch all user financial data
    const [milestones, goals, recurringExpenses, sideProjects, transactions, targetCalculation] = await Promise.all([
      getMilestones(userId),
      getGoals(userId),
      getRecurringExpenses(userId),
      getSideProjects(userId),
      getTransactions(userId),
      calculateDailyTarget(userId)
    ])

    // Calculate income from recent transactions
    const incomeTransactions = transactions.filter(t => t.type === 'income')
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0)

    return NextResponse.json({
      milestones,
      goals,
      recurringExpenses,
      sideProjects,
      transactions,
      targetCalculation,
      financialData: {
        income: totalIncome,
        expenses: recurringExpenses.map(e => ({ name: e.name, amount: e.amount })),
        goals: goals.map(g => ({ title: g.title, current_amount: g.current_amount, target_amount: g.target_amount })),
        sideProjects: sideProjects.map(p => ({ name: p.name, current_monthly_earnings: p.current_monthly_earnings }))
      }
    })
  } catch (error) {
    console.error('Error fetching summary data:', error)
    return NextResponse.json({ error: 'Failed to fetch summary data' }, { status: 500 })
  }
}

