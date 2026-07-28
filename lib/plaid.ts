import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
  type AccountBase,
  type RemovedTransaction,
  type Transaction as PlaidTransaction,
} from 'plaid'

/**
 * Plaid client and sync helpers.
 *
 * Scope note: we request `transactions` only. `auth` is deliberately NOT
 * requested — it exposes account and routing numbers used to move money, and
 * this product is read-only by design.
 */

const PLAID_PRODUCTS: Products[] = [Products.Transactions]
const PLAID_COUNTRY_CODES: CountryCode[] = [CountryCode.Us]

/**
 * How much transaction history to request, in days. 730 is Plaid's maximum.
 *
 * This matters more than it looks: Plaid defaults to 90 days, and an Item's
 * history length CANNOT be extended after creation — the only way to get more
 * is to delete the Item and re-link, which costs the user another credential
 * entry and burns an Item against the plan limit.
 *
 * Two years is the right ask here. Mortgage underwriting averages two years of
 * income, and tax work needs prior-year figures to compare against.
 */
const TRANSACTION_HISTORY_DAYS = 730

let client: PlaidApi | null = null

/** Defaults to sandbox: reaching production must be a deliberate choice. */
export function getPlaidEnv(): string {
  return process.env.PLAID_ENV?.trim() || 'sandbox'
}

/**
 * Resolves the secret for the active environment.
 *
 * Plaid issues a different secret per environment, so both can be stored at once
 * and PLAID_ENV alone decides which is used — no swapping secrets to switch.
 * PLAID_SECRET is honoured as a single-secret fallback.
 */
function getPlaidSecret(env: string): string | undefined {
  const perEnvironment = env === 'production'
    ? process.env.PLAID_PRODUCTION_SECRET
    : process.env.PLAID_SANDBOX_SECRET

  return perEnvironment?.trim() || process.env.PLAID_SECRET?.trim()
}

function getPlaidClient(): PlaidApi {
  if (typeof window !== 'undefined') {
    throw new Error('Plaid client can only be used on the server side')
  }

  if (client) return client

  const clientId = process.env.PLAID_CLIENT_ID
  const env = getPlaidEnv()
  const secret = getPlaidSecret(env)

  if (!clientId) throw new Error('Missing PLAID_CLIENT_ID environment variable')

  if (!secret) {
    const expected = env === 'production' ? 'PLAID_PRODUCTION_SECRET' : 'PLAID_SANDBOX_SECRET'
    throw new Error(`Missing ${expected} (or PLAID_SECRET) for PLAID_ENV="${env}"`)
  }

  const basePath = PlaidEnvironments[env]
  if (!basePath) {
    throw new Error(`Invalid PLAID_ENV "${env}". Expected one of: ${Object.keys(PlaidEnvironments).join(', ')}`)
  }

  client = new PlaidApi(
    new Configuration({
      basePath,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': clientId,
          'PLAID-SECRET': secret,
        },
      },
    })
  )

  return client
}

export function isPlaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID && getPlaidSecret(getPlaidEnv()))
}

/**
 * Creates a short-lived token used to open Plaid Link in the browser.
 */
/**
 * Public URL Plaid should call when an Item has new data.
 *
 * Returns undefined for localhost: Plaid cannot reach it, and sending an
 * unreachable webhook just produces delivery failures. Local development falls
 * back to the manual sync button.
 */
function getWebhookUrl(): string | undefined {
  const base = process.env.PLAID_WEBHOOK_URL || process.env.NEXTAUTH_URL

  if (!base) return undefined
  if (base.includes('localhost') || base.includes('127.0.0.1')) return undefined

  return `${base.replace(/\/$/, '')}/api/plaid/webhook`
}

export async function createLinkToken(userId: string): Promise<string> {
  const webhook = getWebhookUrl()

  const response = await getPlaidClient().linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'FREM',
    products: PLAID_PRODUCTS,
    country_codes: PLAID_COUNTRY_CODES,
    language: 'en',
    transactions: { days_requested: TRANSACTION_HISTORY_DAYS },
    ...(webhook ? { webhook } : {}),
  })

  return response.data.link_token
}

export type ExchangedItem = {
  accessToken: string
  itemId: string
  institutionId: string | null
  institutionName: string
}

/**
 * Swaps the one-time public token from Link for a long-lived access token.
 * The caller is responsible for encrypting it before it touches the database.
 */
export async function exchangePublicToken(publicToken: string): Promise<ExchangedItem> {
  const plaid = getPlaidClient()

  const exchange = await plaid.itemPublicTokenExchange({ public_token: publicToken })
  const accessToken = exchange.data.access_token
  const itemId = exchange.data.item_id

  // Resolve the institution so connections have a human-readable name
  let institutionId: string | null = null
  let institutionName = 'Unknown institution'

  try {
    const item = await plaid.itemGet({ access_token: accessToken })
    institutionId = item.data.item.institution_id ?? null

    if (institutionId) {
      const institution = await plaid.institutionsGetById({
        institution_id: institutionId,
        country_codes: PLAID_COUNTRY_CODES,
      })
      institutionName = institution.data.institution.name
    }
  } catch {
    // A missing institution name is cosmetic — never fail the link over it
  }

  return { accessToken, itemId, institutionId, institutionName }
}

export async function fetchAccounts(accessToken: string): Promise<AccountBase[]> {
  const response = await getPlaidClient().accountsGet({ access_token: accessToken })
  return response.data.accounts
}

export type TransactionSyncResult = {
  added: PlaidTransaction[]
  modified: PlaidTransaction[]
  removed: RemovedTransaction[]
  nextCursor: string
}

/**
 * Pulls every change since `cursor` using Plaid's incremental sync endpoint.
 *
 * Paginates to completion before returning so the caller can persist the new
 * cursor and the data it covers in one transaction — persisting a cursor whose
 * pages were only partly applied would silently skip transactions forever.
 */
export async function syncTransactions(
  accessToken: string,
  cursor: string | null
): Promise<TransactionSyncResult> {
  const plaid = getPlaidClient()

  const added: PlaidTransaction[] = []
  const modified: PlaidTransaction[] = []
  const removed: RemovedTransaction[] = []

  let nextCursor = cursor ?? undefined
  let hasMore = true

  while (hasMore) {
    const response = await plaid.transactionsSync({
      access_token: accessToken,
      cursor: nextCursor,
    })

    added.push(...response.data.added)
    modified.push(...response.data.modified)
    removed.push(...response.data.removed)

    hasMore = response.data.has_more
    nextCursor = response.data.next_cursor
  }

  return { added, modified, removed, nextCursor: nextCursor ?? '' }
}

/**
 * Revokes an access token at Plaid. Call this before deleting a connection so we
 * stop being billed for an Item the user no longer has.
 */
export async function removeItem(accessToken: string): Promise<void> {
  await getPlaidClient().itemRemove({ access_token: accessToken })
}

export type { AccountBase, PlaidTransaction }
