"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlaidLinkButton } from "@/components/plaid-link-button"
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  CreditCard,
  Landmark,
  Link2,
  Loader2,
  PiggyBank,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react"

/**
 * The setup wizard: everything the app cannot learn from a bank feed.
 *
 * Branching keeps it honest — a W-2 employee answers eight quick screens and
 * never sees a business question. Every answer feeds a number the app actually
 * computes with: growth rates, DTI, tax math, budget baselines.
 *
 * Defensive by design: each save call tolerates failure so a half-finished
 * backend (or a skipped step) never strands the user mid-flow.
 */

type Entity = 'personal' | 'business'
type EarningType = 'w2' | 'business' | 'freelance' | 'other'
type StepId =
  | 'welcome'
  | 'earn'
  | 'business'
  | 'income'
  | 'tax'
  | 'spending'
  | 'investments'
  | 'debts'
  | 'goals'
  | 'link'
  | 'done'

interface IncomeRow {
  name: string
  amount: string
  entity: Entity
}

interface InvestmentRow {
  accountType: '401k' | 'ira' | 'roth' | 'brokerage' | 'hsa' | 'other'
  balance: string
  riskProfile: 'conservative' | 'index' | 'aggressive'
}

interface LiabilityRow {
  name: string
  kind: 'credit_card' | 'student_loan' | 'auto_loan' | 'mortgage' | 'personal_loan' | 'other'
  balance: string
  rate: string
}

interface GoalPick {
  enabled: boolean
  amount: string
  months: number
}

interface Answers {
  earningTypes: EarningType[]
  businessType: string
  paymentForms: string[]
  ownership: string
  incomeRows: IncomeRow[]
  filingStatus: 'single' | 'married_joint' | null
  taxState: string
  estimates: Record<string, string>
  investments: InvestmentRow[]
  liabilities: LiabilityRow[]
  goals: Record<string, GoalPick>
}

interface Prefill {
  earningTypes: string[]
  filingStatus: 'single' | 'married_joint' | null
  taxState: string | null
  businessProfile: { businessType: string; paymentForms: string[]; ownershipPercentage: number } | null
  incomeSourceCount: number
  estimateCount: number
  activeGoalCount: number
  hasBankData: boolean
  accountCount: number
  investments: Array<{ id: string; accountType: string; balance: number; riskProfile: string }>
  liabilities: Array<{ id: string; name: string; kind: string; balance: number; interestRate: number | null }>
}

const SPENDING_CATEGORIES = [
  { key: 'groceries', label: 'Groceries' },
  { key: 'food', label: 'Eating out & coffee' },
  { key: 'housing', label: 'Rent / mortgage payment' },
  { key: 'utilities', label: 'Utilities & phone' },
  { key: 'transportation', label: 'Transportation' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'entertainment', label: 'Entertainment' },
] as const

/** Mirrors RISK_PROFILE_RATES in lib/setup.ts — server is the authority. */
const RISK_RATES = { conservative: 4, index: 7, aggressive: 10 } as const

const BUSINESS_TYPES = [
  { value: 'sole_prop', label: 'Sole proprietor' },
  { value: 'llc', label: 'LLC' },
  { value: 'llc_s_corp', label: 'LLC with S-corp election' },
  { value: 's_corp', label: 'S-corp' },
  { value: 'c_corp', label: 'C-corp' },
  { value: 'partnership', label: 'Partnership' },
] as const

const PAYMENT_FORM_OPTIONS = [
  { value: 'w2_salary', label: 'W-2 salary from my company' },
  { value: 'owner_draw', label: 'Owner draws' },
  { value: 'distributions', label: 'Distributions' },
  { value: 'client_invoices', label: 'Client invoices' },
  { value: 'platform_payouts', label: 'Platform payouts' },
  { value: 'other', label: 'Other' },
] as const

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
] as const

