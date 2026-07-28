"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { LedgerView } from "@/components/ledger-view"
import { ArrowRight } from "lucide-react"

export default function LedgerPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Navbar />

        <main className="pt-24 pb-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-4xl font-bold text-slate-900 mb-2">Ledger</h1>
                  <p className="text-slate-600">
                    What you planned, against what actually happened.
                  </p>
                </div>

                <Link
                  href="/accounts"
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Manage accounts
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <LedgerView />
            </motion.div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
