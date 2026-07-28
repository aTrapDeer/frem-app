import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { deleteCategoryCap, getBudgetTree, setCategoryCap } from '@/lib/budget'
import type { Entity } from '@/lib/bank-sync'

const VALID_ENTITIES: Entity[] = ['personal', 'business']

function parseEntity(value: string | null): Entity | undefined {
  return VALID_ENTITIES.includes(value as Entity) ? (value as Entity) : undefined
}

/** The category → item budget tree for a month, with actuals attached. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = request.nextUrl.searchParams
    const monthParam = params.get('month')
    // Parsed as local time so a YYYY-MM does not slip to the previous month
    const monthDate = monthParam ? new Date(`${monthParam}-01T00:00:00`) : new Date()

    return NextResponse.json(
      await getBudgetTree(session.user.id, monthDate, parseEntity(params.get('entity')))
    )
  } catch (error) {
    console.error('Error building budget tree:', error)
    return NextResponse.json({ error: 'Failed to load budget' }, { status: 500 })
  }
}

/** Sets a spending cap for a whole category, e.g. "$300 on groceries". */
export async function PUT(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as {
      category?: string
      monthlyEstimate?: number
      entity?: string
    } | null

    if (!body?.category) {
      return NextResponse.json({ error: 'category is required' }, { status: 400 })
    }

    if (typeof body.monthlyEstimate !== 'number' || !Number.isFinite(body.monthlyEstimate) || body.monthlyEstimate < 0) {
      return NextResponse.json(
        { error: 'monthlyEstimate must be a number of zero or more' },
        { status: 400 }
      )
    }

    await setCategoryCap(
      session.user.id,
      body.category,
      body.monthlyEstimate,
      parseEntity(body.entity ?? null) ?? 'personal'
    )

    return NextResponse.json({ message: 'Budget saved' })
  } catch (error) {
    console.error('Error saving category cap:', error)
    return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = request.nextUrl.searchParams
    const category = params.get('category')

    if (!category) {
      return NextResponse.json({ error: 'category is required' }, { status: 400 })
    }

    await deleteCategoryCap(
      session.user.id,
      category,
      parseEntity(params.get('entity')) ?? 'personal'
    )

    return NextResponse.json({ message: 'Budget removed' })
  } catch (error) {
    console.error('Error deleting category cap:', error)
    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 })
  }
}
