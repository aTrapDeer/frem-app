"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { User, getUserProfile, getUserSettings, UserSettings } from '@/lib/auth'

interface AuthContextType {
  user: SupabaseUser | null
  userProfile: User | null
  userSettings: UserSettings | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Handle OAuth callback specifically
    const handleOAuthCallback = async () => {
      if (typeof window !== 'undefined' && window.location.pathname === '/auth/callback') {
        console.log('🔄 Processing OAuth callback...')
        
        // Let Supabase handle the OAuth callback automatically
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ OAuth callback error:', error)
          // If there's an error, redirect to error page
          window.location.href = `/auth/error?error=${encodeURIComponent(error.message)}`
          return
        }
        
        if (data?.session?.user) {
          console.log('✅ OAuth callback successful:', data.session.user.email)
          // Redirect to dashboard after successful auth
          window.location.href = '/dashboard'
          return
        }
      }
    }

    const getInitialSession = async () => {
      try {
        console.log('🔍 Getting initial session...')
        
        // Check if we're on the callback page with auth params
        if (typeof window !== 'undefined' && window.location.pathname === '/auth/callback') {
          console.log('🔗 On callback page, checking for auth session...')
          // Give Supabase a moment to process the OAuth callback
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting session:', error)
        }
        
        console.log('📋 Initial session result:', {
          hasSession: !!session,
          email: session?.user?.email,
          userId: session?.user?.id,
          expires: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : null,
          currentPath: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
        })
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          try {
            await fetchUserData(session.user.id)
          } catch (error) {
            console.error('Failed to fetch initial user data, but continuing:', error)
            // Allow app to continue even if user data fetch fails
          }
        }
        
        setLoading(false)
      } catch (error) {
        console.error('❌ Error getting initial session:', error)
        setLoading(false)
      }
    }

    // Handle OAuth callback first, then get initial session
    handleOAuthCallback().then(() => {
      if (typeof window === 'undefined' || window.location.pathname !== '/auth/callback') {
        getInitialSession()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', {
        event,
        hasSession: !!session,
        email: session?.user?.email,
        userId: session?.user?.id,
        expires: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : null
      })
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        try {
          await fetchUserData(session.user.id)
        } catch (error) {
          console.error('Failed to fetch user data, but continuing with auth:', error)
          // Still allow auth to succeed even if data fetch fails
        }
      } else {
        setUserProfile(null)
        setUserSettings(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserData = async (userId: string) => {
    try {
      console.log('Fetching user data for:', userId)
      
      // Try to fetch user data with retries for new users
      let retries = 3
      let profile = null
      let settings = null
      
      while (retries > 0) {
        try {
          const [fetchedProfile, fetchedSettings] = await Promise.all([
            getUserProfile(userId),
            getUserSettings(userId)
          ])
          
          profile = fetchedProfile
          settings = fetchedSettings
          
          if (profile && settings) {
            // Successfully got both, break out of retry loop
            break
          }
          
          if (retries > 1) {
            console.log(`User data not found, waiting for database trigger... (${3 - retries + 1}/3)`)
            // Wait a bit for the database trigger to create the profile for new users
            await new Promise(resolve => setTimeout(resolve, 1500))
          }
          
        } catch (error: any) {
          console.error(`Error fetching user data (attempt ${4 - retries}):`, error)
          
          // If it's a permission error and we have retries left, wait and try again
          if ((error.code === 'PGRST116' || error.message?.includes('not acceptable')) && retries > 1) {
            console.log('Retrying after permission error...')
            await new Promise(resolve => setTimeout(resolve, 1500))
          } else if (retries === 1) {
            // Last retry failed, throw the error
            throw error
          }
        }
        
        retries--
      }
      
      console.log('Fetched profile:', profile)
      console.log('Fetched settings:', settings)
      
      setUserProfile(profile)
      setUserSettings(settings)
      
      if (!profile || !settings) {
        console.warn('User profile or settings still missing after retries. Database trigger may not be configured.')
      }
      
    } catch (error) {
      console.error('Error fetching user data:', error)
      // Don't fail the entire auth process if user data fetch fails
      // Set empty states so the user can still access the app
      setUserProfile(null)
      setUserSettings(null)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    userProfile,
    userSettings,
    session,
    loading,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 