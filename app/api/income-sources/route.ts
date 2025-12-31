import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { 
  getIncomeSources, 
  createIncomeSource, 
  updateIncomeSource, 
  deleteIncomeSource,
  getIncomeSummary
} from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const summary = searchParams.get('summary') === 'true'

    if (summary) {
      const incomeSummary = await getIncomeSummary(session.user.id)
      return NextResponse.json(incomeSummary)
    }

    const sources = await getIncomeSources(session.user.id)
    return NextResponse.json(sources)
  } catch (error) {
    console.error('Error fetching income sources:', error)
    return NextResponse.json({ error: 'Failed to fetch income sources' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const source = await createIncomeSource({
      ...body,
      user_id: session.user.id
    })

    return NextResponse.json(source)
  } catch (error) {
    console.error('Error creating income source:', error)
    return NextResponse.json({ error: 'Failed to create income source' }, { status: 500 })
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
    
    if (!id) {
      return NextResponse.json({ error: 'Missing income source ID' }, { status: 400 })
    }

    const source = await updateIncomeSource(id, updates)
    return NextResponse.json(source)
  } catch (error) {
    console.error('Error updating income source:', error)
    return NextResponse.json({ error: 'Failed to update income source' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Missing income source ID' }, { status: 400 })
    }

    await deleteIncomeSource(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting income source:', error)
    return NextResponse.json({ error: 'Failed to delete income source' }, { status: 500 })
  }
}

