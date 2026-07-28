"use client"

import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { BankConnections } from "@/components/bank-connections"
import { Lock } from "lucide-react"

export default function AccountsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Navbar />

        {/* pt-24 clears the fixed navbar, matching the other pages */}
        <main className="pt-24 pb-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-4xl font-bold text-slate-900 mb-2">Accounts</h1>
                  <p className="text-slate-600">
                    Link your banks once and FREM keeps itself current.
                  </p>
                </div>

                {/* Reassurance belongs near the action, not in a banner above it */}
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Read-only · encrypted</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <BankConnections />
            </motion.div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
