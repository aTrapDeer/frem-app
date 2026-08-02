"use client"

import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertTriangle, Check, ChevronRight, Loader2, Pencil, Waypoints, X } from "lucide-react"

type Entity = 'personal' | 'business'

interface BudgetItem {
  id: string
  name: string
  planned: number
  actual: number
  variance: number
  unplanned: boolean
}

interface BudgetCategory {
  category: string
  label: string
  planned: number
  actual: number
  variance: number
  overBudget: boolean
  plannedSource: 'category_cap' | 'items' | 'none'
  items: BudgetItem[]
}

interface BudgetTreeData {
  month: string
  excludedMovement?: number
  daysElapsed: number
  daysInMonth: number
  totalPlanned: number
  totalActual: number
  totalVariance: number
  categories: BudgetCategory[]
  hasActuals: boolean
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function BudgetTree({ entity, month }: { entity: Entity | 'all'; month?: string }) {
  const [data, setData] = useState<BudgetTreeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (entity !== 'all') params.set('entity', entity)
      if (month) params.set('month', month)
      const query = params.toString()
      const response = await fetch(`/api/budget${query ? `?${query}` : ''}`)
      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error || 'Failed to load budget')
        return
      }
      setData(payload)
      setError(null)
    } catch {
      setError('Failed to load budget')
    } finally {
      setLoading(false)
    }
  }, [entity, month])

  useEffect(() => {
    load()
  }, [load])

  const toggle = (category: string) => {
    setExpanded(previous => {
      const next = new Set(previous)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const saveCap = async (category: string) => {
    const value = Number(draft)
    if (!Number.isFinite(value) || value < 0) {
      setError('Enter a number of zero or more')
      return
    }

    try {
      const response = await fetch('/api/budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          monthlyEstimate: value,
          entity: entity === 'all' ? 'personal' : entity,
        }),
      })

      if (!response.ok) {
        const payload = await response.json()
        setError(payload.error || 'Failed to save')
        return
      }

      setEditing(null)
      setDraft('')
      await load()
    } catch {
      setError('Failed to save')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        {data && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {new Date(`${data.month}-01T00:00:00`).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </h3>
            {/* A partial month compared against a full month's budget will always
                look under-spent unless the window is stated */}
            <p className="text-sm text-slate-500">
              {data.daysElapsed < data.daysInMonth
                ? `Day ${data.daysElapsed} of ${data.daysInMonth} — the month is not over yet`
                : 'Complete month'}
            </p>
            {(data.excludedMovement ?? 0) > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                {currency.format(data.excludedMovement ?? 0)} moved between your own accounts
                (transfers, owner pay) — not counted as spending
              </p>
            )}
          </div>
        )}

        {data && (() => {
          const partial = data.daysElapsed < data.daysInMonth
          const fraction = data.daysInMonth > 0 ? data.daysElapsed / data.daysInMonth : 1
          const planToDate = partial ? data.totalPlanned * fraction : data.totalPlanned
          const paceDelta = data.totalActual - planToDate
          return (
            <div className="flex items-baseline gap-4 text-sm">
              <span className="text-slate-500">
                {partial ? 'planned so far' : 'planned'}{' '}
                <span className="font-semibold text-slate-900 tabular-nums">{currency.format(planToDate)}</span>
                {partial && (
                  <span className="text-slate-400"> of {currency.format(data.totalPlanned)}</span>
                )}
              </span>
              <span className="text-slate-500">
                actual <span className="font-semibold text-slate-900 tabular-nums">{currency.format(data.totalActual)}</span>
              </span>
              {data.hasActuals && (
                <span className={`font-semibold tabular-nums ${paceDelta > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {paceDelta > 0 ? '+' : ''}{currency.format(paceDelta)}{partial ? ' vs pace' : ''}
                </span>
              )}
            </div>
          )
        })()}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!data || data.categories.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-10 text-center">
            <h3 className="font-semibold text-slate-900">No budget yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Add recurring expenses, or connect an account and categories will appear from your
              real spending.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {data.categories.map(category => {
                const isOpen = expanded.has(category.category)
                const isEditing = editing === category.category

                return (
                  <div key={category.category}>
                    {/* Category row — the trunk */}
                    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <button
                        type="button"
                        onClick={() => toggle(category.category)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left"
                        aria-expanded={isOpen}
                      >
                        <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.15 }}>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </motion.span>
                        <span className="text-sm font-medium text-slate-900 truncate">{category.label}</span>
                        <span className="text-xs text-slate-400 shrink-0">
                          {category.items.length} {category.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </button>

                      <Link
                        href={`/web/${encodeURIComponent(category.category)}`}
                        aria-label={`Open ${category.label} web`}
                        title="See this category as a web of transactions"
                        className="p-1.5 rounded-md text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 shrink-0"
                      >
                        <Waypoints className="w-4 h-4" />
                      </Link>

                      <div className="flex items-center gap-4 shrink-0 text-sm tabular-nums">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              autoFocus
                              value={draft}
                              onChange={event => setDraft(event.target.value)}
                              onKeyDown={event => {
                                if (event.key === 'Enter') saveCap(category.category)
                                if (event.key === 'Escape') setEditing(null)
                              }}
                              className="w-24 h-8"
                              placeholder="0"
                            />
                            <Button size="sm" variant="ghost" onClick={() => saveCap(category.category)}>
                              <Check className="w-4 h-4 text-emerald-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                              <X className="w-4 h-4 text-slate-400" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(category.category)
                              setDraft(String(category.planned || ''))
                            }}
                            className="group flex items-center gap-1.5 w-24 justify-end text-slate-500 hover:text-slate-900"
                            title={
                              category.plannedSource === 'items'
                                ? 'Summed from items — click to set a category budget'
                                : 'Click to edit'
                            }
                          >
                            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className={category.plannedSource === 'items' ? 'italic' : ''}>
                              {category.planned > 0 ? currency.format(category.planned) : '—'}
                            </span>
                          </button>
                        )}

                        <span className="w-24 text-right font-semibold text-slate-900">
                          {currency.format(category.actual)}
                        </span>

                        <span
                          className={`w-24 text-right font-medium ${
                            category.planned === 0 || category.actual === 0
                              ? 'text-slate-400'
                              : category.overBudget
                                ? 'text-red-600'
                                : 'text-emerald-600'
                          }`}
                        >
                          {category.planned === 0
                            ? 'no budget'
                            : category.actual === 0
                              ? 'nothing matched'
                              : `${category.variance > 0 ? '+' : ''}${currency.format(category.variance)}`}
                        </span>
                      </div>
                    </div>

                    {/* Items — the branches */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden bg-slate-50/60"
                        >
                          {category.items.map(item => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 pl-12 pr-5 py-2.5 border-t border-slate-100"
                            >
                              <span
                                className={`text-sm min-w-0 flex-1 truncate ${
                                  item.unplanned ? 'text-slate-500 italic' : 'text-slate-700'
                                }`}
                              >
                                {item.name}
                              </span>
                              <div className="flex items-center gap-4 shrink-0 text-sm tabular-nums">
                                <span className="w-24 text-right text-slate-400">
                                  {item.planned > 0 ? currency.format(item.planned) : '—'}
                                </span>
                                <span className="w-24 text-right text-slate-700">
                                  {item.actual > 0 ? currency.format(item.actual) : '—'}
                                </span>
                                <span className="w-24 text-right text-slate-400">
                                  {item.unplanned ? 'unplanned' : ''}
                                </span>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-end gap-4 px-5 py-2.5 border-t border-slate-100 text-xs text-slate-400">
              <span className="w-24 text-right">Planned</span>
              <span className="w-24 text-right">Actual</span>
              <span className="w-24 text-right">Variance</span>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-slate-400">
        Italic planned figures are summed from individual items. Click any to set a category budget
        instead — useful for spending spread across many merchants, like groceries.
      </p>
    </div>
  )
}
