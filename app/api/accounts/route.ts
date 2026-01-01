import { auth } from '@/auth'
import { 
  createFinancialAccount,
  updateFinancialAccount,
  deleteFinancialAccount,
  getAccountsSummary
} from '@/lib/database'

// GET - Fetch all accounts for user
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const summary = await getAccountsSummary(session.user.id)
    
    return Response.json(summary)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return Response.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

// POST - Create new account
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { account_type, name, balance, institution, notes, is_primary } = body
    
    if (!account_type || !name) {
      return Response.json({ error: 'Account type and name are required' }, { status: 400 })
    }
    
    if (!['checking', 'savings'].includes(account_type)) {
      return Response.json({ error: 'Invalid account type. Must be "checking" or "savings"' }, { status: 400 })
    }
    
    const account = await createFinancialAccount({
      user_id: session.user.id,
      account_type,
      name,
      balance: balance || 0,
      institution: institution || null,
      notes: notes || null,
      is_primary: is_primary || false
    })
    
    return Response.json({ account, message: 'Account created successfully' })
  } catch (error) {
    console.error('Error creating account:', error)
    return Response.json({ error: 'Failed to create account' }, { status: 500 })
  }
}

// PUT - Update account
export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return Response.json({ error: 'Account ID is required' }, { status: 400 })
    }
    
    const account = await updateFinancialAccount(id, updates)
    
    return Response.json({ account, message: 'Account updated successfully' })
  } catch (error) {
    console.error('Error updating account:', error)
    return Response.json({ error: 'Failed to update account' }, { status: 500 })
  }
}

// DELETE - Delete account
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return Response.json({ error: 'Account ID is required' }, { status: 400 })
    }
    
    await deleteFinancialAccount(id)
    
    return Response.json({ message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Error deleting account:', error)
    return Response.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}

