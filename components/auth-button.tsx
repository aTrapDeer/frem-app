"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { signInWithGoogle, signOut } from "@/lib/auth"
import { ArrowRight, LogOut } from "lucide-react"

interface AuthButtonProps {
  isAuthenticated: boolean
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "default" | "lg"
  className?: string
}

export function AuthButton({ isAuthenticated, variant = "default", size = "default", className }: AuthButtonProps) {
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
      await signOut()
      window.location.href = '/'
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