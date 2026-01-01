import { auth } from '@/auth'
import { 
  createOneTimeIncome,
  updateOneTimeIncome,
  deleteOneTimeIncome,
  getOneTimeIncomeSummary,
  applyOneTimeIncomeToGoal,
  getUnappliedOneTimeIncomes
} from '@/lib/database'

// GET - Fetch all one-time incomes for user
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const unappliedOnly = searchParams.get('unapplied') === 'true'
    
    if (unappliedOnly) {
      const incomes = await getUnappliedOneTimeIncomes(session.user.id)
      return Response.json({ incomes })
    }
    
    const summary = await getOneTimeIncomeSummary(session.user.id)
    
    return Response.json(summary)
  } catch (error) {
    console.error('Error fetching one-time incomes:', error)
    return Response.json({ error: 'Failed to fetch one-time incomes' }, { status: 500 })
  }
}

// POST - Create new one-time income or apply to goal
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Check if this is an "apply to goal" action
    if (body.action === 'apply_to_goal') {
      const { income_id, goal_id } = body
      
      if (!income_id || !goal_id) {
        return Response.json({ error: 'Income ID and Goal ID are required' }, { status: 400 })
      }
      
      const result = await applyOneTimeIncomeToGoal(income_id, goal_id)
      
      return Response.json({ 
        ...result, 
        message: `$${result.income.amount.toLocaleString()} applied to "${result.goal.title}"` 
      })
    }
    
    // Otherwise, create new one-time income
    const { amount, description, source, income_date, notes } = body
    
    if (!amount || !description || !source) {
      return Response.json({ error: 'Amount, description, and source are required' }, { status: 400 })
    }
    
    const validSources = ['sale', 'gift', 'bonus', 'refund', 'cashback', 'settlement', 'inheritance', 'other']
    if (!validSources.includes(source)) {
      return Response.json({ error: `Invalid source. Must be one of: ${validSources.join(', ')}` }, { status: 400 })
    }
    
    const income = await createOneTimeIncome({
      user_id: session.user.id,
      amount,
      description,
      source,
      income_date: income_date || new Date().toISOString().split('T')[0],
      applied_to_goals: false,
      goal_id: null,
      notes: notes || null
    })
    
    return Response.json({ income, message: 'One-time income created successfully' })
  } catch (error) {
    console.error('Error with one-time income:', error)
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Failed to process request' 
    }, { status: 500 })
  }
}

// PUT - Update one-time income
export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return Response.json({ error: 'Income ID is required' }, { status: 400 })
    }
    
    const income = await updateOneTimeIncome(id, updates)
    
    return Response.json({ income, message: 'One-time income updated successfully' })
  } catch (error) {
    console.error('Error updating one-time income:', error)
    return Response.json({ error: 'Failed to update one-time income' }, { status: 500 })
  }
}

// DELETE - Delete one-time income
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return Response.json({ error: 'Income ID is required' }, { status: 400 })
    }
    
    await deleteOneTimeIncome(id)
    
    return Response.json({ message: 'One-time income deleted successfully' })
  } catch (error) {
    console.error('Error deleting one-time income:', error)
    return Response.json({ error: 'Failed to delete one-time income' }, { status: 500 })
  }
}

