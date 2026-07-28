/**
 * Plaid Connectivity Check
 *
 * Confirms the credentials in .env.local can actually create a link token
 * against the selected environment. Run this before debugging the UI — it
 * separates "my keys are wrong" from "my React code is wrong".
 *
 * Usage: npx tsx scripts/check-plaid.ts
 */

import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const env = process.env.PLAID_ENV?.trim() || 'sandbox'
const clientId = process.env.PLAID_CLIENT_ID?.trim()
const secret =
  (env === 'production' ? process.env.PLAID_PRODUCTION_SECRET : process.env.PLAID_SANDBOX_SECRET)?.trim() ||
  process.env.PLAID_SECRET?.trim()

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                  Plaid Connectivity Check                  ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  console.log(`   Environment : ${env}`)
  console.log(`   Client ID   : ${clientId ? `set (${clientId.length} chars)` : 'MISSING'}`)
  console.log(`   Secret      : ${secret ? `set (${secret.length} chars)` : 'MISSING'}\n`)

  if (!clientId || !secret) {
    console.error('❌ Missing credentials. Expected PLAID_CLIENT_ID and')
    console.error(`   ${env === 'production' ? 'PLAID_PRODUCTION_SECRET' : 'PLAID_SANDBOX_SECRET'} in .env.local`)
    process.exit(1)
  }

  const response = await fetch(`https://${env}.plaid.com/link/token/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      user: { client_user_id: 'frem-connectivity-check' },
      client_name: 'FREM',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    }),
  })

  const body = (await response.json()) as {
    link_token?: string
    expiration?: string
    error_type?: string
    error_code?: string
    error_message?: string
  }

  if (response.ok && body.link_token) {
    console.log('   ✅ Credentials valid — link token created')
    console.log(`   Token   : ${body.link_token.slice(0, 24)}...`)
    console.log(`   Expires : ${body.expiration}\n`)
    console.log('Next: start the app and open /accounts to link an institution.')
    if (env === 'sandbox') {
      console.log('Sandbox login is user_good / pass_good.\n')
    }
    return
  }

  console.error(`   ❌ Plaid rejected the request (HTTP ${response.status})`)
  console.error(`   error_type    : ${body.error_type}`)
  console.error(`   error_code    : ${body.error_code}`)
  console.error(`   error_message : ${body.error_message}\n`)

  if (body.error_code === 'INVALID_API_KEYS') {
    console.error('   The secret does not match this environment. Sandbox and')
    console.error('   production secrets are different values.\n')
  }

  process.exit(1)
}

main().catch(error => {
  console.error('💥 Connectivity check failed:', error)
  process.exit(1)
})
