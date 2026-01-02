/**
 * Custom NextAuth Adapter for Turso/libSQL
 * Based on the Auth.js adapter pattern
 */

import type { Adapter, AdapterAccount } from 'next-auth/adapters'
import { db, generateUUID, getCurrentTimestamp } from './turso'

export function TursoAdapter(): Adapter {
  return {
    async createUser(user) {
      const id = generateUUID()
      const now = getCurrentTimestamp()
      
      await db.execute({
        sql: `INSERT INTO users (id, name, email, email_verified, image, created_at, updated_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [id, user.name ?? null, user.email, user.emailVerified?.toISOString() ?? null, user.image ?? null, now, now]
      })
      
      // Also create default user settings
      await db.execute({
        sql: `INSERT INTO user_settings (id, user_id, daily_budget_target, currency, created_at, updated_at)
              VALUES (?, ?, 150.00, 'USD', ?, ?)`,
        args: [generateUUID(), id, now, now]
      })
      
      return {
        id,
        name: user.name ?? null,
        email: user.email,
        emailVerified: user.emailVerified ?? null,
        image: user.image ?? null,
      }
    },

    async getUser(id) {
      const result = await db.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [id]
      })
      
      if (!result.rows[0]) return null
      
      const row = result.rows[0]
      return {
        id: row.id as string,
        name: row.name as string | null,
        email: row.email as string,
        emailVerified: row.email_verified ? new Date(row.email_verified as string) : null,
        image: row.image as string | null,
      }
    },

    async getUserByEmail(email) {
      const result = await db.execute({
        sql: 'SELECT * FROM users WHERE email = ?',
        args: [email]
      })
      
      if (!result.rows[0]) return null
      
      const row = result.rows[0]
      return {
        id: row.id as string,
        name: row.name as string | null,
        email: row.email as string,
        emailVerified: row.email_verified ? new Date(row.email_verified as string) : null,
        image: row.image as string | null,
      }
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const result = await db.execute({
        sql: `SELECT u.* FROM users u
              JOIN accounts a ON u.id = a.user_id
              WHERE a.provider = ? AND a.provider_account_id = ?`,
        args: [provider, providerAccountId]
      })
      
      if (!result.rows[0]) return null
      
      const row = result.rows[0]
      return {
        id: row.id as string,
        name: row.name as string | null,
        email: row.email as string,
        emailVerified: row.email_verified ? new Date(row.email_verified as string) : null,
        image: row.image as string | null,
      }
    },

    async updateUser(user) {
      const now = getCurrentTimestamp()
      
      await db.execute({
        sql: `UPDATE users SET name = ?, email = ?, email_verified = ?, image = ?, updated_at = ?
              WHERE id = ?`,
        args: [
          user.name ?? null, 
          user.email ?? null, 
          user.emailVerified?.toISOString() ?? null, 
          user.image ?? null, 
          now, 
          user.id
        ]
      })
      
      const result = await db.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [user.id]
      })
      
      const row = result.rows[0]
      return {
        id: row.id as string,
        name: row.name as string | null,
        email: row.email as string,
        emailVerified: row.email_verified ? new Date(row.email_verified as string) : null,
        image: row.image as string | null,
      }
    },

    async deleteUser(userId) {
      await db.execute({
        sql: 'DELETE FROM users WHERE id = ?',
        args: [userId]
      })
    },

    async linkAccount(account) {
      const id = generateUUID()
      
      // Convert session_state to string if it's an object
      const sessionState = account.session_state 
        ? (typeof account.session_state === 'object' 
            ? JSON.stringify(account.session_state) 
            : String(account.session_state))
        : null
      
      await db.execute({
        sql: `INSERT INTO accounts (id, user_id, type, provider, provider_account_id, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.refresh_token ?? null,
          account.access_token ?? null,
          account.expires_at ?? null,
          account.token_type ?? null,
          account.scope ?? null,
          account.id_token ?? null,
          sessionState,
        ]
      })
      
      return account as AdapterAccount
    },

    async unlinkAccount({ providerAccountId, provider }) {
      await db.execute({
        sql: 'DELETE FROM accounts WHERE provider = ? AND provider_account_id = ?',
        args: [provider, providerAccountId]
      })
    },

    async createSession(session) {
      const id = generateUUID()
      
      await db.execute({
        sql: `INSERT INTO sessions (id, session_token, user_id, expires)
              VALUES (?, ?, ?, ?)`,
        args: [id, session.sessionToken, session.userId, session.expires.toISOString()]
      })
      
      return session
    },

    async getSessionAndUser(sessionToken) {
      const result = await db.execute({
        sql: `SELECT s.*, u.id as user_id, u.name, u.email, u.email_verified, u.image
              FROM sessions s
              JOIN users u ON s.user_id = u.id
              WHERE s.session_token = ?`,
        args: [sessionToken]
      })
      
      if (!result.rows[0]) return null
      
      const row = result.rows[0]
      
      return {
        session: {
          sessionToken: row.session_token as string,
          userId: row.user_id as string,
          expires: new Date(row.expires as string),
        },
        user: {
          id: row.user_id as string,
          name: row.name as string | null,
          email: row.email as string,
          emailVerified: row.email_verified ? new Date(row.email_verified as string) : null,
          image: row.image as string | null,
        },
      }
    },

    async updateSession(session) {
      await db.execute({
        sql: `UPDATE sessions SET expires = ? WHERE session_token = ?`,
        args: [session.expires?.toISOString() ?? null, session.sessionToken]
      })
      
      const result = await db.execute({
        sql: 'SELECT * FROM sessions WHERE session_token = ?',
        args: [session.sessionToken]
      })
      
      if (!result.rows[0]) return null
      
      const row = result.rows[0]
      return {
        sessionToken: row.session_token as string,
        userId: row.user_id as string,
        expires: new Date(row.expires as string),
      }
    },

    async deleteSession(sessionToken) {
      await db.execute({
        sql: 'DELETE FROM sessions WHERE session_token = ?',
        args: [sessionToken]
      })
    },

    async createVerificationToken(token) {
      await db.execute({
        sql: `INSERT INTO verification_tokens (identifier, token, expires)
              VALUES (?, ?, ?)`,
        args: [token.identifier, token.token, token.expires.toISOString()]
      })
      
      return token
    },

    async useVerificationToken({ identifier, token }) {
      const result = await db.execute({
        sql: 'SELECT * FROM verification_tokens WHERE identifier = ? AND token = ?',
        args: [identifier, token]
      })
      
      if (!result.rows[0]) return null
      
      await db.execute({
        sql: 'DELETE FROM verification_tokens WHERE identifier = ? AND token = ?',
        args: [identifier, token]
      })
      
      const row = result.rows[0]
      return {
        identifier: row.identifier as string,
        token: row.token as string,
        expires: new Date(row.expires as string),
      }
    },
  }
}
