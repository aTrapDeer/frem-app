import { db, generateUUID, getCurrentTimestamp } from '@/lib/turso'

export const BUSINESS_TYPES = [
  'sole_prop',
  'llc',
  'llc_s_corp',
  's_corp',
  'c_corp',
  'partnership',
] as const

export const PAYMENT_FORMS = [
  'w2_salary',
  'owner_draw',
  'distributions',
  'client_invoices',
  'platform_payouts',
  'other',
] as const

export type BusinessType = (typeof BUSINESS_TYPES)[number]
export type PaymentForm = (typeof PAYMENT_FORMS)[number]

export type BusinessProfile = {
  id: string
  user_id: string
  business_type: BusinessType
  payment_forms: PaymentForm[]
  ownership_percentage: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type BusinessProfileInput = Pick<
  BusinessProfile,
  'business_type' | 'payment_forms' | 'ownership_percentage' | 'notes'
>

const PAYMENT_FORM_SET = new Set<string>(PAYMENT_FORMS)

function parsePaymentForms(value: unknown): PaymentForm[] {
  if (typeof value !== 'string') return []

  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (item): item is PaymentForm =>
        typeof item === 'string' && PAYMENT_FORM_SET.has(item)
    )
  } catch {
    return []
  }
}

function rowToBusinessProfile(row: Record<string, unknown>): BusinessProfile {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    business_type: row.business_type as BusinessType,
    payment_forms: parsePaymentForms(row.payment_forms),
    ownership_percentage: Number(row.ownership_percentage),
    notes: typeof row.notes === 'string' ? row.notes : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function getBusinessProfile(userId: string): Promise<BusinessProfile | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM business_profiles WHERE user_id = ?',
    args: [userId],
  })

  return result.rows[0]
    ? rowToBusinessProfile(result.rows[0] as Record<string, unknown>)
    : null
}

export async function upsertBusinessProfile(
  userId: string,
  profile: BusinessProfileInput
): Promise<BusinessProfile> {
  const now = getCurrentTimestamp()

  await db.execute({
    sql: `INSERT INTO business_profiles
            (id, user_id, business_type, payment_forms, ownership_percentage, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (user_id) DO UPDATE SET
            business_type = excluded.business_type,
            payment_forms = excluded.payment_forms,
            ownership_percentage = excluded.ownership_percentage,
            notes = excluded.notes,
            updated_at = excluded.updated_at`,
    args: [
      generateUUID(),
      userId,
      profile.business_type,
      JSON.stringify(profile.payment_forms),
      profile.ownership_percentage,
      profile.notes,
      now,
      now,
    ],
  })

  const saved = await getBusinessProfile(userId)
  if (!saved) throw new Error('Business profile was not saved')
  return saved
}
