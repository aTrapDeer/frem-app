import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/**
 * Envelope encryption for third-party credentials (Plaid access tokens, Mercury
 * API keys) stored in Turso.
 *
 * These tokens read a user's real financial data, so a database leak alone must
 * not be enough to use them — the key lives in the environment, never in the DB.
 *
 * Format: v1:<iv>:<authTag>:<ciphertext>, each segment base64.
 * The version prefix lets us rotate algorithms later without breaking old rows.
 */

const ALGORITHM = 'aes-256-gcm'
const VERSION = 'v1'
const KEY_BYTES = 32
const IV_BYTES = 12 // 96 bits, the recommended nonce size for GCM

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey

  const rawKey = process.env.ENCRYPTION_KEY

  if (!rawKey) {
    throw new Error(
      'Missing ENCRYPTION_KEY environment variable. Generate one with: openssl rand -base64 32'
    )
  }

  const key = Buffer.from(rawKey, 'base64')

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}. Generate one with: openssl rand -base64 32`
    )
  }

  cachedKey = key
  return key
}

/**
 * Encrypts a secret for storage. Never log or return the plaintext to a client.
 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':')
}

/**
 * Decrypts a value produced by `encrypt`. Throws if the payload was tampered
 * with — GCM authentication failure is a signal worth surfacing, not swallowing.
 */
export function decrypt(payload: string): string {
  const segments = payload.split(':')

  if (segments.length !== 4) {
    throw new Error('Malformed encrypted payload')
  }

  const [version, ivB64, authTagB64, ciphertextB64] = segments

  if (version !== VERSION) {
    throw new Error(`Unsupported encryption version: ${version}`)
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

/**
 * True when a usable ENCRYPTION_KEY is configured. Lets routes fail with a clear
 * setup error instead of a crypto exception.
 */
export function isEncryptionConfigured(): boolean {
  try {
    getKey()
    return true
  } catch {
    return false
  }
}
