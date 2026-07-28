"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { BudgetTree } from "@/components/budget-tree"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Copy,
  Keyboard,
  Landmark,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

type Entity = 'personal' | 'business'
type View = 'actual' | 'variance' | 'budget'

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
  duplicates: DuplicatePair[]
  counts: { total: number; synced: number; manual: number; needsReview: number }
}

interface CategoryVariance {
  category: string
  planned: number
  actual: number
  variance: number
  overBudget: boolean
}

interface VarianceResponse {
  month: string
  plannedIncome: number
  actualIncome: number
  plannedExpenses: number
  actualExpenses: number
  plannedSurplus: number
  actualSurplus: number
  surplusVariance: number
  categories: CategoryVariance[]
  hasActuals: boolean
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const precise = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function formatCategory(value: string | null): string {
  if (!value) return 'Uncategorized'
  // Plaid categories arrive as RENT_AND_UTILITIES
  return value
    .split(/[_>]/)
    .map(part => part.trim().toLowerCase())
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ')
}

export function LedgerView() {
  const [view, setView] = useState<View>('actual')
  const [entity, setEntity] = useState<Entity | 'all'>('all')
  const [ledger, setLedger] = useState<LedgerResponse | null>(null)
  const [variance, setVariance] = useState<VarianceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (view === 'budget') { setLoading(false); return }
      const entityParam = entity === 'all' ? '' : `&entity=${entity}`
      const response = await fetch(`/api/ledger?view=${view}${entityParam}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to load')
        return
      }

      if (view === 'variance') setVariance(data)
      else setLedger(data)
    } catch {
      setError('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [view, entity])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex p-1 bg-slate-100 rounded-lg">
          {([
            { key: 'budget', label: 'Budget' },
            { key: 'actual', label: 'Actual' },
            { key: 'variance', label: 'Plan vs Actual' },
          ] as const).map(option => (
            <button
              key={option.key}
              type="button"
              onClick={() => setView(option.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === option.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

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
      </div>

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : view === 'budget' ? (
        <BudgetTree entity={entity} />
      ) : view === 'variance' ? (
        <VariancePanel data={variance} />
      ) : (
        <ActualPanel data={ledger} onRefresh={load} />
      )}
    </div>
  )
}

function VariancePanel({ data }: { data: VarianceResponse | null }) {
  if (!data) return null

  if (!data.hasActuals) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-10 text-center">
          <Landmark className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-900">No actuals for this month yet</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Connect an account and your plan will be measured against what actually moved.
          </p>
        </CardContent>
      </Card>
    )
  }

  const surplusBetter = data.surplusVariance >= 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <VarianceCard label="Income" planned={data.plannedIncome} actual={data.actualIncome} higherIsBetter />
        <VarianceCard label="Expenses" planned={data.plannedExpenses} actual={data.actualExpenses} />
        <Card className={`shadow-sm border ${surplusBetter ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Surplus</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {currency.format(data.actualSurplus)}
            </p>
            <p className={`text-sm mt-1 flex items-center gap-1 ${surplusBetter ? 'text-emerald-700' : 'text-amber-700'}`}>
              {surplusBetter ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {surplusBetter ? '+' : ''}{currency.format(data.surplusVariance)} vs plan
            </p>
          </CardContent>
        </Card>
      </div>

      {data.categories.length > 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">By category</h3>
            <div className="divide-y divide-slate-100">
              {data.categories.map(row => (
                <div key={row.category} className="flex items-center justify-between gap-4 py-3">
                  <span className="text-sm text-slate-700 min-w-0 truncate">
                    {formatCategory(row.category)}
                  </span>
                  <div className="flex items-center gap-6 shrink-0 text-sm tabular-nums">
                    <span className="text-slate-400 w-20 text-right">
                      {row.planned > 0 ? currency.format(row.planned) : '—'}
                    </span>
                    <span className="text-slate-900 font-medium w-20 text-right">
                      {currency.format(row.actual)}
                    </span>
                    <span
                      className={`w-24 text-right font-medium ${
                        row.planned === 0 ? 'text-slate-400' : row.overBudget ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {row.planned === 0
                        ? 'unplanned'
                        : `${row.variance > 0 ? '+' : ''}${currency.format(row.variance)}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-6 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
              <span className="w-20 text-right">Planned</span>
              <span className="w-20 text-right">Actual</span>
              <span className="w-24 text-right">Variance</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function VarianceCard({
  label,
  planned,
  actual,
  higherIsBetter,
}: {
  label: string
  planned: number
  actual: number
  higherIsBetter?: boolean
}) {
  const delta = actual - planned
  const good = higherIsBetter ? delta >= 0 : delta <= 0

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{currency.format(actual)}</p>
        <p className="text-sm text-slate-500 mt-1">
          planned {currency.format(planned)}
          {planned > 0 && (
            <span className={`ml-2 font-medium ${good ? 'text-emerald-600' : 'text-red-600'}`}>
              {delta > 0 ? '+' : ''}{currency.format(delta)}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

function ActualPanel({ data, onRefresh }: { data: LedgerResponse | null; onRefresh: () => void }) {
  if (!data) return null

  if (data.entries.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-10 text-center">
          <Landmark className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-900">Nothing here yet</h3>
          <p className="text-sm text-slate-500 mt-1">
            Connect an account or add a manual entry to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
        <span>{data.counts.total} entries</span>
        <span className="text-slate-300">·</span>
        <span>{data.counts.synced} synced</span>
        <span className="text-slate-300">·</span>
        <span>{data.counts.manual} manual</span>
        {data.counts.needsReview > 0 && (
          <>
            <span className="text-slate-300">·</span>
            <span className="text-amber-600 font-medium">{data.counts.needsReview} need a category</span>
          </>
        )}
      </div>

      {data.duplicates.length > 0 && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <Copy className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {data.duplicates.length} manual {data.duplicates.length === 1 ? 'entry' : 'entries'} may
            duplicate a synced transaction. Both are being counted — review before trusting the totals.
          </span>
        </div>
      )}

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
                      {entry.pending && (
                        <span className="ml-2 text-xs text-slate-400 font-normal">pending</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span>{entry.date}</span>
                      <span className="text-slate-300">·</span>
                      <span className={entry.category ? '' : 'text-amber-600'}>
                        {formatCategory(entry.category)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {entry.entity === 'business' && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Building2 className="w-2.5 h-2.5" />
                      Biz
                    </span>
                  )}
                  {/* Provenance: a number you typed and a number your bank
                      reported deserve different levels of trust */}
                  {entry.source === 'manual' && (
                    <span
                      className="text-slate-400"
                      title="Entered manually"
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <p
                    className={`text-sm font-semibold tabular-nums w-24 text-right ${
                      entry.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
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

      <div className="flex justify-center">
        <Button variant="outline" onClick={onRefresh}>
          Refresh
        </Button>
      </div>
    </div>
  )
}
