"use client"

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Session-scoped memory for the setup gate so we ask the server at most once
 * per login, not on every page navigation.
 */
function setupGateSuppressed(): boolean {
  try {
    return (
      sessionStorage.getItem('frem-setup-skip') === '1' ||
      sessionStorage.getItem('frem-setup-done') === '1'
    )
  } catch {
    return true
  }
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  // Setup gate: until setup is completed, every login lands on the wizard.
  // "Skip for now" suppresses it for the current session only. Fails open —
  // any error means the user simply is not redirected.
  useEffect(() => {
    if (isLoading || !user) return
    if (pathname === '/setup') return
    if (setupGateSuppressed()) return

    let cancelled = false

    async function check() {
      try {
        const response = await fetch('/api/setup')
        if (!response.ok || cancelled) return
        const data = await response.json()

        if (data.completed) {
          sessionStorage.setItem('frem-setup-done', '1')
        } else {
          router.replace('/setup')
        }
      } catch {
        // Fail open — never lock someone out of their data over a gate check
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [user, isLoading, pathname, router])

  // Show loading state
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      )
    )
  }

  // Don't render if user is not authenticated (will redirect)
  if (!user) {
    return null
  }

  return <>{children}</>
}
