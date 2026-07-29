import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  SetupValidationError,
  completeSetup,
  getSetupStatus,
  saveSetupState,
  setBasics,
  setInvestments,
  setLiabilities,
  validateEarningTypes,
  validateInvestments,
  validateLiabilities,
} from '@/lib/setup'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type SetupRequest = {
  action?: unknown
  state?: unknown
  earningTypes?: unknown
  filingStatus?: unknown
  taxState?: unknown
  investments?: unknown
  liabilities?: unknown
}

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(await getSetupStatus(session.user.id), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Error loading setup status:', error)
    return NextResponse.json({ error: 'Failed to load setup status' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as SetupRequest | null
    const userId = session.user.id

    switch (body?.action) {
      case 'save-state':
        await saveSetupState(userId, body.state)
        return NextResponse.json({ ok: true })

      case 'set-basics': {
        const earningTypes = validateEarningTypes(body.earningTypes)
        await setBasics(userId, {
          earningTypes,
          filingStatus: body.filingStatus,
          taxState: body.taxState,
        })
        return NextResponse.json({ ok: true })
      }

      case 'set-investments': {
        const investments = validateInvestments(body.investments)
        const updated = await setInvestments(userId, investments)
        return NextResponse.json({ ok: true, updated })
      }

      case 'set-liabilities': {
        const liabilities = validateLiabilities(body.liabilities)
        const updated = await setLiabilities(userId, liabilities)
        return NextResponse.json({ ok: true, updated })
      }

      case 'complete':
        await completeSetup(userId)
        return NextResponse.json({ ok: true })

      default:
        return NextResponse.json({ error: 'Unknown setup action' }, { status: 400 })
    }
  } catch (error) {
    if (error instanceof SetupValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error('Error updating setup:', error)
    return NextResponse.json({ error: 'Failed to update setup' }, { status: 500 })
  }
}
