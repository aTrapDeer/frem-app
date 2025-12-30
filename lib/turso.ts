import { createClient } from '@libsql/client'

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error('Missing TURSO_DATABASE_URL environment variable')
}

if (!process.env.TURSO_AUTH_TOKEN) {
  throw new Error('Missing TURSO_AUTH_TOKEN environment variable')
}

export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

// Helper to generate UUIDs (since SQLite doesn't have gen_random_uuid())
export function generateUUID(): string {
  return crypto.randomUUID()
}

// Helper to get current ISO timestamp
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

// Helper to get current date in YYYY-MM-DD format
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0]
}

