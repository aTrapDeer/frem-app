import type { InStatement } from '@libsql/client'
import { db, generateUUID, getCurrentTimestamp } from '@/lib/turso'

export const EARNING_TYPES = ['w2', 'business', 'freelance', 'other'] as const
export const RISK_PROFILE_RATES = {
  conservative: 4,
  index: 7,
  aggressive: 10,
} as const

const INVESTMENT_ACCOUNT_TYPES = ['401k', 'ira', 'roth', 'brokerage', 'hsa', 'other'] as const
const RISK_PROFILES = ['conservative', 'index', 'aggressive'] as const
const LIABILITY_KINDS = [
  'credit_card',
  'student_loan',
  'auto_loan',
  'mortgage',
  'personal_loan',
  'other',
] as const
const FILING_STATUSES = ['single', 'married_joint'] as const

type InvestmentAccountType = (typeof INVESTMENT_ACCOUNT_TYPES)[number]
type RiskProfile = (typeof RISK_PROFILES)[number]
type LiabilityKind = (typeof LIABILITY_KINDS)[number]
type FilingStatus = (typeof FILING_STATUSES)[number]

export type InvestmentInput = {
  id?: string
  accountType: InvestmentAccountType
  balance: number
  riskProfile: RiskProfile
}

export type LiabilityInput = {
  id?: string
  name: string
  kind: LiabilityKind
  balance: number
  interestRate?: number | null
}

export type SetupStatus = {
  completed: boolean
  savedState: unknown | null
  prefill: {
    earningTypes: string[]
    filingStatus: FilingStatus | null
    taxState: string | null
    businessProfile: {
      businessType: string
      paymentForms: string[]
      ownershipPercentage: number
    } | null
    incomeSourceCount: number
    estimateCount: number
    recurringExpenseCount: number
    activeGoalCount: number
    hasBankData: boolean
    accountCount: number
    investments: Array<{
      id: string
      accountType: string
      balance: number
      riskProfile: string
    }>
    liabilities: Array<{
      id: string
      name: string
      kind: string
      balance: number
      interestRate: number | null
    }>
  }
}

export class SetupValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SetupValidationError'
  }
}

const EARNING_TYPE_SET = new Set<string>(EARNING_TYPES)
const INVESTMENT_ACCOUNT_TYPE_SET = new Set<string>(INVESTMENT_ACCOUNT_TYPES)
const RISK_PROFILE_SET = new Set<string>(RISK_PROFILES)
const LIABILITY_KIND_SET = new Set<string>(LIABILITY_KINDS)
const FILING_STATUS_SET = new Set<string>(FILING_STATUSES)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function optionalId(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || value.length === 0) {
    throw new SetupValidationError(`${label} id must be a non-empty string`)
  }
  return value
}

export function validateEarningTypes(input: unknown): string[] {
  if (
    !Array.isArray(input) ||
    !input.every(item => typeof item === 'string' && EARNING_TYPE_SET.has(item))
  ) {
    throw new SetupValidationError(
      `earningTypes must contain only: ${EARNING_TYPES.join(', ')}`
    )
  }

  return [...new Set(input)]
}

export function validateInvestments(input: unknown): InvestmentInput[] {
  if (!Array.isArray(input)) {
    throw new SetupValidationError('investments must be an array')
  }

  return input.map((item, index) => {
    if (!isRecord(item)) {
      throw new SetupValidationError(`investments[${index}] must be an object`)
    }
    if (
      typeof item.accountType !== 'string' ||
      !INVESTMENT_ACCOUNT_TYPE_SET.has(item.accountType)
    ) {
      throw new SetupValidationError(
        `investments[${index}].accountType must be one of: ${INVESTMENT_ACCOUNT_TYPES.join(', ')}`
      )
    }
    if (!isFiniteNonNegative(item.balance)) {
      throw new SetupValidationError(
        `investments[${index}].balance must be a finite number greater than or equal to 0`
      )
    }
    if (
      typeof item.riskProfile !== 'string' ||
      !RISK_PROFILE_SET.has(item.riskProfile)
    ) {
      throw new SetupValidationError(
        `investments[${index}].riskProfile must be one of: ${RISK_PROFILES.join(', ')}`
      )
    }

    return {
      id: optionalId(item.id, `investments[${index}]`),
      accountType: item.accountType as InvestmentAccountType,
      balance: item.balance,
      riskProfile: item.riskProfile as RiskProfile,
    }
  })
}

