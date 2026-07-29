import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  BUSINESS_TYPES,
  PAYMENT_FORMS,
  getBusinessProfile,
  upsertBusinessProfile,
  type BusinessType,
  type PaymentForm,
} from '@/lib/business-profile'

const BUSINESS_TYPE_SET = new Set<string>(BUSINESS_TYPES)
const PAYMENT_FORM_SET = new Set<string>(PAYMENT_FORMS)

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(await getBusinessProfile(session.user.id), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Error loading business profile:', error)
    return NextResponse.json({ error: 'Failed to load business profile' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as {
      business_type?: unknown
      payment_forms?: unknown
      ownership_percentage?: unknown
      notes?: unknown
    } | null

    if (
      typeof body?.business_type !== 'string' ||
      !BUSINESS_TYPE_SET.has(body.business_type)
    ) {
      return NextResponse.json(
        { error: `business_type must be one of: ${BUSINESS_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (
      !Array.isArray(body.payment_forms) ||
      !body.payment_forms.every(
        form => typeof form === 'string' && PAYMENT_FORM_SET.has(form)
      )
    ) {
      return NextResponse.json(
        { error: `payment_forms must contain only: ${PAYMENT_FORMS.join(', ')}` },
        { status: 400 }
      )
    }

    if (
      typeof body.ownership_percentage !== 'number' ||
      !Number.isFinite(body.ownership_percentage) ||
      body.ownership_percentage <= 0 ||
      body.ownership_percentage > 100
    ) {
      return NextResponse.json(
        { error: 'ownership_percentage must be greater than 0 and at most 100' },
        { status: 400 }
      )
    }

    if (
      body.notes !== undefined &&
      body.notes !== null &&
      typeof body.notes !== 'string'
    ) {
      return NextResponse.json(
        { error: 'notes must be a string or null' },
        { status: 400 }
      )
    }

    const saved = await upsertBusinessProfile(session.user.id, {
      business_type: body.business_type as BusinessType,
      payment_forms: [...new Set(body.payment_forms)] as PaymentForm[],
      ownership_percentage: body.ownership_percentage,
      notes: body.notes === undefined ? null : body.notes,
    })

    return NextResponse.json(saved)
  } catch (error) {
    console.error('Error saving business profile:', error)
    return NextResponse.json({ error: 'Failed to save business profile' }, { status: 500 })
  }
}
