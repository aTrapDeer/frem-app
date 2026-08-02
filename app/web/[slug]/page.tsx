"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { PageHeader } from "@/components/page-header"
import { ArrowLeft, Loader2, X } from "lucide-react"

/* The category web: /web/food shows the category as the hub, merchants as the
   inner ring, individual transactions as leaves. /web/food:txnId opens with
   that transaction selected. Clicking a leaf shows and edits the real thing. */

interface WebTransaction {
  id: string
  date: string
  description: string
  merchantName: string | null
  amount: number
  entity: 'personal' | 'business'
  source: string
}

const EDIT_CATEGORIES = [
  'housing', 'utilities', 'groceries', 'food', 'transportation', 'entertainment',
  'subscriptions', 'health', 'insurance', 'travel', 'personal_care', 'pets',
  'credit_payments', 'debt', 'education', 'business_services', 'other',
] as const

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function label(value: string): string {
  return value.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

type MerchantGroup = {
  key: string
  name: string
  total: number
  transactions: WebTransaction[]
}

export default function CategoryWebPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [rawCategory, initialTx] = decodeURIComponent(slug).split(':')
  const category = rawCategory.toLowerCase()

  const [month, setMonth] = useState(currentMonthKey())
  const [transactions, setTransactions] = useState<WebTransaction[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(initialTx ?? null)
  const [loading, setLoading] = useState(true)
  const [savedNote, setSavedNote] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/category-transactions?category=${encodeURIComponent(category)}&month=${month}`)
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (!cancelled) setTransactions(data?.transactions ?? [])
      })
      .catch(() => {
        if (!cancelled) setTransactions([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [category, month])

  // Keep the URL honest: /web/category:txn while a leaf is selected
  useEffect(() => {
    const path = selectedId
      ? `/web/${encodeURIComponent(category)}:${selectedId}`
      : `/web/${encodeURIComponent(category)}`
    window.history.replaceState(null, '', path)
  }, [category, selectedId])

  const groups: MerchantGroup[] = useMemo(() => {
    if (!transactions) return []
    const map = new Map<string, MerchantGroup>()
    for (const transaction of transactions) {
      const name = transaction.merchantName?.trim() || transaction.description.slice(0, 28)
      const key = name.toLowerCase()
      const group = map.get(key) ?? { key, name, total: 0, transactions: [] }
      group.total += transaction.amount
      group.transactions.push(transaction)
      map.set(key, group)
    }
    // Densest merchants first; the web stays readable at 8 spokes
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 8)
  }, [transactions])

  const shown = groups.reduce((sum, group) => sum + group.transactions.length, 0)
  const overflow = (transactions?.length ?? 0) - shown
  const total = (transactions ?? []).reduce((sum, transaction) => sum + transaction.amount, 0)
  const selected = transactions?.find(transaction => transaction.id === selectedId) ?? null

  // Radial layout: hub at origin, merchants on ring 1, leaves fanned on ring 2
  const layout = useMemo(() => {
    const merchants: Array<{ group: MerchantGroup; x: number; y: number }> = []
    const leaves: Array<{ transaction: WebTransaction; x: number; y: number; mx: number; my: number }> = []
    const count = groups.length
    groups.forEach((group, index) => {
      const angle = (index / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2
      const mx = Math.cos(angle) * 190
      const my = Math.sin(angle) * 190
      merchants.push({ group, x: mx, y: my })

      const visible = group.transactions.slice(0, 6)
      const spread = Math.min(Math.PI / 3.2, 0.42 * visible.length)
      visible.forEach((transaction, leafIndex) => {
        const offset = visible.length === 1 ? 0 : (leafIndex / (visible.length - 1) - 0.5) * spread
        const leafAngle = angle + offset
        leaves.push({
          transaction,
          x: Math.cos(leafAngle) * 360,
          y: Math.sin(leafAngle) * 360,
          mx,
          my,
        })
      })
    })
    return { merchants, leaves }
  }, [groups])

  const applyEdit = async (newCategory: string, newEntity: 'personal' | 'business') => {
    if (!selected) return
    const merchantName = selected.merchantName ?? selected.description
    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', merchantName, category: newCategory.toUpperCase(), entity: newEntity }),
      })
      if (response.ok) {
        setSavedNote(`Saved — every "${merchantName}" transaction now files under ${label(newCategory)}.`)
        if (newCategory !== category) {
          // The leaf left this web; reload to let it fall away
          setSelectedId(null)
          setTransactions(previous =>
            previous?.filter(transaction => {
              const name = transaction.merchantName ?? transaction.description
              return name !== merchantName
            }) ?? null
          )
        }
      }
    } catch {
      setSavedNote('Could not save — try again.')
    }
  }

  return (
    <AuthGuard>
      <div className="app-surface">
        <Navbar />
        <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <PageHeader
              title={`${label(category)} web`}
              subtitle={
                loading
                  ? 'Pulling the threads…'
                  : `${transactions?.length ?? 0} transactions · ${currency.format(total)} in ${new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
              }
              actions={
                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={month}
                    max={currentMonthKey()}
                    onChange={event => event.target.value && setMonth(event.target.value)}
                    className="text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                    aria-label="Month"
                  />
                  <Link
                    href="/money"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Money
                  </Link>
                </div>
              }
            />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
              {/* The web itself */}
              <div className="app-card overflow-hidden">
                {loading ? (
                  <div className="h-[560px] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : groups.length === 0 ? (
                  <div className="h-[560px] flex items-center justify-center text-sm text-slate-500">
                    No {label(category)} transactions this month.
                  </div>
                ) : (
                  <svg viewBox="-430 -430 860 860" className="w-full h-[560px] select-none">
                    {/* Threads: hub → merchant → leaf */}
                    {layout.merchants.map(node => (
                      <line
                        key={`spoke-${node.group.key}`}
                        x1={0}
                        y1={0}
                        x2={node.x}
                        y2={node.y}
                        stroke="rgb(199 210 254)"
                        strokeWidth={1.5}
                      />
                    ))}
                    {layout.leaves.map(leaf => (
                      <line
                        key={`thread-${leaf.transaction.id}`}
                        x1={leaf.mx}
                        y1={leaf.my}
                        x2={leaf.x}
                        y2={leaf.y}
                        stroke="rgb(226 232 240)"
                        strokeWidth={1}
                      />
                    ))}

                    {/* Leaves: the transactions */}
                    {layout.leaves.map(leaf => {
                      const isSelected = leaf.transaction.id === selectedId
                      return (
                        <motion.g
                          key={leaf.transaction.id}
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          transform={`translate(${leaf.x}, ${leaf.y})`}
                          onClick={() => setSelectedId(isSelected ? null : leaf.transaction.id)}
                          className="cursor-pointer"
                        >
                          <circle
                            r={Math.max(10, Math.min(26, Math.sqrt(leaf.transaction.amount) * 2.2))}
                            fill={isSelected ? 'rgb(79 70 229)' : leaf.transaction.entity === 'business' ? 'rgb(237 233 254)' : 'white'}
                            stroke={isSelected ? 'rgb(79 70 229)' : 'rgb(148 163 184)'}
                            strokeWidth={isSelected ? 2.5 : 1.25}
                          />
                          <text
                            y={Math.max(10, Math.min(26, Math.sqrt(leaf.transaction.amount) * 2.2)) + 14}
                            textAnchor="middle"
                            className="tabular-nums"
                            fill={isSelected ? 'rgb(67 56 202)' : 'rgb(100 116 139)'}
                            fontSize={11}
                            fontWeight={isSelected ? 700 : 500}
                          >
                            ${Math.round(leaf.transaction.amount)}
                          </text>
                        </motion.g>
                      )
                    })}

                    {/* Merchants: the knots */}
                    {layout.merchants.map(node => (
                      <g key={node.group.key} transform={`translate(${node.x}, ${node.y})`}>
                        <circle r={7} fill="rgb(99 102 241)" />
                        <text
                          y={-14}
                          textAnchor="middle"
                          fill="rgb(51 65 85)"
                          fontSize={12}
                          fontWeight={600}
                        >
                          {node.group.name.length > 18 ? `${node.group.name.slice(0, 17)}…` : node.group.name}
                        </text>
                        <text y={26} textAnchor="middle" fill="rgb(148 163 184)" fontSize={10} className="tabular-nums">
                          {currency.format(node.group.total)}
                        </text>
                      </g>
                    ))}

                    {/* Hub */}
                    <g>
                      <circle r={54} fill="rgb(15 23 42)" />
                      <text textAnchor="middle" y={-2} fill="white" fontSize={13} fontWeight={700}>
                        {label(category)}
                      </text>
                      <text textAnchor="middle" y={16} fill="rgb(148 163 184)" fontSize={11} className="tabular-nums">
                        {currency.format(total)}
                      </text>
                    </g>

                    {overflow > 0 && (
                      <text x={0} y={412} textAnchor="middle" fill="rgb(148 163 184)" fontSize={11}>
                        +{overflow} smaller transactions not drawn — see Money → Activity
                      </text>
                    )}
                  </svg>
                )}
              </div>

              {/* The reading pane: view + edit the selected leaf */}
              <div className="app-card p-5 h-fit lg:sticky lg:top-24">
                {selected ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {selected.merchantName ?? selected.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(`${selected.date}T00:00:00`).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          · {selected.source === 'synced' ? 'from your bank' : 'manual entry'}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Close"
                        onClick={() => setSelectedId(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-3xl font-bold font-numbers text-slate-900">
                      {currency.format(selected.amount)}
                    </p>

                    {selected.description !== (selected.merchantName ?? '') && (
                      <p className="text-xs text-slate-500 break-words">{selected.description}</p>
                    )}

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Category
                      </label>
                      <select
                        defaultValue={category}
                        onChange={event => applyEdit(event.target.value, selected.entity)}
                        className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2"
                      >
                        {EDIT_CATEGORIES.map(option => (
                          <option key={option} value={option}>
                            {label(option)}
                          </option>
                        ))}
                      </select>

                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block pt-1">
                        Entity
                      </label>
                      <div className="flex gap-1">
                        {(['personal', 'business'] as const).map(option => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => applyEdit(category, option)}
                            className={`flex-1 text-sm py-1.5 rounded-lg border font-medium ${
                              selected.entity === option
                                ? option === 'business'
                                  ? 'bg-purple-50 border-purple-300 text-purple-700'
                                  : 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {option === 'business' ? 'Business' : 'Personal'}
                          </button>
                        ))}
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                        Changes apply to every transaction from this merchant — the answer is
                        remembered so it never has to be asked again.
                      </p>
                      {savedNote && <p className="text-xs text-emerald-600">{savedNote}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 leading-relaxed">
                    <p className="font-medium text-slate-700 mb-1">Pick a thread.</p>
                    Click any circle to see that transaction and re-file it. Bigger circles are
                    bigger charges; purple-tinted ones are business.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
