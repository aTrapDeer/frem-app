import { supabase } from './supabase'
import { Database } from './supabase'

export type User = Database['public']['Tables']['users']['Row']
export type UserSettings = Database['public']['Tables']['user_settings']['Row']

// Authentication functions
export const signInWithGoogle = async () => {
  console.log('🔐 signInWithGoogle called')
  console.log('🌐 Current origin:', window.location.origin)
  console.log('🔄 Redirect URL will be:', `${window.location.origin}/auth/callback`)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  
  console.log('📤 OAuth response:', { data, error })
  
  if (error) {
    console.error('❌ Error signing in with Google:', error.message)
    throw error
  }
  
  console.log('✅ Google OAuth initiated successfully')
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Error signing out:', error.message)
    throw error
  }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('Error getting current user:', error.message)
    return null
  }
  
  return user
}

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('Error getting session:', error.message)
    return null
  }
  
  return session
}

// User profile functions - read-only operations
export const getUserProfile = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // User not found, return null
      return null
    }
    console.error('Error getting user profile:', error.message, error.code)
    throw error
  }

  return data
}

export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Settings not found, return null
      return null
    }
    console.error('Error getting user settings:', error.message, error.code)
    throw error
  }

  return data
}

export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user profile:', error.message)
    throw error
  }

  return data
}

export const updateUserSettings = async (userId: string, updates: Partial<UserSettings>) => {
  const { data, error } = await supabase
    .from('user_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user settings:', error.message)
    throw error
  }

  return data
} 