const DEFAULT_ANSWERS: Answers = {
  earningTypes: [],
  businessType: 'llc_s_corp',
  paymentForms: [],
  ownership: '100',
  incomeRows: [{ name: '', amount: '', entity: 'personal' }],
  filingStatus: null,
  taxState: '',
  estimates: {},
  investments: [],
  liabilities: [],
  goals: {
    emergency: { enabled: false, amount: '6000', months: 12 },
    debt: { enabled: false, amount: '5000', months: 18 },
    house: { enabled: false, amount: '60000', months: 36 },
    retirement: { enabled: false, amount: '1000000', months: 360 },
  },
}

function addMonthsIso(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  return date.toISOString().split('T')[0]
}

async function post(url: string, body: unknown): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return response.ok
  } catch {
    return false
  }
}

export function SetupWizard() {
  const router = useRouter()
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS)
  const [prefill, setPrefill] = useState<Prefill | null>(null)
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [busy, setBusy] = useState(false)

  // Prefill: never ask for what the account already knows
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch('/api/setup')
        if (!response.ok || cancelled) return
        const data = await response.json()
        const loaded: Prefill = data.prefill

        setPrefill(loaded)
        setAlreadyCompleted(Boolean(data.completed))

        setAnswers(previous => ({
          ...previous,
          earningTypes: (loaded.earningTypes as EarningType[]) ?? [],
          filingStatus: loaded.filingStatus,
          taxState: loaded.taxState ?? '',
          businessType: loaded.businessProfile?.businessType ?? previous.businessType,
          paymentForms: loaded.businessProfile?.paymentForms ?? [],
          ownership: String(loaded.businessProfile?.ownershipPercentage ?? 100),
          investments: loaded.investments.map(item => ({
            accountType: item.accountType as InvestmentRow['accountType'],
            balance: String(item.balance),
            riskProfile: item.riskProfile as InvestmentRow['riskProfile'],
          })),
          liabilities: loaded.liabilities.map(item => ({
            name: item.name,
            kind: item.kind as LiabilityRow['kind'],
            balance: String(item.balance),
            rate: item.interestRate === null ? '' : String(item.interestRate),
          })),
        }))
      } catch {
        // No setup API yet — the wizard still works for everything it can reach
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const hasBusiness =
    answers.earningTypes.includes('business') || answers.earningTypes.includes('freelance')

  const steps: StepId[] = useMemo(() => {
    const list: StepId[] = ['welcome', 'earn']
    if (hasBusiness) list.push('business')
    list.push('income', 'tax', 'spending', 'investments', 'debts', 'goals', 'link', 'done')
    return list
  }, [hasBusiness])

  const step = steps[Math.min(stepIndex, steps.length - 1)]

  const saveState = useCallback(
    (nextIndex: number) => {
      // Fire-and-forget resume checkpoint
      void post('/api/setup', { action: 'save-state', state: { stepIndex: nextIndex } })
    },
    []
  )

  /** Persists the step being left. Every save tolerates failure. */
  const persistStep = async (leaving: StepId) => {
    if (leaving === 'earn') {
      await post('/api/setup', { action: 'set-basics', earningTypes: answers.earningTypes })
    }

    if (leaving === 'business') {
      await fetch('/api/business-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_type: answers.businessType,
          payment_forms: answers.paymentForms,
          ownership_percentage: Number(answers.ownership) || 100,
        }),
      }).catch(() => undefined)
    }

    if (leaving === 'income') {
      const rows = answers.incomeRows.filter(row => row.name.trim() && Number(row.amount) > 0)
      for (const row of rows) {
        await post('/api/income-sources', {
          name: row.name.trim(),
          income_type: row.entity === 'business' ? 'business' : 'salary',
          pay_frequency: 'monthly',
          base_amount: Number(row.amount),
          entity: row.entity,
          is_primary: rows.indexOf(row) === 0 && (prefill?.incomeSourceCount ?? 0) === 0,
          status: 'active',
        })
      }
    }

    if (leaving === 'tax') {
      await post('/api/setup', {
        action: 'set-basics',
        earningTypes: answers.earningTypes,
        filingStatus: answers.filingStatus ?? undefined,
        taxState: answers.taxState || undefined,
      })
    }

    if (leaving === 'spending') {
      for (const category of SPENDING_CATEGORIES) {
        const value = Number(answers.estimates[category.key])
        if (Number.isFinite(value) && value > 0) {
          await fetch('/api/budget', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: category.key, monthlyEstimate: value, entity: 'personal' }),
          }).catch(() => undefined)
        }
      }
    }

    if (leaving === 'investments') {
      await post('/api/setup', {
        action: 'set-investments',
        investments: answers.investments
          .filter(row => Number(row.balance) >= 0 && row.balance !== '')
          .map(row => ({
            accountType: row.accountType,
            balance: Number(row.balance),
            riskProfile: row.riskProfile,
          })),
      })
    }

    if (leaving === 'debts') {
      await post('/api/setup', {
        action: 'set-liabilities',
        liabilities: answers.liabilities
          .filter(row => row.name.trim() && Number(row.balance) > 0)
          .map(row => ({
            name: row.name.trim(),
            kind: row.kind,
            balance: Number(row.balance),
            interestRate: row.rate === '' ? null : Number(row.rate),
          })),
      })
    }

    if (leaving === 'goals') {
      const retirementRate =
        answers.investments.length > 0
          ? RISK_RATES[
              [...answers.investments].sort((a, b) => Number(b.balance) - Number(a.balance))[0]
                .riskProfile
            ]
          : RISK_RATES.index

      const templates: Record<string, { title: string; category: string; rate: number | null }> = {
        emergency: { title: '3-Month Emergency Fund', category: 'emergency', rate: null },
        debt: { title: 'Pay Off Debt', category: 'debt', rate: null },
        house: { title: 'House Down Payment', category: 'house', rate: null },
        retirement: { title: 'Retirement', category: 'investment', rate: retirementRate },
      }

      for (const [key, pick] of Object.entries(answers.goals)) {
        if (!pick.enabled || Number(pick.amount) <= 0) continue
        const template = templates[key]
        await post('/api/goals', {
          title: template.title,
          target_amount: Number(pick.amount),
          deadline: addMonthsIso(pick.months),
          category: template.category,
          interest_rate: template.rate,
          priority: 'medium',
          entity: 'personal',
        })
      }
    }
  }

  const advance = async () => {
    setBusy(true)
    try {
      await persistStep(step)
      const next = Math.min(stepIndex + 1, steps.length - 1)
      setStepIndex(next)
      saveState(next)
      window.scrollTo({ top: 0 })
    } finally {
      setBusy(false)
    }
  }

  const back = () => setStepIndex(index => Math.max(0, index - 1))

  const skipForNow = () => {
    // Session-only: the wizard returns on next login until completed
    try {
      sessionStorage.setItem('frem-setup-skip', '1')
    } catch {
      // Storage unavailable — the redirect gate simply fires again
    }
    router.push('/dashboard')
  }

  const finish = async () => {
    setBusy(true)
    try {
      if (prefill?.hasBankData) {
        // Kick off categorization so the Review tab is ready when they arrive
        void post('/api/classify', { action: 'auto' })
      }
      await post('/api/setup', { action: 'complete' })
      try {
        sessionStorage.removeItem('frem-setup-skip')
      } catch {
        // ignore
      }
      router.push('/money')
    } finally {
      setBusy(false)
    }
  }

  const debtTotal = answers.liabilities.reduce((sum, row) => sum + (Number(row.balance) || 0), 0)

  // Cross-link: entering debts updates the debt-payoff goal default
  useEffect(() => {
    if (debtTotal > 0) {
      setAnswers(previous => ({
        ...previous,
        goals: {
          ...previous.goals,
          debt: { ...previous.goals.debt, amount: String(Math.round(debtTotal)) },
        },
      }))
    }
  }, [debtTotal])

  const progress = steps.indexOf(step) / (steps.length - 1)

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-600 rounded-full"
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Step {steps.indexOf(step) + 1} of {steps.length}
        </p>
      </div>

      {alreadyCompleted && (
        <p className="text-xs text-slate-400 mb-4">
          You finished setup before — anything you change here still saves.
        </p>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-8">
              {step === 'welcome' && <WelcomeStep prefill={prefill} />}
              {step === 'earn' && (
                <EarnStep
                  value={answers.earningTypes}
                  onChange={earningTypes => setAnswers(a => ({ ...a, earningTypes }))}
                />
              )}
              {step === 'business' && (
                <BusinessStep answers={answers} setAnswers={setAnswers} />
              )}
              {step === 'income' && (
                <IncomeStep answers={answers} setAnswers={setAnswers} prefill={prefill} hasBusiness={hasBusiness} />
              )}
              {step === 'tax' && <TaxStep answers={answers} setAnswers={setAnswers} />}
              {step === 'spending' && (
                <SpendingStep answers={answers} setAnswers={setAnswers} prefill={prefill} />
              )}
              {step === 'investments' && (
                <InvestmentsStep answers={answers} setAnswers={setAnswers} prefill={prefill} />
              )}
              {step === 'debts' && <DebtsStep answers={answers} setAnswers={setAnswers} />}
              {step === 'goals' && <GoalsStep answers={answers} setAnswers={setAnswers} />}
              {step === 'link' && <LinkStep prefill={prefill} hasBusiness={hasBusiness} />}
              {step === 'done' && <DoneStep prefill={prefill} />}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Footer controls */}
      <div className="flex items-center justify-between mt-6">
        <div>
          {stepIndex > 0 && step !== 'done' && (
            <Button variant="ghost" onClick={back} disabled={busy} className="text-slate-500">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {step !== 'done' && (
            <button
              type="button"
              onClick={skipForNow}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              Skip for now
            </button>
          )}
          {step === 'done' ? (
            <Button onClick={finish} disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Take me to my money
            </Button>
          ) : (
            <Button
              onClick={advance}
              disabled={busy || (step === 'earn' && answers.earningTypes.length === 0)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Continue
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================
// Steps
// =============================================

function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof User
  title: string
  subtitle: string
}) {
  return (
    <div className="mb-6">
      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
    </div>
  )
}

function WelcomeStep({ prefill }: { prefill: Prefill | null }) {
  return (
    <div>
      <StepHeader
        icon={Sparkles}
        title="Let's set up FREM properly"
        subtitle="About two minutes. Every answer powers a real number — nothing here is a survey."
      />
      <ul className="space-y-2.5 text-sm text-slate-600">
        <li className="flex gap-2">
          <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          Tell us how you earn — employees skip all the business questions
        </li>
        <li className="flex gap-2">
          <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          Guess your spending — then watch how close you were against real bank data
        </li>
        <li className="flex gap-2">
          <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          Skip anything. Come back anytime. Nothing you already set up gets touched.
        </li>
      </ul>
      {prefill && prefill.accountCount > 0 && (
        <p className="text-xs text-slate-400 mt-5">
          {prefill.accountCount} bank account{prefill.accountCount === 1 ? '' : 's'} already
          connected — we&apos;ll skip what we already know.
        </p>
      )}
    </div>
  )
}

function EarnStep({
  value,
  onChange,
}: {
  value: EarningType[]
  onChange: (next: EarningType[]) => void
}) {
  const options: Array<{ key: EarningType; label: string; hint: string }> = [
    { key: 'w2', label: 'I have a job (W-2)', hint: 'Salary or hourly from an employer' },
    { key: 'business', label: 'I own a business', hint: 'LLC, S-corp, or similar' },
    { key: 'freelance', label: 'I freelance / contract', hint: '1099 income, side clients' },
    { key: 'other', label: 'Something else', hint: 'Investments, benefits, other income' },
  ]

  const toggle = (key: EarningType) =>
    onChange(value.includes(key) ? value.filter(item => item !== key) : [...value, key])

  return (
    <div>
      <StepHeader
        icon={User}
        title="How do you make money?"
        subtitle="Pick everything that applies — this decides which questions you see."
      />
      <div className="space-y-2.5">
        {options.map(option => {
          const active = value.includes(option.key)
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => toggle(option.key)}
              className={`w-full flex items-center justify-between gap-3 p-4 rounded-xl border text-left transition-colors ${
                active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>
                <span className="block text-sm font-medium text-slate-900">{option.label}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{option.hint}</span>
              </span>
              <span
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                  active ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                }`}
              >
                {active && <Check className="w-3 h-3 text-white" />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BusinessStep({
  answers,
  setAnswers,
}: {
  answers: Answers
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>
}) {
  return (
    <div>
      <StepHeader
        icon={Briefcase}
        title="About your business"
        subtitle="This makes the tax math and owner-pay tracking specific to your structure."
      />

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-slate-700">Business structure</Label>
          <div className="grid grid-cols-2 gap-2">
            {BUSINESS_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => setAnswers(a => ({ ...a, businessType: type.value }))}
                className={`p-2.5 rounded-lg border text-sm text-left transition-colors ${
                  answers.businessType === type.value
                    ? 'border-blue-600 bg-blue-50 text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-700">How do you pay yourself?</Label>
          <div className="space-y-1.5">
            {PAYMENT_FORM_OPTIONS.map(option => {
              const active = answers.paymentForms.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setAnswers(a => ({
                      ...a,
                      paymentForms: active
                        ? a.paymentForms.filter(item => item !== option.value)
                        : [...a.paymentForms, option.value],
                    }))
                  }
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-sm text-left transition-colors ${
                    active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      active ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                    }`}
                  >
                    {active && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2 w-40">
          <Label htmlFor="ownership" className="text-slate-700">
            Your ownership %
          </Label>
          <Input
            id="ownership"
            inputMode="numeric"
            value={answers.ownership}
            onChange={event => setAnswers(a => ({ ...a, ownership: event.target.value }))}
          />
          <p className="text-xs text-slate-400">
            25%+ means lenders treat you as self-employed — it changes the mortgage math.
          </p>
        </div>
      </div>
    </div>
  )
}

function IncomeStep({
  answers,
  setAnswers,
  prefill,
  hasBusiness,
}: {
  answers: Answers
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>
  prefill: Prefill | null
  hasBusiness: boolean
}) {
  const existing = prefill?.incomeSourceCount ?? 0

  const update = (index: number, patch: Partial<IncomeRow>) =>
    setAnswers(a => ({
      ...a,
      incomeRows: a.incomeRows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }))

  return (
    <div>
      <StepHeader
        icon={Wallet}
        title="Your income"
        subtitle="Roughly monthly is fine — bank data will sharpen it later."
      />

      {existing > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 mb-4">
          <Check className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {existing} income source{existing === 1 ? '' : 's'} already set up. Add more below or
            just continue.
          </span>
        </div>
      )}

      <div className="space-y-3">
        {answers.incomeRows.map((row, index) => (
          <div key={index} className="flex gap-2 items-end flex-wrap">
            <div className="space-y-1.5 flex-1 min-w-[140px]">
              <Label className="text-slate-700 text-xs">Source</Label>
              <Input
                placeholder="e.g. Day job"
                value={row.name}
                onChange={event => update(index, { name: event.target.value })}
              />
            </div>
            <div className="space-y-1.5 w-28">
              <Label className="text-slate-700 text-xs">$ / month</Label>
              <Input
                inputMode="decimal"
                placeholder="0"
                value={row.amount}
                onChange={event => update(index, { amount: event.target.value })}
              />
            </div>
            {hasBusiness && (
              <div className="inline-flex p-0.5 bg-slate-100 rounded-md mb-0.5">
                {(['personal', 'business'] as const).map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => update(index, { entity: option })}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                      row.entity === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {option === 'personal' ? 'Personal' : 'Business'}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          setAnswers(a => ({
            ...a,
            incomeRows: [...a.incomeRows, { name: '', amount: '', entity: 'personal' }],
          }))
        }
        className="text-sm text-blue-600 hover:text-blue-700 mt-3"
      >
        + Add another source
      </button>
    </div>
  )
}

function TaxStep({
  answers,
  setAnswers,
}: {
  answers: Answers
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>
}) {
  return (
    <div>
      <StepHeader
        icon={Landmark}
        title="Two tax questions"
        subtitle="Every tax calculation in the app needs these. Ten seconds."
      />

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-slate-700">Filing status</Label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: 'single', label: 'Single' },
                { value: 'married_joint', label: 'Married filing jointly' },
              ] as const
            ).map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAnswers(a => ({ ...a, filingStatus: option.value }))}
                className={`p-3 rounded-lg border text-sm transition-colors ${
                  answers.filingStatus === option.value
                    ? 'border-blue-600 bg-blue-50 text-slate-900'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 w-40">
          <Label htmlFor="tax-state" className="text-slate-700">
            State
          </Label>
          <select
            id="tax-state"
            value={answers.taxState}
            onChange={event => setAnswers(a => ({ ...a, taxState: event.target.value }))}
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
          >
            <option value="">Choose…</option>
            {US_STATES.map(state => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

function SpendingStep({
  answers,
  setAnswers,
  prefill,
}: {
  answers: Answers
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>
  prefill: Prefill | null
}) {
  return (
    <div>
      <StepHeader
        icon={PiggyBank}
        title="What do you think you spend?"
        subtitle="Honest guesses. Once your bank data lands, FREM shows you how close you were — that gap is the whole point."
      />

      {(prefill?.estimateCount ?? 0) > 0 && (
        <p className="text-xs text-slate-400 mb-4">
          You have {prefill?.estimateCount} budget{(prefill?.estimateCount ?? 0) === 1 ? '' : 's'} set
          already — new values here overwrite them.
        </p>
      )}

      <div className="space-y-3">
        {SPENDING_CATEGORIES.map(category => (
          <div key={category.key} className="flex items-center justify-between gap-4">
            <Label className="text-slate-700 text-sm">{category.label}</Label>
            <div className="relative w-28">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <Input
                inputMode="decimal"
                placeholder="0"
                className="pl-7"
                value={answers.estimates[category.key] ?? ''}
                onChange={event =>
                  setAnswers(a => ({
                    ...a,
                    estimates: { ...a.estimates, [category.key]: event.target.value },
                  }))
                }
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-4">Leave blank anything you don&apos;t spend on.</p>
    </div>
  )
}

function InvestmentsStep({
  answers,
  setAnswers,
  prefill,
}: {
  answers: Answers
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>
  prefill: Prefill | null
}) {
  const update = (index: number, patch: Partial<InvestmentRow>) =>
    setAnswers(a => ({
      ...a,
      investments: a.investments.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }))

  return (
    <div>
      <StepHeader
        icon={TrendingUp}
        title="Investment accounts"
        subtitle="The growth rate here drives your retirement projections — it's the number that decides 'on track' vs 'never'."
      />

      {prefill?.hasBankData && (
        <p className="text-xs text-slate-400 mb-4">
          Tip: linking an investment account (like Schwab) on the bank step pulls balances
          automatically — only enter here what you won&apos;t link.
        </p>
      )}

      {answers.investments.length === 0 && (
        <p className="text-sm text-slate-500 mb-3">None yet? Skip ahead — you can add these anytime.</p>
      )}

      <div className="space-y-3">
        {answers.investments.map((row, index) => (
          <div key={index} className="flex gap-2 items-end flex-wrap">
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-xs">Type</Label>
              <select
                value={row.accountType}
                onChange={event =>
                  update(index, { accountType: event.target.value as InvestmentRow['accountType'] })
                }
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
              >
                <option value="401k">401(k)</option>
                <option value="ira">IRA</option>
                <option value="roth">Roth IRA</option>
                <option value="brokerage">Brokerage</option>
                <option value="hsa">HSA</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5 w-28">
              <Label className="text-slate-700 text-xs">Balance</Label>
              <Input
                inputMode="decimal"
                placeholder="0"
                value={row.balance}
                onChange={event => update(index, { balance: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-xs">What&apos;s it in?</Label>
              <div className="inline-flex p-0.5 bg-slate-100 rounded-md">
                {(
                  [
                    { value: 'conservative', label: `🐢 ~${RISK_RATES.conservative}%` },
                    { value: 'index', label: `📈 ~${RISK_RATES.index}%` },
                    { value: 'aggressive', label: `🚀 ~${RISK_RATES.aggressive}%` },
                  ] as const
                ).map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => update(index, { riskProfile: option.value })}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                      row.riskProfile === option.value
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          setAnswers(a => ({
            ...a,
            investments: [...a.investments, { accountType: '401k', balance: '', riskProfile: 'index' }],
          }))
        }
        className="text-sm text-blue-600 hover:text-blue-700 mt-3"
      >
        + Add an account
      </button>

      <p className="text-xs text-slate-400 mt-4">
        🐢 conservative (bonds, cash) · 📈 index funds · 🚀 aggressive (growth stocks)
      </p>
    </div>
  )
}

function DebtsStep({
  answers,
  setAnswers,
}: {
  answers: Answers
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>
}) {
  const update = (index: number, patch: Partial<LiabilityRow>) =>
    setAnswers(a => ({
      ...a,
      liabilities: a.liabilities.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }))

  return (
    <div>
      <StepHeader
        icon={CreditCard}
        title="Any debts?"
        subtitle="Powers your real net worth and the debt-to-income math lenders use. Linked accounts report theirs automatically."
      />

      {answers.liabilities.length === 0 && (
        <p className="text-sm text-slate-500 mb-3">Debt-free or all on linked cards? Skip ahead.</p>
      )}

      <div className="space-y-3">
        {answers.liabilities.map((row, index) => (
          <div key={index} className="flex gap-2 items-end flex-wrap">
            <div className="space-y-1.5 flex-1 min-w-[120px]">
              <Label className="text-slate-700 text-xs">Name</Label>
              <Input
                placeholder="e.g. Car loan"
                value={row.name}
                onChange={event => update(index, { name: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-xs">Type</Label>
              <select
                value={row.kind}
                onChange={event => update(index, { kind: event.target.value as LiabilityRow['kind'] })}
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
              >
                <option value="credit_card">Credit card</option>
                <option value="student_loan">Student loan</option>
                <option value="auto_loan">Auto loan</option>
                <option value="mortgage">Mortgage</option>
                <option value="personal_loan">Personal loan</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5 w-24">
              <Label className="text-slate-700 text-xs">Balance</Label>
              <Input
                inputMode="decimal"
                placeholder="0"
                value={row.balance}
                onChange={event => update(index, { balance: event.target.value })}
              />
            </div>
            <div className="space-y-1.5 w-20">
              <Label className="text-slate-700 text-xs">Rate %</Label>
              <Input
                inputMode="decimal"
                placeholder="—"
                value={row.rate}
                onChange={event => update(index, { rate: event.target.value })}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          setAnswers(a => ({
            ...a,
            liabilities: [
              ...a.liabilities,
              { name: '', kind: 'credit_card', balance: '', rate: '' },
            ],
          }))
        }
        className="text-sm text-blue-600 hover:text-blue-700 mt-3"
      >
        + Add a debt
      </button>
    </div>
  )
}

function GoalsStep({
  answers,
  setAnswers,
}: {
  answers: Answers
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>
}) {
  const templates = [
    { key: 'emergency', label: '🛟 3-month emergency fund', hint: 'The first goal worth having' },
    { key: 'debt', label: '💳 Pay off debt', hint: 'Prefilled from what you just entered' },
    { key: 'house', label: '🏠 House down payment', hint: 'Ties into the mortgage-readiness math' },
    { key: 'retirement', label: '🌴 Retirement', hint: 'Uses your investment growth rate' },
  ] as const

  return (
    <div>
      <StepHeader
        icon={Target}
        title="Pick your goals"
        subtitle="Your surplus gets allocated across these automatically. Amounts are editable — and changeable later."
      />

      <div className="space-y-2.5">
        {templates.map(template => {
          const pick = answers.goals[template.key]
          return (
            <div
              key={template.key}
              className={`p-4 rounded-xl border transition-colors ${
                pick.enabled ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() =>
                  setAnswers(a => ({
                    ...a,
                    goals: {
                      ...a.goals,
                      [template.key]: { ...pick, enabled: !pick.enabled },
                    },
                  }))
                }
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <span>
                  <span className="block text-sm font-medium text-slate-900">{template.label}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{template.hint}</span>
                </span>
                <span
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    pick.enabled ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                  }`}
                >
                  {pick.enabled && <Check className="w-3 h-3 text-white" />}
                </span>
              </button>

              {pick.enabled && (
                <div className="flex items-center gap-3 mt-3">
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      $
                    </span>
                    <Input
                      inputMode="decimal"
                      className="pl-7"
                      value={pick.amount}
                      onChange={event =>
                        setAnswers(a => ({
                          ...a,
                          goals: {
                            ...a.goals,
                            [template.key]: { ...pick, amount: event.target.value },
                          },
                        }))
                      }
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    by ~{Math.round(pick.months / 12)} year{pick.months >= 24 ? 's' : ''} out
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LinkStep({ prefill, hasBusiness }: { prefill: Prefill | null; hasBusiness: boolean }) {
  const [linkedThisSession, setLinkedThisSession] = useState(0)
  const connected = (prefill?.accountCount ?? 0) + linkedThisSession

  return (
    <div>
      <StepHeader
        icon={Link2}
        title="Link your banks"
        subtitle="Read-only — FREM can see balances and transactions, never move money. This is what makes everything automatic."
      />

      {connected > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 mb-4">
          <Check className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {connected} account{connected === 1 ? '' : 's'} connected. Add more or continue.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <PlaidLinkButton
          entity="personal"
          entityLabel={null}
          onLinked={() => setLinkedThisSession(count => count + 1)}
        />
        {hasBusiness && (
          <PlaidLinkButton
            entity="business"
            entityLabel={null}
            onLinked={() => setLinkedThisSession(count => count + 1)}
          />
        )}
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Up to two years of history arrives automatically. You can also do this later from the
        Accounts page.
      </p>
    </div>
  )
}

function DoneStep({ prefill }: { prefill: Prefill | null }) {
  return (
    <div>
      <StepHeader
        icon={Check}
        title="You're set"
        subtitle="Here's what happens next — all of it automatic."
      />
      <ul className="space-y-2.5 text-sm text-slate-600">
        {prefill?.hasBankData && (
          <li className="flex gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            Your transactions get categorized right now — anything uncertain lands in the Review tab
          </li>
        )}
        <li className="flex gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          Your spending guesses become budgets — the Budget tab shows guess vs reality
        </li>
        <li className="flex gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          Goals start drawing from your measured surplus, not wishful thinking
        </li>
      </ul>
    </div>
  )
}