export function validateLiabilities(input: unknown): LiabilityInput[] {
  if (!Array.isArray(input)) {
    throw new SetupValidationError('liabilities must be an array')
  }

  return input.map((item, index) => {
    if (!isRecord(item)) {
      throw new SetupValidationError(`liabilities[${index}] must be an object`)
    }

    const name = typeof item.name === 'string' ? item.name.trim() : ''
    if (name.length === 0 || name.length > 120) {
      throw new SetupValidationError(
        `liabilities[${index}].name must be between 1 and 120 characters`
      )
    }
    if (typeof item.kind !== 'string' || !LIABILITY_KIND_SET.has(item.kind)) {
      throw new SetupValidationError(
        `liabilities[${index}].kind must be one of: ${LIABILITY_KINDS.join(', ')}`
      )
    }
    if (!isFiniteNonNegative(item.balance)) {
      throw new SetupValidationError(
        `liabilities[${index}].balance must be a finite number greater than or equal to 0`
      )
    }
    if (
      item.interestRate !== undefined &&
      item.interestRate !== null &&
      (typeof item.interestRate !== 'number' ||
        !Number.isFinite(item.interestRate) ||
        item.interestRate < 0 ||
        item.interestRate > 100)
    ) {
      throw new SetupValidationError(
        `liabilities[${index}].interestRate must be null or a finite number from 0 to 100`
      )
    }

    return {
      id: optionalId(item.id, `liabilities[${index}]`),
      name,
      kind: item.kind as LiabilityKind,
      balance: item.balance,
      interestRate: item.interestRate as number | null | undefined,
    }
  })
}

