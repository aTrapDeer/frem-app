"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, User, Settings, LogOut, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { LoginModal } from "@/components/login-modal"

export function Navbar() {
  const { user, userProfile, loading, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      setAccountOpen(false)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.nav
      className={`fixed top-0 w-full z-50 transition-all duration-200 ${
        scrolled ? "bg-white/80 backdrop-blur-md shadow-sm" : "bg-transparent"
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 focus-ring rounded-lg">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-fuchsia-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-xl font-bold gradient-text">FREM</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Navigation Links - Only show for authenticated users */}
            {user && (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-slate-600 hover:text-slate-900 focus-ring rounded transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/daily"
                  className="text-sm text-slate-600 hover:text-slate-900 focus-ring rounded transition-colors"
                >
                  Daily
                </Link>
                <Link
                  href="/summary"
                  className="text-sm text-slate-600 hover:text-slate-900 focus-ring rounded transition-colors"
                >
                  Summary
                </Link>
                <Link
                  href="/goals"
                  className="text-sm text-slate-600 hover:text-slate-900 focus-ring rounded transition-colors"
                >
                  Goals
                </Link>
                <Link
                  href="/recurring"
                  className="text-sm text-slate-600 hover:text-slate-900 focus-ring rounded transition-colors"
                >
                  Recurring
                </Link>
              </>
            )}

            {/* Auth Section */}
            {user ? (
              /* Account Dropdown for authenticated users */
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAccountOpen(!accountOpen)}
                  className="flex items-center space-x-2 focus-ring"
                >
                  {userProfile?.profile_image_url ? (
                    <img 
                      src={userProfile.profile_image_url} 
                      alt="Profile" 
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span>{userProfile?.first_name || 'Account'}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>

                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 glass-card rounded-lg shadow-lg z-50"
                    >
                      <div className="py-2">
                        {userProfile && (
                          <div className="px-4 py-2 border-b border-slate-200">
                            <p className="text-sm font-medium text-slate-900">
                              {userProfile.first_name} {userProfile.last_name}
                            </p>
                            <p className="text-xs text-slate-600">{userProfile.email}</p>
                          </div>
                        )}
                        <button className="flex items-center w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </button>
                        <button 
                          onClick={handleSignOut}
                          className="flex items-center w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Get Started button for unauthenticated users */
              <Button
                onClick={() => setLoginModalOpen(true)}
                className="bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white btn-press"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Get Started'}
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button variant="ghost" size="sm" className="md:hidden focus-ring" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white/90 backdrop-blur-md border-t border-slate-200"
          >
            <div className="px-4 py-4 space-y-3">
              {user ? (
                <>
                  {/* Mobile Navigation Links for authenticated users */}
                  <Link
                    href="/dashboard"
                    className="block text-slate-600 hover:text-slate-900 focus-ring rounded transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/daily"
                    className="block text-slate-600 hover:text-slate-900 focus-ring rounded transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Daily
                  </Link>
                  <Link
                    href="/summary"
                    className="block text-slate-600 hover:text-slate-900 focus-ring rounded transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Summary
                  </Link>
                  <Link
                    href="/goals"
                    className="block text-slate-600 hover:text-slate-900 focus-ring rounded transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Goals
                  </Link>
                  <Link
                    href="/recurring"
                    className="block text-slate-600 hover:text-slate-900 focus-ring rounded transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Recurring
                  </Link>
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    {userProfile && (
                      <div className="pb-2">
                        <p className="text-sm font-medium text-slate-900">
                          {userProfile.first_name} {userProfile.last_name}
                        </p>
                        <p className="text-xs text-slate-600">{userProfile.email}</p>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      onClick={() => setIsOpen(false)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        handleSignOut()
                        setIsOpen(false)
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </Button>
                  </div>
                </>
              ) : (
                /* Get Started button for unauthenticated mobile users */
                <div className="pt-3">
                  <Button 
                    className="w-full bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white btn-press"
                    onClick={() => {
                      setLoginModalOpen(true)
                      setIsOpen(false)
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Get Started'}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </motion.nav>
  )
}
