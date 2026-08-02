"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react"

/**
 * The Review queue: decisions only a human can make.
 *
 * Owner-pay confirmation lives here. 99 individual transfers collapse into a
 * handful of account-pair groups, so the answer is two clicks, not two hours.
 * Individual overrides stay available under the fold.
 */

type Entity = 'personal' | 'business'

interface PairEntry {
  id: string
  date: string
  amount: number
  entity: Entity
  accountId?: string | null
}

interface TransferPairDto {
  outflow: PairEntry
  inflow: PairEntry
  daysApart: number
}

interface OwnerPayResponse {
  candidates: TransferPairDto[]
  marked: Array<{ id: string; ownerPayType: 'pending' | 'salary' | 'distribution' }>
}

interface PairGroup {
  key: string
  fromName: string
  toName: string
  /** business → personal is you paying yourself; the reverse is you funding the company. */
  direction: 'owner_pay' | 'contribution'
  pairs: TransferPairDto[]
  total: number
  latestDate: string
}

type Decision = 'salary' | 'distribution' | 'not_owner_pay'

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

// =============================================
// Refine categories: the "nuance" pass
// =============================================

/**
 * Mirrors AI_CLASSIFICATION_CATEGORIES in lib/classification.ts. Duplicated
 * because that module imports the database client and cannot ship to the
 * browser; the server validates against the real list regardless.
 */
const CATEGORY_OPTIONS = [
  'HOUSING', 'UTILITIES', 'GROCERIES', 'FOOD_AND_DRINK', 'TRANSPORTATION',
  'ENTERTAINMENT', 'SUBSCRIPTIONS', 'HEALTH', 'INSURANCE', 'TRAVEL',
  'PERSONAL_CARE', 'PETS', 'EDUCATION', 'BUSINESS_SERVICES', 'INCOME', 'OTHER',
] as const

interface ClassificationGroup {
  merchantKey: string
  displayName: string
  count: number
  totalSpent: number
  totalReceived: number
  category: string | null
  classificationSource: 'default' | 'rule' | 'ai' | 'user'
  latestDate: string
}

interface ClassifyQueue {
  groups: ClassificationGroup[]
  counts: { totalGroups: number; uncategorized: number; transactions: number }
}

interface AutoResult {
  resolved: { rules: number; merchantMap: number; plaid: number; ai: number }
  stillUnknown: number
  remainingMerchants: number
}

