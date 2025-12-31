import { createClient, Client } from '@libsql/client'

// Only create the client on the server side
let turso: Client | null = null

function getTursoClient(): Client {
  // Check if we're on the server
  if (typeof window !== 'undefined') {
    throw new Error('Turso client can only be used on the server side')
  }
  
  if (!turso) {
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error('Missing TURSO_DATABASE_URL environment variable')
    }

    if (!process.env.TURSO_AUTH_TOKEN) {
      throw new Error('Missing TURSO_AUTH_TOKEN environment variable')
    }

    turso = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }
  
  return turso
}

// Export a proxy that lazily initializes the client
export const db = {
  execute: (...args: Parameters<Client['execute']>) => getTursoClient().execute(...args),
  batch: (...args: Parameters<Client['batch']>) => getTursoClient().batch(...args),
}

// For backward compatibility, also export as turso
export { db as turso }

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
