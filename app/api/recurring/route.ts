import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getRecurringExpenses, createRecurringExpense, updateRecurringExpense } from '@/lib/database'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const expenses = await getRecurringExpenses(session.user.id)
    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Error fetching recurring expenses:', error)
    return NextResponse.json({ error: 'Failed to fetch recurring expenses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const expense = await createRecurringExpense({
      ...body,
      user_id: session.user.id
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error creating recurring expense:', error)
    return NextResponse.json({ error: 'Failed to create recurring expense' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body
    
    const expense = await updateRecurringExpense(id, updates)
    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error updating recurring expense:', error)
    return NextResponse.json({ error: 'Failed to update recurring expense' }, { status: 500 })
  }
}