function labelCategory(value: string): string {
  return value
    .split('_')
    .map(part => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

function RefineSection() {
  const [queue, setQueue] = useState<ClassifyQueue | null>(null)
  const [running, setRunning] = useState(false)
  const [applyingKey, setApplyingKey] = useState<string | null>(null)
  const [result, setResult] = useState<AutoResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Map<string, string>>(new Map())

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/classify')
      if (!response.ok) return
      setQueue(await response.json())
    } catch {
      // Section simply stays hidden if the queue cannot load
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const runAuto = async () => {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto' }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.details || payload.error || 'Refine failed')
        return
      }
      setResult(payload)
      await load()
    } catch {
      setError('Refine failed')
    } finally {
      setRunning(false)
    }
  }

  const applyManual = async (group: ClassificationGroup) => {
    const category = drafts.get(group.merchantKey) ?? group.category
    if (!category) return

    setApplyingKey(group.merchantKey)
    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', merchantKey: group.merchantKey, category }),
      })
      if (!response.ok) {
        const payload = await response.json()
        setError(payload.error || 'Failed to apply')
        return
      }
      await load()
    } catch {
      setError('Failed to apply')
    } finally {
      setApplyingKey(null)
    }
  }

  if (!queue) return null

  // Uncategorized merchants first, then AI guesses open to correction
  const reviewable = queue.groups
    .filter(group => group.category === null || group.classificationSource === 'ai')
    .slice(0, 30)

  if (queue.counts.uncategorized === 0 && reviewable.length === 0) return null

  return (
    <Card className="border-blue-200 bg-blue-50/30 shadow-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Refine categories
            </h3>
            <p className="text-sm text-slate-600 mt-0.5">
              {queue.counts.uncategorized > 0
                ? `${queue.counts.uncategorized} of ${queue.counts.totalGroups} merchants need a category.`
                : 'All merchants categorized — correct any guesses below.'}{' '}
              Known merchants resolve from the database free; only new ones go to AI, once, ever.
            </p>
          </div>

          {queue.counts.uncategorized > 0 && (
            <Button
              onClick={runAuto}
              disabled={running}
              className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Refining...
                </>
              ) : (
                'Refine automatically'
              )}
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {result && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-white border border-blue-100 text-sm text-slate-700">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
            <span>
              Resolved {result.resolved.rules + result.resolved.merchantMap + result.resolved.plaid}{' '}
              from your rules and known merchants, {result.resolved.ai} via AI.
              {result.remainingMerchants > 0 &&
                ` ${result.remainingMerchants} merchants still unknown — set them below.`}
            </span>
          </div>
        )}

        {reviewable.length > 0 && (
          <div className="divide-y divide-blue-100 border-t border-blue-100">
            {reviewable.map(group => (
              <div key={group.merchantKey} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{group.displayName}</p>
                  <p className="text-xs text-slate-500">
                    {group.count} transactions · {currency.format(group.totalSpent)}
                    {group.classificationSource === 'ai' && group.category && (
                      <span className="text-blue-600"> · AI guessed {labelCategory(group.category)}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={drafts.get(group.merchantKey) ?? group.category ?? ''}
                    onChange={event =>
                      setDrafts(previous => new Map(previous).set(group.merchantKey, event.target.value))
                    }
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900"
                  >
                    <option value="" disabled>
                      Pick category
                    </option>
                    {CATEGORY_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {labelCategory(option)}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={applyingKey !== null || !(drafts.get(group.merchantKey) ?? group.category)}
                    onClick={() => applyManual(group)}
                  >
                    {applyingKey === group.merchantKey ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ReviewTab({ onChanged }: { onChanged: () => void }) {
  const [data, setData] = useState<OwnerPayResponse | null>(null)
  const [accountNames, setAccountNames] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyGroup, setBusyGroup] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [payResponse, connectionsResponse] = await Promise.all([
        fetch('/api/owner-pay'),
        fetch('/api/connections'),
      ])

      const pay = await payResponse.json()
      if (!payResponse.ok) {
        setError(pay.error || 'Failed to load review queue')
        return
      }
      setData(pay)

      if (connectionsResponse.ok) {
        const connections = await connectionsResponse.json()
        const names = new Map<string, string>()
        for (const connection of connections.connections ?? []) {
          for (const account of connection.accounts ?? []) {
            names.set(account.id, account.mask ? `${account.name} ····${account.mask}` : account.name)
          }
        }
        setAccountNames(names)
      }
      setError(null)
    } catch {
      setError('Failed to load review queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const groups: PairGroup[] = (() => {
    if (!data) return []
    const byPair = new Map<string, PairGroup>()

    for (const pair of data.candidates) {
      const key = `${pair.outflow.accountId ?? '?'}|${pair.inflow.accountId ?? '?'}`
      const existing = byPair.get(key)

      if (existing) {
        existing.pairs.push(pair)
        existing.total += pair.outflow.amount
        if (pair.outflow.date > existing.latestDate) existing.latestDate = pair.outflow.date
        continue
      }

      byPair.set(key, {
        key,
        fromName: accountNames.get(pair.outflow.accountId ?? '') ?? 'Unknown account',
        toName: accountNames.get(pair.inflow.accountId ?? '') ?? 'Unknown account',
        direction:
          pair.outflow.entity === 'business' && pair.inflow.entity === 'personal'
            ? 'owner_pay'
            : 'contribution',
        pairs: [pair],
        total: pair.outflow.amount,
        latestDate: pair.outflow.date,
      })
    }

    return [...byPair.values()].sort((a, b) => b.pairs.length - a.pairs.length)
  })()

  const postDecision = async (pair: TransferPairDto, type: Decision): Promise<boolean> => {
    try {
      const response = await fetch('/api/owner-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds: [pair.outflow.id, pair.inflow.id], type }),
      })
      return response.ok
    } catch {
      return false
    }
  }

  const decideGroup = async (group: PairGroup, type: Decision) => {
    setBusyGroup(group.key)
    setProgress({ done: 0, total: group.pairs.length })
    setNotice(null)

    let failed = 0
    for (let index = 0; index < group.pairs.length; index += 1) {
      const ok = await postDecision(group.pairs[index], type)
      if (!ok) failed += 1
      setProgress({ done: index + 1, total: group.pairs.length })
    }

    setBusyGroup(null)
    setProgress(null)
    setNotice(
      failed === 0
        ? `${group.pairs.length} transfers recorded${
            type === 'not_owner_pay' ? ' as regular transfers' : ` as ${type}`
          }.`
        : `${group.pairs.length - failed} recorded, ${failed} failed — run it again for the rest.`
    )
    await load()
    onChanged()
  }

  const decidePair = async (pair: TransferPairDto, type: Decision) => {
    setBusyGroup('single')
    const ok = await postDecision(pair, type)
    setBusyGroup(null)
    if (!ok) {
      setError('Failed to record that transfer')
      return
    }
    await load()
    onChanged()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const salaryCount = data?.marked.filter(item => item.ownerPayType === 'salary').length ?? 0
  const distributionCount = data?.marked.filter(item => item.ownerPayType === 'distribution').length ?? 0

  return (
    <div className="space-y-4">
      <RefineSection />

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {groups.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-10 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
            <h3 className="font-semibold text-slate-900">All caught up</h3>
            <p className="text-sm text-slate-500 mt-1">
              Nothing needs your decision right now.
              {salaryCount + distributionCount > 0 &&
                ` ${salaryCount + distributionCount} owner-pay transfers already recorded.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        groups.map(group => {
          const isOpen = expanded.has(group.key)
          const busy = busyGroup === group.key

          return (
            <Card key={group.key} className="border-slate-200 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                          group.direction === 'owner_pay'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {group.direction === 'owner_pay' ? 'You paying yourself' : 'You funding the business'}
                      </span>
                      <span className="text-xs text-slate-400">last {group.latestDate}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span className="truncate">{group.fromName}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{group.toName}</span>
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {group.pairs.length} transfers · {currency.format(group.total)} total
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {busy && progress ? (
                      <span className="text-sm text-slate-500 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {progress.done}/{progress.total}
                      </span>
                    ) : group.direction === 'owner_pay' ? (
                      <>
                        <Button
                          size="sm"
                          disabled={busyGroup !== null}
                          onClick={() => decideGroup(group, 'salary')}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          All salary
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyGroup !== null}
                          onClick={() => decideGroup(group, 'distribution')}
                        >
                          All distributions
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyGroup !== null}
                          onClick={() => decideGroup(group, 'not_owner_pay')}
                          className="text-slate-500"
                        >
                          Not owner pay
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyGroup !== null}
                        onClick={() => decideGroup(group, 'not_owner_pay')}
                      >
                        Record as regular transfers
                      </Button>
                    )}
                  </div>
                </div>

                {group.direction === 'owner_pay' && (
                  <p className="text-xs text-slate-500">
                    Salary is W-2 wages with payroll tax withheld; a distribution is profit paid out
                    without it. Mixing both is normal — expand below to decide one by one. Confirm the
                    split with your CPA.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setExpanded(previous => {
                      const next = new Set(previous)
                      if (next.has(group.key)) next.delete(group.key)
                      else next.add(group.key)
                      return next
                    })
                  }
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                  aria-expanded={isOpen}
                >
                  <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.15 }}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </motion.span>
                  {isOpen ? 'Hide' : 'Show'} individual transfers
                </button>

                {isOpen && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {group.pairs.map(pair => (
                      <div key={pair.outflow.id} className="flex items-center justify-between gap-4 py-2.5">
                        <div className="text-sm text-slate-700 tabular-nums">
                          {pair.outflow.date}
                          <span className="text-slate-400"> · </span>
                          <span className="font-medium">{precise.format(pair.outflow.amount)}</span>
                        </div>
                        {group.direction === 'owner_pay' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={busyGroup !== null}
                              onClick={() => decidePair(pair, 'salary')}
                              className="text-xs px-2 py-1 rounded border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50"
                            >
                              Salary
                            </button>
                            <button
                              type="button"
                              disabled={busyGroup !== null}
                              onClick={() => decidePair(pair, 'distribution')}
                              className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Distribution
                            </button>
                            <button
                              type="button"
                              disabled={busyGroup !== null}
                              onClick={() => decidePair(pair, 'not_owner_pay')}
                              className="text-xs px-2 py-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-50"
                            >
                              Skip
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={busyGroup !== null}
                            onClick={() => decidePair(pair, 'not_owner_pay')}
                            className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Regular transfer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      )}

      {(salaryCount > 0 || distributionCount > 0) && groups.length > 0 && (
        <p className="text-xs text-slate-400">
          Already recorded: {salaryCount} salary · {distributionCount} distributions
        </p>
      )}
    </div>
  )
}
