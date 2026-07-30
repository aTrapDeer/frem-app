import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db, generateUUID, getCurrentTimestamp } from '@/lib/turso'

/**
 * Manual accounts — for institutions the user cannot (or chooses not to) link.
 *
 * A Schwab brokerage with no aggregator access still belongs in net worth and
 * still deserves an entity tag. These rows live in investment_accounts, which
 * the overview's net worth and account-linked goals already read, so a manual
 * balance participates in every calculation the moment it is saved.
 */

const ACCOUNT_TYPES = new Set(['401k', 'ira', 'roth', 'brokerage', 'hsa', 'other'])
const RISK_PROFILES = new Set(['conservative', 'index', 'aggressive'])
const ENTITIES = new Set(['personal', 'business'])

type Row = {
  id: string
  label: string | null
  account_type: string
  balance: number
  risk_profile: string
  entity: string
  updated_at: string
}

function toDto(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    label: (row.label as string | null) ?? null,
    accountType: String(row.account_type),
    balance: Number(row.balance),
    riskProfile: String(row.risk_profile),
    entity: String(row.entity),
    updatedAt: String(row.updated_at),
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await db.execute({
      sql: `SELECT id, label, account_type, balance, risk_profile, entity, updated_at
            FROM investment_accounts WHERE user_id = ? ORDER BY created_at`,
      args: [session.user.id],
    })

    return NextResponse.json({ accounts: result.rows.map(row => toDto(row as Record<string, unknown>)) })
  } catch (error) {
    console.error('Error listing manual accounts:', error)
    return NextResponse.json({ error: 'Failed to load accounts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as {
      label?: unknown
      accountType?: unknown
      balance?: unknown
      riskProfile?: unknown
      entity?: unknown
    } | null

    const label = typeof body?.label === 'string' ? body.label.trim().slice(0, 120) : ''
    const accountType = typeof body?.accountType === 'string' ? body.accountType : ''
    const balance = typeof body?.balance === 'number' ? body.balance : NaN
    const riskProfile = typeof body?.riskProfile === 'string' ? body.riskProfile : 'index'
    const entity = typeof body?.entity === 'string' ? body.entity : 'personal'

    if (!label) return NextResponse.json({ error: 'A name is required' }, { status: 400 })
    if (!ACCOUNT_TYPES.has(accountType)) {
      return NextResponse.json({ error: 'Invalid account type' }, { status: 400 })
    }
    if (!Number.isFinite(balance) || balance < 0) {
      return NextResponse.json({ error: 'Balance must be zero or more' }, { status: 400 })
    }
    if (!RISK_PROFILES.has(riskProfile) || !ENTITIES.has(entity)) {
      return NextResponse.json({ error: 'Invalid risk profile or entity' }, { status: 400 })
    }

    const id = generateUUID()
    const now = getCurrentTimestamp()

    await db.execute({
      sql: `INSERT INTO investment_accounts
              (id, user_id, label, account_type, balance, risk_profile, entity, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, session.user.id, label, accountType, balance, riskProfile, entity, now, now],
    })

    return NextResponse.json({ id })
  } catch (error) {
    console.error('Error creating manual account:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as {
      id?: unknown
      label?: unknown
      balance?: unknown
      entity?: unknown
      riskProfile?: unknown
      accountType?: unknown
    } | null

    if (typeof body?.id !== 'string' || !body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const fields: string[] = ['updated_at = ?']
    const args: (string | number)[] = [getCurrentTimestamp()]

    if (body.balance !== undefined) {
      if (typeof body.balance !== 'number' || !Number.isFinite(body.balance) || body.balance < 0) {
        return NextResponse.json({ error: 'Balance must be zero or more' }, { status: 400 })
      }
      fields.push('balance = ?')
      args.push(body.balance)
    }
    if (body.label !== undefined) {
      if (typeof body.label !== 'string' || !body.label.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      fields.push('label = ?')
      args.push(body.label.trim().slice(0, 120))
    }
    if (body.entity !== undefined) {
      if (typeof body.entity !== 'string' || !ENTITIES.has(body.entity)) {
        return NextResponse.json({ error: 'Invalid entity' }, { status: 400 })
      }
      fields.push('entity = ?')
      args.push(body.entity)
    }
    if (body.riskProfile !== undefined) {
      if (typeof body.riskProfile !== 'string' || !RISK_PROFILES.has(body.riskProfile)) {
        return NextResponse.json({ error: 'Invalid risk profile' }, { status: 400 })
      }
      fields.push('risk_profile = ?')
      args.push(body.riskProfile)
    }
    if (body.accountType !== undefined) {
      if (typeof body.accountType !== 'string' || !ACCOUNT_TYPES.has(body.accountType)) {
        return NextResponse.json({ error: 'Invalid account type' }, { status: 400 })
      }
      fields.push('account_type = ?')
      args.push(body.accountType)
    }

    args.push(body.id, session.user.id)
    const result = await db.execute({
      sql: `UPDATE investment_accounts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      args,
    })

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating manual account:', error)
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const result = await db.execute({
      sql: 'DELETE FROM investment_accounts WHERE id = ? AND user_id = ?',
      args: [id, session.user.id],
    })

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting manual account:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
