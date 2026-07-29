"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { LoginModal } from "@/components/login-modal"
import { LedgerFlow } from "@/components/landing/ledger-flow"
import dynamic from "next/dynamic"

// three.js is ~150KB — loaded after paint, skipped entirely for
// prefers-reduced-motion inside the component
const MoneyField = dynamic(() => import("@/components/landing/money-field"), {
  ssr: false,
})
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check } from "lucide-react"

/**
 * The landing page.
 *
 * One idea carried all the way through: FREM shows what you actually spent
 * beside what you thought you would. Every section is a variation on that —
 * the hero animation draws a measured line against a plan line, the proof
 * strip shows plan-vs-actual bars, the features are the three places the
 * comparison pays off.
 */

const display = { fontFamily: 'var(--font-display), var(--font-dm-sans), sans-serif' }

const rise = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
} as const

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [loginOpen, setLoginOpen] = useState(false)

  // Signed-in users go straight to their numbers
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  const start = () => {
    if (user) router.push('/dashboard')
    else setLoginOpen(true)
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero: ink slab, money field flowing behind ───── */}
      <section className="pt-24 pb-10 px-3 sm:px-5">
        <div className="max-w-7xl mx-auto relative overflow-hidden rounded-xl bg-slate-950">
          {/* The 3D field: a few thousand transactions drifting along a rising current */}
          <MoneyField className="absolute inset-0" />
          {/* Legibility scrim over the text column only */}
          <div className="absolute inset-y-0 left-0 w-full lg:w-3/5 bg-gradient-to-r from-slate-950/85 via-slate-950/45 to-transparent pointer-events-none" />

          <div className="relative px-6 sm:px-10 lg:px-14 py-16 sm:py-20 lg:py-24">
            <div className="grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={display}
                  className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.02] tracking-[-0.02em]"
                >
                  Your money,
                  <br />
                  measured.
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-6 text-lg text-slate-300 max-w-md leading-relaxed"
                >
                  FREM links your accounts, sorts personal from business, and shows
                  what you actually spent beside what you planned to.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-9 flex items-center gap-4 flex-wrap"
                >
                  <Button
                    onClick={start}
                    size="lg"
                    className="bg-white hover:bg-slate-100 text-slate-950 h-12 px-7 text-base"
                  >
                    Start with your bank
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <a
                    href="#how"
                    className="text-base text-slate-300 hover:text-white transition-colors underline underline-offset-4 decoration-slate-600"
                  >
                    How it works
                  </a>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.45 }}
                  className="mt-6 text-sm text-slate-500"
                >
                  Read-only bank access. FREM can see balances and transactions.
                  It can never move money.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-lg bg-white border border-slate-200 shadow-2xl shadow-slate-950/40"
              >
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">This month, as it happens</span>
                  <span className="text-xs text-slate-400 tabular-nums">live</span>
                </div>
                <LedgerFlow className="w-full h-[340px] block" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Proof strip: the comparison, concretely ─────── */}
      <section className="py-14 border-y border-slate-100 bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...rise} className="grid sm:grid-cols-3 gap-x-10 gap-y-8">
            <PlanVsActual label="Dining out" planned={405} actual={968} />
            <PlanVsActual label="Groceries" planned={250} actual={256} />
            <PlanVsActual label="Subscriptions" planned={60} actual={181} />
          </motion.div>
          <motion.p {...rise} className="mt-8 text-sm text-slate-500 max-w-lg">
            Most budgeting apps stop at what you type in. FREM keeps your guess
            and lays the bank&apos;s answer next to it. The gap is where the money goes.
          </motion.p>
        </div>
      </section>

      {/* ── Feature: honest budget ───────────────────────── */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <motion.div {...rise}>
              <h2 style={display} className="text-3xl sm:text-4xl font-bold text-slate-950 tracking-[-0.01em]">
                Plan, meet reality
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed max-w-md">
                Say what you think you spend. Link your accounts. Every month,
                each category shows the guess, the fact, and the difference.
                Unknown merchants get sorted automatically; fix one and it stays
                fixed for every transaction like it.
              </p>
              <ul className="mt-6 space-y-2.5">
                {[
                  'Up to two years of history the moment you link',
                  'Groceries split from dining, rent split from utilities',
                  'Transfers between your own accounts never counted twice',
                ].map(line => (
                  <li key={line} className="flex gap-2.5 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div {...rise}>
              <BudgetMini />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Feature: two ledgers (the differentiator) ────── */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <motion.div {...rise} className="lg:order-2">
              <h2 style={display} className="text-3xl sm:text-4xl font-bold text-white tracking-[-0.01em]">
                Built for people who pay themselves
              </h2>
              <p className="mt-4 text-slate-400 leading-relaxed max-w-md">
                Run an LLC or freelance on the side? FREM keeps a personal ledger
                and a business ledger from one login. When you move money from
                the company to yourself, it asks once: salary or distribution?
                Then both books stay right, forever.
              </p>
              <p className="mt-4 text-sm text-slate-500">
                Employees skip all of this. FREM only shows business features to
                people who have a business.
              </p>
            </motion.div>
            <motion.div {...rise} className="lg:order-1">
              <OwnerPayMini />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Feature: goals on facts ──────────────────────── */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <motion.div {...rise}>
              <h2 style={display} className="text-3xl sm:text-4xl font-bold text-slate-950 tracking-[-0.01em]">
                Goals funded by facts
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed max-w-md">
                Your goals draw from the surplus you actually clear, not the one
                you hoped for. Link a goal to a real account, decide how much of
                that balance belongs to it, and watch it grow at that
                account&apos;s rate. A goal that can&apos;t be reached says so.
              </p>
            </motion.div>
            <motion.div {...rise}>
              <GoalMini />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section id="how" className="py-20 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2 {...rise} style={display} className="text-3xl font-bold text-slate-950 tracking-[-0.01em]">
            Three steps, two minutes
          </motion.h2>
          <div className="mt-10 grid md:grid-cols-3 gap-y-10 md:gap-x-12">
            {[
              {
                title: 'Link',
                body: 'Connect your banks read-only through Plaid. History arrives on its own, categorized.',
              },
              {
                title: 'Confirm',
                body: 'Answer the few things a bank feed can’t know. Business or personal? Salary or distribution? Once each.',
              },
              {
                title: 'Decide',
                body: 'Budgets, goals, and the AI advisor all run on measured numbers. What you do about them is the only part left to you.',
              },
            ].map((step, index) => (
              <motion.div
                key={step.title}
                {...rise}
                transition={{ ...rise.transition, delay: index * 0.08 }}
                className="border-t-2 border-slate-950 pt-5"
              >
                <h3 style={display} className="text-xl font-semibold text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing ──────────────────────────────────────── */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            {...rise}
            style={display}
            className="text-4xl sm:text-5xl font-bold text-white tracking-[-0.02em]"
          >
            See what your money has been doing.
          </motion.h2>
          <motion.div {...rise} className="mt-9">
            <Button
              onClick={start}
              size="lg"
              className="bg-white hover:bg-slate-100 text-slate-950 h-12 px-8 text-base"
            >
              Start free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}

// ── Small, real-looking fragments of the product ──────────

function PlanVsActual({ label, planned, actual }: { label: string; planned: number; actual: number }) {
  const over = actual > planned
  const max = Math.max(planned, actual) * 1.15

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-900">{label}</span>
        <span className={`text-sm font-semibold tabular-nums ${over ? 'text-amber-700' : 'text-emerald-700'}`}>
          {over ? '+' : ''}${(actual - planned).toLocaleString()}
        </span>
      </div>
      <div className="mt-2.5 relative h-2 bg-slate-200/70 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${(actual / max) * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className={`absolute inset-y-0 left-0 rounded-full ${over ? 'bg-amber-500' : 'bg-emerald-500'}`}
        />
        {/* The plan, as a tick you can hold the bar against */}
        <div
          className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-slate-900"
          style={{ left: `${(planned / max) * 100}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-slate-500 tabular-nums">
        <span>planned ${planned.toLocaleString()}</span>
        <span>actual ${actual.toLocaleString()}</span>
      </div>
    </div>
  )
}

function BudgetMini() {
  const rows = [
    { label: 'Housing', planned: 750, actual: 786 },
    { label: 'Groceries', planned: 250, actual: 256 },
    { label: 'Food & Dining', planned: 150, actual: 747 },
    { label: 'Utilities', planned: 100, actual: 243 },
    { label: 'Transportation', planned: 30, actual: 47 },
  ]

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 flex justify-between text-xs text-slate-500">
        <span className="font-medium">July</span>
        <span>planned · actual · difference</span>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row, index) => {
          const over = row.actual > row.planned
          return (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.07 }}
              className="px-4 py-3 flex items-center justify-between text-sm"
            >
              <span className="text-slate-800">{row.label}</span>
              <span className="tabular-nums text-slate-500">
                ${row.planned}
                <span className="mx-2 text-slate-300">·</span>
                <span className="text-slate-900 font-medium">${row.actual}</span>
                <span className="mx-2 text-slate-300">·</span>
                <span className={over ? 'text-amber-700 font-medium' : 'text-emerald-700 font-medium'}>
                  {over ? '+' : '−'}${Math.abs(row.actual - row.planned)}
                </span>
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function OwnerPayMini() {
  return (
    <div className="border border-slate-800 rounded-lg bg-slate-900 p-5">
      <p className="text-xs text-slate-500 mb-4">Review · transfers between your ledgers</p>

      <div className="rounded-md border border-slate-800 bg-slate-950 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-300 bg-violet-500/15 px-1.5 py-0.5 rounded">
              You paying yourself
            </span>
            <p className="text-sm text-slate-200 mt-2">
              Business Checking <span className="text-slate-600">→</span> Personal Checking
            </p>
            <p className="text-sm text-slate-500 mt-0.5">77 transfers · $3,597 this year</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <span className="text-xs px-3 py-1.5 rounded bg-white text-slate-950 font-medium">All salary</span>
          <span className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-300">All distributions</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md border border-slate-800 p-3">
          <p className="text-slate-500 text-xs">Business ledger</p>
          <p className="text-slate-200 mt-1 tabular-nums">− $3,597 owner pay</p>
        </div>
        <div className="rounded-md border border-slate-800 p-3">
          <p className="text-slate-500 text-xs">Personal ledger</p>
          <p className="text-slate-200 mt-1 tabular-nums">+ $3,597 income</p>
        </div>
      </div>
    </div>
  )
}

function GoalMini() {
  return (
    <div className="border border-slate-200 rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">House down payment</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Linked to Brokerage ····4471 · 80% of balance · grows ~7%
          </p>
        </div>
        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
          on track
        </span>
      </div>

      <div className="mt-5">
        <div className="flex justify-between text-xs text-slate-500 tabular-nums mb-1.5">
          <span>$18,400 today</span>
          <span>$60,000 by 2029</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: '31%' }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="h-full bg-slate-950 rounded-full"
          />
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500 leading-relaxed">
        Funded from measured surplus, weighted by how important it is and how
        soon it&apos;s due. Retirement in 2056 stays important without pretending
        to be urgent.
      </p>
    </div>
  )
}