function parseJson(value: unknown): unknown | null {
  if (typeof value !== 'string') return null

  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function parseStringArray(value: unknown, allowed?: Set<string>): string[] {
  const parsed = parseJson(value)
  if (!Array.isArray(parsed)) return []

  return parsed.filter(
    (item): item is string =>
      typeof item === 'string' && (!allowed || allowed.has(item))
  )
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

async function countRows(sql: string, userId: string): Promise<number> {
  return db
    .execute({ sql, args: [userId] })
    .then(result => Number((result.rows[0] as Record<string, unknown> | undefined)?.count ?? 0))
    .catch(() => 0)
}

async function ensureUserSettings(userId: string): Promise<void> {
  const now = getCurrentTimestamp()

  await db.execute({
    sql: `INSERT INTO user_settings
            (id, user_id, daily_budget_target, currency, preferred_language,
             notifications_enabled, dark_mode, weekly_summary_email, created_at, updated_at)
          SELECT ?, ?, 150.00, 'USD', 'en', 1, 0, 0, ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM user_settings WHERE user_id = ?
          )`,
    args: [generateUUID(), userId, now, now, userId],
  })
}

export async function getSetupStatus(userId: string): Promise<SetupStatus> {
  const [
    settings,
    businessProfileRow,
    incomeSourceCount,
    estimateCount,
    recurringExpenseCount,
    activeGoalCount,
    bankTransactionCount,
    accountCount,
    investmentRows,
    liabilityRows,
  ] = await Promise.all([
    db
      .execute({
        sql: `SELECT earning_types, filing_status, tax_state,
                     setup_completed_at, setup_state
              FROM user_settings
              WHERE user_id = ?
              LIMIT 1`,
        args: [userId],
      })
      .then(result => toRecord(result.rows[0]))
      .catch(() => null),
    db
      .execute({
        sql: `SELECT business_type, payment_forms, ownership_percentage
              FROM business_profiles
              WHERE user_id = ?
              LIMIT 1`,
        args: [userId],
      })
      .then(result => toRecord(result.rows[0]))
      .catch(() => null),
    countRows(
      `SELECT COUNT(*) AS count
       FROM income_sources
       WHERE user_id = ? AND status = 'active'`,
      userId
    ),
    countRows('SELECT COUNT(*) AS count FROM spending_estimates WHERE user_id = ?', userId),
    countRows(
      `SELECT COUNT(*) AS count
       FROM recurring_expenses
       WHERE user_id = ? AND status = 'active'`,
      userId
    ),
    countRows(
      `SELECT COUNT(*) AS count
       FROM financial_goals
       WHERE user_id = ? AND status = 'active'`,
      userId
    ),
    countRows('SELECT COUNT(*) AS count FROM bank_transactions WHERE user_id = ?', userId),
    countRows('SELECT COUNT(*) AS count FROM bank_accounts WHERE user_id = ?', userId),
    db
      .execute({
        sql: `SELECT id, account_type, balance, risk_profile
              FROM investment_accounts
              WHERE user_id = ?
              ORDER BY created_at, id`,
        args: [userId],
      })
      .then(result => result.rows.map(row => row as Record<string, unknown>))
      .catch(() => []),
    db
      .execute({
        sql: `SELECT id, name, kind, balance, interest_rate
              FROM liabilities
              WHERE user_id = ?
              ORDER BY created_at, id`,
        args: [userId],
      })
      .then(result => result.rows.map(row => row as Record<string, unknown>))
      .catch(() => []),
  ])

  const filingStatus =
    typeof settings?.filing_status === 'string' &&
    FILING_STATUS_SET.has(settings.filing_status)
      ? (settings.filing_status as FilingStatus)
      : null

  const businessProfile = businessProfileRow
    ? {
        businessType: String(businessProfileRow.business_type),
        paymentForms: parseStringArray(businessProfileRow.payment_forms),
        ownershipPercentage: Number(businessProfileRow.ownership_percentage),
      }
    : null

  return {
    completed: settings?.setup_completed_at != null,
    savedState: parseJson(settings?.setup_state),
    prefill: {
      earningTypes: parseStringArray(settings?.earning_types, EARNING_TYPE_SET),
      filingStatus,
      taxState: typeof settings?.tax_state === 'string' ? settings.tax_state : null,
      businessProfile,
      incomeSourceCount,
      estimateCount,
      recurringExpenseCount,
      activeGoalCount,
      hasBankData: bankTransactionCount > 0,
      accountCount,
      investments: investmentRows.map(row => ({
        id: String(row.id),
        accountType: String(row.account_type),
        balance: Number(row.balance),
        riskProfile: String(row.risk_profile),
      })),
      liabilities: liabilityRows.map(row => ({
        id: String(row.id),
        name: String(row.name),
        kind: String(row.kind),
        balance: Number(row.balance),
        interestRate: row.interest_rate === null ? null : Number(row.interest_rate),
      })),
    },
  }
}

export async function saveSetupState(userId: string, state: unknown): Promise<void> {
  await ensureUserSettings(userId)

  await db.execute({
    sql: `UPDATE user_settings
          SET setup_state = ?, updated_at = ?
          WHERE user_id = ?`,
    args: [JSON.stringify(state) ?? 'null', getCurrentTimestamp(), userId],
  })
}

export async function setBasics(
  userId: string,
  input: {
    earningTypes: unknown
    filingStatus?: unknown
    taxState?: unknown
  }
): Promise<void> {
  const earningTypes = validateEarningTypes(input.earningTypes)
  const filingStatus = input.filingStatus ?? null
  const taxState = input.taxState ?? null

  if (
    filingStatus !== null &&
    (typeof filingStatus !== 'string' || !FILING_STATUS_SET.has(filingStatus))
  ) {
    throw new SetupValidationError(
      `filingStatus must be null or one of: ${FILING_STATUSES.join(', ')}`
    )
  }
  if (taxState !== null && typeof taxState !== 'string') {
    throw new SetupValidationError('taxState must be a string or null')
  }

  await ensureUserSettings(userId)
  await db.execute({
    sql: `UPDATE user_settings
          SET earning_types = ?, filing_status = ?, tax_state = ?, updated_at = ?
          WHERE user_id = ?`,
    args: [
      JSON.stringify(earningTypes),
      filingStatus,
      taxState,
      getCurrentTimestamp(),
      userId,
    ],
  })
}

export async function setInvestments(
  userId: string,
  investments: InvestmentInput[]
): Promise<number> {
  const validated = validateInvestments(investments)
  const now = getCurrentTimestamp()
  const statements: InStatement[] = [
    {
      sql: 'DELETE FROM investment_accounts WHERE user_id = ?',
      args: [userId],
    },
    ...validated.map(investment => ({
      sql: `INSERT INTO investment_accounts
              (id, user_id, account_type, balance, risk_profile, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        investment.id ?? generateUUID(),
        userId,
        investment.accountType,
        investment.balance,
        investment.riskProfile,
        now,
        now,
      ],
    })),
  ]

  await db.batch(statements, 'write')
  return validated.length
}

export async function setLiabilities(
  userId: string,
  liabilities: LiabilityInput[]
): Promise<number> {
  const validated = validateLiabilities(liabilities)
  const now = getCurrentTimestamp()
  const statements: InStatement[] = [
    {
      sql: 'DELETE FROM liabilities WHERE user_id = ?',
      args: [userId],
    },
    ...validated.map(liability => ({
      sql: `INSERT INTO liabilities
              (id, user_id, name, kind, balance, interest_rate, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        liability.id ?? generateUUID(),
        userId,
        liability.name,
        liability.kind,
        liability.balance,
        liability.interestRate ?? null,
        now,
        now,
      ],
    })),
  ]

  await db.batch(statements, 'write')
  return validated.length
}

export async function completeSetup(userId: string): Promise<void> {
  await ensureUserSettings(userId)

  const now = getCurrentTimestamp()
  await db.execute({
    sql: `UPDATE user_settings
          SET setup_completed_at = ?, updated_at = ?
          WHERE user_id = ?`,
    args: [now, now, userId],
  })
}
