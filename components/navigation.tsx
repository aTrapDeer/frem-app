"use client"

import { useState } from "react"
import { Menu, X, User, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface NavigationProps {
  currentPage: string
}

export function Navigation({ currentPage }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)

  const isCurrentPage = (page: string) => currentPage === page

  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-white/90 border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FREM
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/dashboard"
              className={`transition-colors ${isCurrentPage("dashboard") ? "text-blue-600 font-medium" : "text-gray-700 hover:text-blue-600"}`}
            >
              Dashboard
            </Link>
            <Link
              href="/daily"
              className={`transition-colors ${isCurrentPage("daily") ? "text-blue-600 font-medium" : "text-gray-700 hover:text-blue-600"}`}
            >
              Daily
            </Link>
            <Link
              href="/roadmap"
              className={`transition-colors ${isCurrentPage("roadmap") ? "text-blue-600 font-medium" : "text-gray-700 hover:text-blue-600"}`}
            >
              Roadmap
            </Link>
            <Link
              href="/goals"
              className={`transition-colors ${isCurrentPage("goals") ? "text-blue-600 font-medium" : "text-gray-700 hover:text-blue-600"}`}
            >
              Goals
            </Link>
            <Link
              href="/recurring"
              className={`transition-colors ${isCurrentPage("recurring") ? "text-blue-600 font-medium" : "text-gray-700 hover:text-blue-600"}`}
            >
              Recurring
            </Link>

            {/* Account Dropdown */}
            <div className="relative">
              <button
                onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                <User className="h-4 w-4" />
                <span>Account</span>
              </button>

              {accountDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2">
                  <Button className="w-full justify-start bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white mx-2 mb-2">
                    Get Started
                  </Button>
                  <Link href="/settings" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                  <button className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-50">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-4">
            <div className="flex flex-col space-y-4">
              <Link
                href="/dashboard"
                className={`px-4 transition-colors ${isCurrentPage("dashboard") ? "text-blue-600 font-medium" : "text-gray-700 hover:text-blue-600"}`}
              >
                Dashboard
              </Link>
              <Link
                href="/daily"
                className={`px-4 transition-colors ${isCurrentPage("daily") ? "text-blue-600 font-medium" : "text-gray-700 hover:text-blue-600"}`}
              >
                Daily
              </Link>
              <Link
                href="/roadmap"
                className={`px-4 transition-colors ${isCurrentPage("roadmap") ? "text-blue-600 font-medium" : "text-gray-700 hover:text-blue-600"}`}
              >
                Roadmap
              </Link>
              <Link
                href="/goals"
                className={`px-4 transition-colors ${isCurrentPage("goals") ? "text-blue-600 font-medium" : "text-gray-700 hover:text-blue-600"}`}
              >
                Goals
              </Link>
              <Link
                href="/recurring"
                className={`px-4 transition-colors ${isCurrentPage("recurring") ? "text-blue-600 font-medium" : "text-gray-700 hover:text-blue-600"}`}
              >
                Recurring
              </Link>
              <div className="px-4 pt-2 border-t border-gray-100">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white mb-2">
                  Get Started
                </Button>
                <Link href="/settings" className="flex items-center py-2 text-gray-700">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
                <button className="flex items-center py-2 text-gray-700">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
