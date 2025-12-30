"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { X, Mail, Lock, ArrowRight } from "lucide-react"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  
  const modalRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Handle escape key and focus management
  useEffect(() => {
    if (isOpen) {
      // Store current scroll position
      const scrollY = window.scrollY
      
      // Disable scroll when modal is open
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      
      // Focus first input when modal opens
      setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus()
        }
      }, 100)
      
      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }
      
      document.addEventListener('keydown', handleEscape)
      
      return () => {
        document.removeEventListener('keydown', handleEscape)
        // Restore scroll position when modal closes
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, scrollY)
      }
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
    }
  }, [isOpen, onClose])

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      await signInWithGoogle()
      onClose()
    } catch (error) {
      console.error('Google sign in error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement email/password authentication with NextAuth credentials provider
    console.log('Email auth not implemented yet')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="bg-black/60 backdrop-blur-sm"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
            padding: '1rem'
          }}
          onClick={onClose}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.9, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 32 }}
            transition={{ 
              duration: 0.2,
              type: "spring",
              damping: 25,
              stiffness: 300
            }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto mx-auto my-auto"
            style={{
              maxWidth: 'min(28rem, 90vw)',
              maxHeight: '90vh'
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
          >
            <Card className="bg-white border border-slate-200 shadow-2xl rounded-2xl relative"
                  style={{ 
                    margin: 0,
                    transform: 'none',
                    position: 'relative'
                  }}>
              <CardHeader className="relative text-center pb-6">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 p-2 rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
                
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-fuchsia-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-2xl">F</span>
                </div>
                
                <CardTitle id="login-modal-title" className="text-2xl font-bold text-slate-900">
                  {mode === 'signin' ? 'Welcome back!' : 'Create your account'}
                </CardTitle>
                <p className="text-slate-600">
                  {mode === 'signin' 
                    ? 'Sign in to continue your financial journey' 
                    : 'Start your journey to financial freedom'
                  }
                </p>
              </CardHeader>

              <CardContent className="space-y-6 px-6 pb-6">
                {/* Google Sign In */}
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                  size="lg"
                >
                  {loading ? (
                    "Signing in..."
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-500">Or continue with email</span>
                  </div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {mode === 'signup' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          ref={firstInputRef}
                          id="firstName"
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        ref={mode === 'signin' ? firstInputRef : undefined}
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 bg-white"
                      />
                    </div>
                  </div>

                  {mode === 'signup' && (
                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      "Please wait..."
                    ) : (
                      <>
                        {mode === 'signin' ? 'Sign In' : 'Create Account'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Toggle between signin/signup */}
                <div className="text-center text-sm">
                  <span className="text-slate-600">
                    {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                    className="ml-1 font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline"
                  >
                    {mode === 'signin' ? 'Sign up' : 'Sign in'}
                  </button>
                </div>

                {/* Coming Soon Notice for Email Auth */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800 text-center">
                    <strong>Note:</strong> Email/password authentication is coming soon! For now, please use Google to sign in.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
