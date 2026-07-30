"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BudgetTree } from "@/components/budget-tree"
import { ReviewTab } from "@/components/review-tab"
import { IncomeSources } from "@/components/income-sources"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Copy,
  Keyboard,
  Landmark,
  Loader2,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"

/**
 * The Money page: one home for plan, budget, and activity.
 *
 * Previously "Budget" (/recurring) and "Ledger" (/ledger) were separate pages
 * describing the same money from two directions, which meant two places to
 * look and no obvious relationship between them.
 */

type Entity = 'personal' | 'business'
type Tab = 'budget' | 'activity' | 'review' | 'plan'

interface LedgerEntry {
  id: string
  date: string
  description: string
  merchantName: string | null
  signedAmount: number
  amount: number
  type: 'income' | 'expense'
  category: string | null
  entity: Entity
  source: 'synced' | 'manual'
  pending: boolean
}

interface DuplicatePair {
  synced: LedgerEntry
  manual: LedgerEntry
  daysApart: number
}

interface LedgerResponse {
  entries: LedgerEntry[]
  internalTransferIds: string[]
  duplicates: DuplicatePair[]
  counts: { total: number; synced: number; manual: number; needsReview: number }
}

interface VarianceResponse {
  plannedIncome: number
  actualIncome: number
  plannedExpenses: number
  actualExpenses: number
  plannedSurplus: number
  actualSurplus: number
  surplusVariance: number
  hasActuals: boolean
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const EDIT_CATEGORIES = [
  'HOUSING', 'UTILITIES', 'GROCERIES', 'FOOD_AND_DRINK', 'TRANSPORTATION',
  'ENTERTAINMENT', 'SUBSCRIPTIONS', 'HEALTH', 'INSURANCE', 'TRAVEL',
  'PERSONAL_CARE', 'EDUCATION', 'BUSINESS_SERVICES', 'INCOME', 'OTHER',
] as const

const precise = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function formatCategory(value: string | null): string {
  if (!value) return 'Uncategorized'
  if (value.toUpperCase() === 'OWNER_PAY') return 'Owner pay'
  return value
    .split(/[_>]/)
    .map(part => part.trim().toLowerCase())
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ')
}

export function MoneyView() {
  const [tab, setTab] = useState<Tab>('budget')
  const [entity, setEntity] = useState<Entity | 'all'>('all')
  const [reviewCount, setReviewCount] = useState(0)

  const refreshReviewCount = useCallback(async () => {
    try {
      const response = await fetch('/api/overview')
      if (!response.ok) return
      const data = await response.json()
      setReviewCount(Number(data?.ownerPay?.pendingCount ?? 0))
    } catch {
      // Badge only — the tab itself still loads its own data
    }
  }, [])

  useEffect(() => {
    refreshReviewCount()
  }, [refreshReviewCount])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex p-1 bg-slate-100 rounded-lg">
          {([
            { key: 'budget', label: 'Budget' },
            { key: 'activity', label: 'Activity' },
            { key: 'review', label: 'Review' },
            { key: 'plan', label: 'Plan' },
          ] as const).map(option => (
            <button
              key={option.key}
              type="button"
              onClick={() => setTab(option.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                tab === option.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {option.label}
              {option.key === 'review' && reviewCount > 0 && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 tabular-nums">
                  {reviewCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Plan components manage their own scope, so the filter only applies
            where entity-scoped data is shown */}
        {tab !== 'plan' && (
          <div className="inline-flex p-1 bg-slate-100 rounded-lg">
            {([
              { key: 'all', label: 'All' },
              { key: 'personal', label: 'Personal' },
              { key: 'business', label: 'Business' },
            ] as const).map(option => (
              <button
                key={option.key}
                type="button"
                onClick={() => setEntity(option.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  entity === option.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'budget' && <BudgetTab entity={entity} />}
      {tab === 'activity' && <ActivityTab entity={entity} onRefine={() => setTab('review')} />}
      {tab === 'review' && <ReviewTab onChanged={refreshReviewCount} />}
      {tab === 'plan' && <PlanTab />}
    </div>
  )
}

// =============================================
// Budget: how the month is going vs the plan
// =============================================

function BudgetTab({ entity }: { entity: Entity | 'all' }) {
  const [variance, setVariance] = useState<VarianceResponse | null>(null)
  const [treeTotals, setTreeTotals] = useState<{ planned: number; actual: number } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const query = entity === 'all' ? '' : `&entity=${entity}`
        // Two sources, one meaning: income figures come from the variance view,
        // spending PLAN comes from the budget tree (caps + named items) so the
        // header can never disagree with the table underneath it
        const [varianceResponse, budgetResponse] = await Promise.all([
          fetch(`/api/ledger?view=variance${query}`),
          fetch(`/api/budget${entity === 'all' ? '' : `?entity=${entity}`}`),
        ])

        if (varianceResponse.ok) {
          const data = await varianceResponse.json()
          if (!cancelled) setVariance(data)
        }
        if (budgetResponse.ok) {
          const tree = await budgetResponse.json()
          if (!cancelled) setTreeTotals({ planned: tree.totalPlanned, actual: tree.totalActual })
        }
      } catch {
        // The tree below still renders without the summary strip
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [entity])

  const plannedSpend = treeTotals?.planned ?? variance?.plannedExpenses ?? 0
  const actualSpend = treeTotals?.actual ?? variance?.actualExpenses ?? 0
  const plannedSurplus = (variance?.plannedIncome ?? 0) - plannedSpend
  const actualSurplus = (variance?.actualIncome ?? 0) - actualSpend
  const surplusDelta = actualSurplus - plannedSurplus

  return (
    <div className="space-y-6">
      {variance?.hasActuals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Income"
            value={variance.actualIncome}
            plan={variance.plannedIncome}
            higherIsBetter
          />
          <StatCard label="Spending" value={actualSpend} plan={plannedSpend} />
          <Card
            className={`shadow-sm border ${
              actualSurplus >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
            }`}
          >
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Surplus</p>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  actualSurplus < 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {currency.format(actualSurplus)}
              </p>
              <p
                className={`text-sm mt-1 flex items-center gap-1 ${
                  surplusDelta >= 0 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {surplusDelta >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {surplusDelta >= 0 ? '+' : ''}
                {currency.format(surplusDelta)} vs plan
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <BudgetTree entity={entity} />
    </div>
  )
}

function StatCard({
  label,
  value,
  plan,
  higherIsBetter,
}: {
  label: string
  value: number
  plan: number
  higherIsBetter?: boolean
}) {
  const delta = value - plan
  const good = higherIsBetter ? delta >= 0 : delta <= 0

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{currency.format(value)}</p>
        <p className="text-sm text-slate-500 mt-1">
          planned {currency.format(plan)}
          {plan > 0 && (
            <span className={`ml-2 font-medium ${good ? 'text-emerald-600' : 'text-red-600'}`}>
              {delta > 0 ? '+' : ''}
              {currency.format(delta)}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

// =============================================
// Activity: every entry, synced and cash
// =============================================

function ActivityTab({ entity, onRefine }: { entity: Entity | 'all'; onRefine: () => void }) {
  const [data, setData] = useState<LedgerResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCashForm, setShowCashForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftCategory, setDraftCategory] = useState('')
  const [draftEntity, setDraftEntity] = useState<Entity>('personal')
  const [savingCategory, setSavingCategory] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const query = entity === 'all' ? '' : `&entity=${entity}`
      const response = await fetch(`/api/ledger?view=actual${query}`)
      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error || 'Failed to load')
        return
      }
      setData(payload)
      setError(null)
    } catch {
      setError('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [entity])

  useEffect(() => {
    load()
  }, [load])

  const applyCategory = async (entry: LedgerEntry) => {
    if (!draftCategory) return
    setSavingCategory(true)
    try {
      // One decision re-tags every transaction at this merchant and becomes a
      // permanent rule — the "fix it once" behaviour classification promises
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set',
          merchantName: entry.merchantName ?? entry.description,
          category: draftCategory,
          entity: draftEntity,
        }),
      })
      if (response.ok) {
        setEditingId(null)
        setDraftCategory('')
        await load()
      }
    } finally {
      setSavingCategory(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  if (!data) return null

  const internal = new Set(data.internalTransferIds ?? [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
          <span>{data.counts.total} entries</span>
          <span className="text-slate-300">·</span>
          <span>{data.counts.synced} from banks</span>
          <span className="text-slate-300">·</span>
          <span>{data.counts.manual} cash</span>
          {internal.size > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span>{internal.size} internal transfers (not counted)</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefine} className="text-blue-600 border-blue-200 hover:bg-blue-50">
          <Sparkles className="w-4 h-4 mr-1.5" />
          Refine categories
        </Button>
        {/* Cash, tips, anything a bank never sees */}
        <Button variant="outline" size="sm" onClick={() => setShowCashForm(previous => !previous)}>
          {showCashForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
          {showCashForm ? 'Close' : 'Cash entry'}
        </Button>
        </div>
      </div>

      {showCashForm && (
        <CashEntryForm
          onSaved={() => {
            setShowCashForm(false)
            load()
          }}
        />
      )}

      {data.duplicates.length > 0 && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <Copy className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {data.duplicates.length} cash {data.duplicates.length === 1 ? 'entry' : 'entries'} may duplicate a
            bank transaction — both are counted until reviewed.
          </span>
        </div>
      )}

      {data.entries.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-10 text-center">
            <Landmark className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h3 className="font-semibold text-slate-900">Nothing here yet</h3>
            <p className="text-sm text-slate-500 mt-1">
              Connect an account or add a cash entry to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {data.entries.map(entry => (
                <motion.div
                  key={`${entry.source}-${entry.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        entry.type === 'income' ? 'bg-emerald-50' : 'bg-slate-100'
                      }`}
                    >
                      {entry.type === 'income' ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {entry.merchantName || entry.description}
                        {entry.pending && <span className="ml-2 text-xs text-slate-400 font-normal">pending</span>}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span>{entry.date}</span>
                        <span className="text-slate-300">·</span>
                        {editingId === entry.id ? (
                          <span className="flex items-center gap-1">
                            <select
                              autoFocus
                              value={draftCategory}
                              onChange={event => setDraftCategory(event.target.value)}
                              className="h-6 rounded border border-slate-200 bg-white px-1 text-xs text-slate-900"
                            >
                              <option value="" disabled>Pick…</option>
                              {EDIT_CATEGORIES.map(option => (
                                <option key={option} value={option}>{formatCategory(option)}</option>
                              ))}
                            </select>
                            <span className="inline-flex p-0.5 bg-slate-100 rounded">
                              {(['personal', 'business'] as const).map(option => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => setDraftEntity(option)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide transition-all ${
                                    draftEntity === option
                                      ? option === 'business'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white text-slate-900 shadow-sm'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {option === 'personal' ? 'Pers' : 'Biz'}
                                </button>
                              ))}
                            </span>
                            <button
                              type="button"
                              disabled={savingCategory || !draftCategory}
                              onClick={() => applyCategory(entry)}
                              className="text-blue-600 hover:text-blue-700 disabled:opacity-50 text-xs font-medium"
                            >
                              {savingCategory ? '…' : 'Apply to all'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-slate-400 hover:text-slate-600 text-xs"
                            >
                              ✕
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (entry.source !== 'synced') return
                              setEditingId(entry.id)
                              setDraftCategory(entry.category?.toUpperCase().split(' ').join('_') ?? '')
                              setDraftEntity(entry.entity)
                            }}
                            className={`${entry.category ? '' : 'text-amber-600'} ${
                              entry.source === 'synced'
                                ? 'hover:text-blue-600 hover:underline decoration-dotted underline-offset-2'
                                : 'cursor-default'
                            }`}
                            title={entry.source === 'synced' ? 'Click to change — applies to every transaction at this merchant' : undefined}
                          >
                            {formatCategory(entry.category)}
                          </button>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {internal.has(entry.id) && (
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded"
                        title="Money moved between your own accounts — not counted as income or spending"
                      >
                        Transfer
                      </span>
                    )}
                    {entry.entity === 'business' && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Building2 className="w-2.5 h-2.5" />
                        Biz
                      </span>
                    )}
                    {entry.source === 'manual' && (
                      <span className="text-slate-400" title="Entered by hand">
                        <Keyboard className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <p
                      className={`text-sm font-semibold tabular-nums w-24 text-right ${
                        internal.has(entry.id)
                          ? 'text-slate-400 line-through decoration-slate-300'
                          : entry.type === 'income'
                            ? 'text-emerald-600'
                            : 'text-slate-900'
                      }`}
                    >
                      {entry.type === 'income' ? '+' : '−'}
                      {precise.format(entry.amount)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const CASH_CATEGORIES = [
  'groceries',
  'food',
  'transportation',
  'entertainment',
  'housing',
  'utilities',
  'health',
  'other',
] as const

function CashEntryForm({ onSaved }: { onSaved: () => void }) {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('other')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount above zero')
      return
    }
    if (!description.trim()) {
      setError('A short description helps future-you')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount: value, description: description.trim(), category }),
      })

      if (!response.ok) {
        const payload = await response.json()
        setError(payload.error || 'Failed to save')
        return
      }
      onSaved()
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50/40 shadow-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="space-y-2">
            <Label className="text-slate-700">Type</Label>
            <div className="inline-flex p-1 bg-white border border-slate-200 rounded-lg">
              {(['expense', 'income'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    type === option ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {option === 'expense' ? 'Spent' : 'Received'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 w-32">
            <Label htmlFor="cash-amount" className="text-slate-700">
              Amount
            </Label>
            <Input
              id="cash-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={event => setAmount(event.target.value)}
            />
          </div>

          <div className="space-y-2 flex-1 min-w-0">
            <Label htmlFor="cash-desc" className="text-slate-700">
              Description
            </Label>
            <Input
              id="cash-desc"
              placeholder="e.g. Farmers market"
              value={description}
              onChange={event => setDescription(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && save()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cash-cat" className="text-slate-700">
              Category
            </Label>
            <select
              id="cash-cat"
              value={category}
              onChange={event => setCategory(event.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              {CASH_CATEGORIES.map(option => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <p className="text-xs text-slate-500">
          For cash, tips, and anything your bank never sees. Bank-covered spending arrives on its own.
        </p>
      </CardContent>
    </Card>
  )
}

// =============================================
// Plan: what you expect to earn and owe
// =============================================

function PlanTab() {
  return (
    <div className="space-y-8">
      <IncomeSources />

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900">Recurring expenses</h3>
            <p className="text-sm text-slate-500">Rent, subscriptions, and other repeating costs.</p>
          </div>
          <Link
            href="/recurring"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0"
          >
            Manage
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400">
        One-off income and windfalls now arrive through your linked accounts — no separate
        tracking needed. Cash windfalls go in as a cash entry on the Activity tab.
      </p>
    </div>
  )
}
