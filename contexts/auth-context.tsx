'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

type User = {
  id: string
  name: string | null
  email: string
  image: string | null
}

type UserSettings = {
  id: string
  user_id: string
  daily_budget_target: number
  currency: string
  preferred_language: string
  notifications_enabled: boolean
  dark_mode: boolean
  weekly_summary_email: boolean
  created_at: string
  updated_at: string
}

type AuthContextType = {
  user: User | null
  userSettings: UserSettings | null
  isLoading: boolean
  isAuthenticated: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  refreshUserSettings: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)

  const isLoading = status === 'loading'
  const isAuthenticated = !!session?.user
  
  const user: User | null = session?.user ? {
    id: session.user.id as string,
    name: session.user.name ?? null,
    email: session.user.email ?? '',
    image: session.user.image ?? null,
  } : null

  // Fetch user settings when authenticated (via API route)
  useEffect(() => {
    async function fetchSettings() {
      if (session?.user?.id) {
        setIsLoadingSettings(true)
        try {
          const response = await fetch('/api/user/settings')
          if (response.ok) {
            const settings = await response.json()
            setUserSettings(settings)
          }
        } catch (error) {
          console.error('Error fetching user settings:', error)
        } finally {
          setIsLoadingSettings(false)
        }
      } else {
        setUserSettings(null)
      }
    }
    
    fetchSettings()
  }, [session?.user?.id])

  const signInWithGoogle = async () => {
    try {
      await signIn('google', { callbackUrl: '/dashboard' })
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut({ callbackUrl: '/' })
      setUserSettings(null)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const refreshUserSettings = async () => {
    if (session?.user?.id) {
      try {
        const response = await fetch('/api/user/settings')
        if (response.ok) {
          const settings = await response.json()
          setUserSettings(settings)
        }
      } catch (error) {
        console.error('Error refreshing user settings:', error)
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userSettings,
        isLoading: isLoading || isLoadingSettings,
        isAuthenticated,
        signInWithGoogle,
        logout,
        refreshUserSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
