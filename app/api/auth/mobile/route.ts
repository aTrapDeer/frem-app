import { NextResponse } from 'next/server'
import { db } from '@/lib/turso'
import { generateUUID, getCurrentTimestamp } from '@/lib/turso'

// A Google token is only proof of identity for US if it was issued to one of OUR
// OAuth clients. Without an audience check, a token minted by any third-party
// Google app would be accepted here and could be used to sign in as that email.
const ALLOWED_AUDIENCES = [
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_IOS_CLIENT_ID,
].filter((clientId): clientId is string => Boolean(clientId))

const ALLOWED_ISSUERS = ['accounts.google.com', 'https://accounts.google.com']

type GoogleIdTokenClaims = {
  aud?: string
  iss?: string
  sub?: string
  email?: string
  email_verified?: string | boolean
  name?: string
  picture?: string
}

type VerifiedGoogleUser = {
  sub: string
  email: string
  name: string | null
  picture: string | null
}

type VerificationResult =
  | { ok: true; user: VerifiedGoogleUser }
  | { ok: false; reason: string }

/**
 * Verifies a Google ID token and returns its claims.
 *
 * Google's tokeninfo endpoint validates the signature and expiry for us; we then
 * assert the token was issued by Google, for one of our clients, to a verified
 * email address.
 */
async function verifyGoogleIdToken(idToken: string): Promise<VerificationResult> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  )

  if (!response.ok) {
    return { ok: false, reason: 'Google rejected the ID token (invalid or expired)' }
  }

  const claims = (await response.json()) as GoogleIdTokenClaims

  if (!claims.iss || !ALLOWED_ISSUERS.includes(claims.iss)) {
    return { ok: false, reason: 'Unexpected token issuer' }
  }

  if (!claims.aud || !ALLOWED_AUDIENCES.includes(claims.aud)) {
    return { ok: false, reason: 'Token was not issued for this application' }
  }

  // tokeninfo returns this claim as the string "true"; be tolerant of both forms.
  if (claims.email_verified !== true && claims.email_verified !== 'true') {
    return { ok: false, reason: 'Google account email is not verified' }
  }

  if (!claims.sub || !claims.email) {
    return { ok: false, reason: 'Token is missing required claims' }
  }

  return {
    ok: true,
    user: {
      sub: claims.sub,
      email: claims.email,
      name: claims.name ?? null,
      picture: claims.picture ?? null,
    },
  }
}

/**
 * Mobile OAuth callback endpoint
 * Accepts Google ID token from iOS app and creates a session
 */
export async function POST(request: Request) {
  try {
    let body: { idToken?: string; accessToken?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Request body must be valid JSON' },
        { status: 400 }
      )
    }

    const { idToken, accessToken } = body

    if (!idToken || !accessToken) {
      return NextResponse.json(
        {
          error: 'Missing ID token or access token',
          details: !idToken ? 'idToken is required' : 'accessToken is required',
        },
        { status: 400 }
      )
    }

    if (ALLOWED_AUDIENCES.length === 0) {
      console.error('[auth/mobile] No GOOGLE_CLIENT_ID/GOOGLE_IOS_CLIENT_ID configured')
      return NextResponse.json(
        { error: 'Server misconfigured', details: 'No Google client IDs configured' },
        { status: 500 }
      )
    }

    // Establish identity from the ID token only. The access token is opaque to us
    // and is never treated as proof of who the caller is.
    const verification = await verifyGoogleIdToken(idToken)

    if (!verification.ok) {
      console.error('[auth/mobile] ID token verification failed:', verification.reason)
      return NextResponse.json(
        { error: 'Failed to verify Google token', details: verification.reason },
        { status: 401 }
      )
    }

    const googleUser = verification.user

    // Check if user exists in database
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [googleUser.email]
    })

    type UserRow = { id: string; name: string | null; email: string; image: string | null }
    type UserInfo = { id: string; name: string | null; email: string; image: string | null }

    let userId: string
    let user: UserInfo
    const now = getCurrentTimestamp()

    if (userResult.rows.length === 0) {
      // Create new user
      userId = generateUUID()
      
      await db.execute({
        sql: `INSERT INTO users (id, name, email, image, email_verified, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userId,
          googleUser.name || null,
          googleUser.email,
          googleUser.picture || null,
          now, // email_verified timestamp
          now,
          now
        ]
      })

      // Create default user settings
      await db.execute({
        sql: `INSERT INTO user_settings (id, user_id, daily_budget_target, currency, preferred_language, notifications_enabled, dark_mode, weekly_summary_email, created_at, updated_at)
              VALUES (?, ?, 150.00, 'USD', 'en', 1, 0, 0, ?, ?)`,
        args: [generateUUID(), userId, now, now]
      })

      user = {
        id: userId,
        name: googleUser.name ?? null,
        email: googleUser.email,
        image: googleUser.picture ?? null
      }
    } else {
      // User exists - update if needed
      const row = userResult.rows[0] as unknown as UserRow
      userId = row.id
      
      // Update user info if changed
      await db.execute({
        sql: `UPDATE users SET name = ?, image = ?, updated_at = ? WHERE id = ?`,
        args: [
          googleUser.name || row.name,
          googleUser.picture || row.image,
          now,
          userId
        ]
      })

      user = {
        id: row.id,
        name: googleUser.name || row.name,
        email: row.email,
        image: googleUser.picture || row.image
      }
    }

    // Check if account exists, create if not
    const accountResult = await db.execute({
      sql: `SELECT * FROM accounts WHERE provider = ? AND provider_account_id = ?`,
      args: ['google', googleUser.sub]
    })

    if (accountResult.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO accounts (id, user_id, type, provider, provider_account_id, access_token, id_token)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          generateUUID(),
          userId,
          'oauth',
          'google',
          googleUser.sub,
          accessToken,
          idToken
        ]
      })
    } else {
      // Update account tokens
      await db.execute({
        sql: `UPDATE accounts SET access_token = ?, id_token = ? 
              WHERE provider = ? AND provider_account_id = ?`,
        args: [
          accessToken,
          idToken,
          'google',
          googleUser.sub
        ]
      })
    }

    // Create a session token
    const sessionToken = generateUUID()
    const expires = new Date()
    expires.setDate(expires.getDate() + 30) // 30 days

    await db.execute({
      sql: `INSERT INTO sessions (id, session_token, user_id, expires)
            VALUES (?, ?, ?, ?)`,
      args: [
        generateUUID(),
        sessionToken,
        userId,
        expires.toISOString()
      ]
    })

    // Return session token and user info
    return NextResponse.json({
      sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image
      }
    })
  } catch (error) {
    console.error('Mobile auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
