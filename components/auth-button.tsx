"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { ArrowRight, LogOut } from "lucide-react"

interface AuthButtonProps {
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "default" | "lg"
  className?: string
}

export function AuthButton({ variant = "default", size = "default", className }: AuthButtonProps) {
  const { isAuthenticated, signInWithGoogle, logout } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    try {
      setLoading(true)
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setLoading(true)
      await logout()
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (isAuthenticated) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleSignOut}
        disabled={loading}
        className={className}
      >
        {loading ? (
          "Signing out..."
        ) : (
          <>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </>
        )}
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSignIn}
      disabled={loading}
      className={className}
    >
      {loading ? (
        "Signing in..."
      ) : (
        <>
          Get Started Free
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  )
}
