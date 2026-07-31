"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { MoneyView } from "@/components/money-view"
import { PageHeader } from "@/components/page-header"
import { ArrowRight } from "lucide-react"

export default function MoneyPage() {
  return (
    <AuthGuard>
      <div className="app-surface">
        <Navbar />

        <main className="pt-24 pb-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <PageHeader
                title="Money"
                subtitle="Everything the ledger measured, and the plan it's measured against."
                actions={(
                  <Link
                    href="/accounts"
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Manage accounts
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <MoneyView />
            </motion.div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
