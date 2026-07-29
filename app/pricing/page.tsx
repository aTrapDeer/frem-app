"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { LoginModal } from "@/components/login-modal"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check } from "lucide-react"

/**
 * Pricing.
 *
 * Two tiers because there are two kinds of user: people with a paycheck, and
 * people who also run a company. The business tier is priced against what it
 * replaces (an hour of bookkeeping) rather than against budgeting apps.
 *
 * The connected-institution add-on exists because that is the one cost that
 * genuinely scales per user — each linked institution is a metered upstream
 * cost, so heavy linkers pay their own way instead of everyone subsidising
 * them.
 */

const display = { fontFamily: 'var(--font-display), var(--font-dm-sans), sans-serif' }

const rise = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
} as const

const INDIVIDUAL = [
  'Link up to 3 institutions, read-only',
  'Up to two years of transaction history',
  'Plan-vs-actual budgets, automatic categories',
  'Goals funded from measured surplus',
  'AI financial reports and chat',
]

const BUSINESS = [
  'Everything in Individual',
  'Link up to 6 institutions',
  'Separate personal and business ledgers',
  'Owner-pay tracking: salary vs distribution',
  'S-corp aware tax and take-home modeling',
  'Business-aware AI advisor',
]

export default function PricingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loginOpen, setLoginOpen] = useState(false)

  const start = () => {
    if (user) router.push('/dashboard')
    else setLoginOpen(true)
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-32 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...rise} className="max-w-2xl">
            <h1
              style={display}
              className="text-4xl sm:text-5xl font-bold text-slate-950 tracking-[-0.02em]"
            >
              Fourteen days free.
              <br />
              Then pick your ledger.
            </h1>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              Two weeks is enough to link your accounts, watch a real pay cycle
              land, and see your plan measured against it. No card required to
              start.
            </p>
          </motion.div>

          <div className="mt-14 grid md:grid-cols-2 gap-6 items-stretch">
            {/* Individual */}
            <motion.div
              {...rise}
              className="border border-slate-200 rounded-xl p-8 flex flex-col"
            >
              <div>
                <h2 style={display} className="text-xl font-semibold text-slate-950">
                  Individual
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  For people with a paycheck and a plan.
                </p>
              </div>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span style={display} className="text-4xl font-bold text-slate-950 tabular-nums">
                  $9.99
                </span>
                <span className="text-sm text-slate-500">/ month</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">or $99/year — two months free</p>

              <ul className="mt-7 space-y-3 flex-1">
                {INDIVIDUAL.map(line => (
                  <li key={line} className="flex gap-2.5 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>

              <Button
                onClick={start}
                variant="outline"
                className="mt-8 h-11 w-full border-slate-300 text-slate-900 hover:bg-slate-50"
              >
                Start 14-day free trial
              </Button>
            </motion.div>

            {/* Business — the tier the product was built for */}
            <motion.div
              {...rise}
              transition={{ ...rise.transition, delay: 0.08 }}
              className="rounded-xl p-8 flex flex-col bg-slate-950 text-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 style={display} className="text-xl font-semibold text-white">
                    Business + Individual
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    For owners who pay themselves.
                  </p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide bg-white/10 text-slate-300 px-2 py-1 rounded-full shrink-0">
                  Built for this
                </span>
              </div>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span style={display} className="text-4xl font-bold text-white tabular-nums">
                  $24.99
                </span>
                <span className="text-sm text-slate-400">/ month</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">or $249/year — two months free</p>

              <ul className="mt-7 space-y-3 flex-1">
                {BUSINESS.map(line => (
                  <li key={line} className="flex gap-2.5 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>

              <Button
                onClick={start}
                className="mt-8 h-11 w-full bg-white hover:bg-slate-100 text-slate-950"
              >
                Start 14-day free trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>

          {/* The one variable cost, priced like the cost it is */}
          <motion.div
            {...rise}
            className="mt-6 border border-slate-200 rounded-xl px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900">More institutions?</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-lg">
                Each connected institution carries a real per-connection cost on
                our side, so extras are priced at cost instead of padded into
                everyone&apos;s plan.
              </p>
            </div>
            <p className="text-sm text-slate-900 font-medium tabular-nums shrink-0">
              +$1.99 / month per extra institution
            </p>
          </motion.div>

          {/* Straight answers */}
          <motion.div {...rise} className="mt-16 grid md:grid-cols-3 gap-x-12 gap-y-8">
            {[
              {
                q: 'Can FREM move my money?',
                a: 'No, and it never will. Access is read-only: balances, transactions, statements. There is no code path that initiates a transfer or payment.',
              },
              {
                q: 'What happens after the trial?',
                a: 'You pick a plan or you don’t. If you don’t, your data stays yours — export or delete it — and nothing is charged. Cancel anytime, effective at the period’s end.',
              },
              {
                q: 'Is this financial advice?',
                a: 'No. FREM measures, models, and explains. Decisions about investments, taxes, and insurance belong with you and a licensed professional.',
              },
            ].map(item => (
              <div key={item.q}>
                <h3 className="text-sm font-semibold text-slate-900">{item.q}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </main>

      <Footer />
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
