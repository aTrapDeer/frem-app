// Re-export auth functions from the main auth config
// This file maintains backward compatibility with existing imports

export { signIn, signOut, auth } from '@/auth'

// Helper function for client-side Google sign in
export const signInWithGoogle = async () => {
  const { signIn } = await import('next-auth/react')
  return signIn('google', { callbackUrl: '/dashboard' })
}

// Helper function for client-side sign out
export const signOutUser = async () => {
  const { signOut } = await import('next-auth/react')
  return signOut({ callbackUrl: '/' })
}

// Get current session (server-side)
export const getSession = async () => {
  const { auth } = await import('@/auth')
  return auth()
}

// Get current user (server-side)
export const getCurrentUser = async () => {
  const session = await getSession()
  return session?.user ?? null
}
