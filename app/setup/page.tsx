"use client"

import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { SetupWizard } from "@/components/setup-wizard"

export default function SetupPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Navbar />

        <main className="pt-24 pb-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <SetupWizard />
            </motion.div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
