import { NextResponse } from 'next/server'
import { db } from '@/lib/turso'
import { generateUUID, getCurrentTimestamp } from '@/lib/turso'

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

    // Verify the token and get user info from Google
    const googleUserInfo = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
    )

    if (!googleUserInfo.ok) {
      const text = await googleUserInfo.text()
      console.error('[auth/mobile] Google userinfo failed:', googleUserInfo.status, text)
      return NextResponse.json(
        { error: 'Failed to verify Google token', details: `Google returned ${googleUserInfo.status}` },
        { status: 401 }
      )
    }

    const googleUser = (await googleUserInfo.json()) as {
      sub?: string
      id?: string
      email?: string
      name?: string
      picture?: string
    }

    if (!googleUser.email) {
      console.error('[auth/mobile] Google response missing email. Keys:', Object.keys(googleUser))
      return NextResponse.json(
        {
          error: 'Invalid Google user data',
          details: 'No email in Google response. Ensure the app requests email scope.',
        },
        { status: 400 }
      )
    }

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
        name: googleUser.name,
        email: googleUser.email,
        image: googleUser.picture
      }
    } else {
      // User exists - update if needed
      const row = userResult.rows[0] as UserRow
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
      args: ['google', googleUser.sub || googleUser.id]
    })

    if (accountResult.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO accounts (id, user_id, type, provider, provider_account_id, access_token, id_token, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          generateUUID(),
          userId,
          'oauth',
          'google',
          googleUser.sub || googleUser.id,
          accessToken,
          idToken,
          now,
          now
        ]
      })
    } else {
      // Update account tokens
      await db.execute({
        sql: `UPDATE accounts SET access_token = ?, id_token = ?, updated_at = ? 
              WHERE provider = ? AND provider_account_id = ?`,
        args: [
          accessToken,
          idToken,
          now,
          'google',
          googleUser.sub || googleUser.id
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
