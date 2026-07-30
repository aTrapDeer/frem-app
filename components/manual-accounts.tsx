"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Loader2, Pencil, Plus, Trash2, TrendingUp, X } from "lucide-react"

/**
 * Manual accounts — for the institutions Plaid can't reach, or you'd rather
 * not link. Type the balance, tag it personal or business, and update it when
 * it changes. The balance flows into net worth and can back a linked goal,
 * exactly like a synced account.
 */

type Entity = 'personal' | 'business'

interface ManualAccount {
  id: string
  label: string | null
  accountType: string
  balance: number
  riskProfile: string
  entity: Entity
  updatedAt: string
}

const TYPE_OPTIONS = [
  { value: 'brokerage', label: 'Brokerage' },
  { value: '401k', label: '401(k)' },
  { value: 'ira', label: 'IRA' },
  { value: 'roth', label: 'Roth IRA' },
  { value: 'hsa', label: 'HSA' },
  { value: 'other', label: 'Other' },
] as const

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function typeLabel(value: string): string {
  return TYPE_OPTIONS.find(option => option.value === value)?.label ?? value
}

export function ManualAccounts() {
  const [accounts, setAccounts] = useState<ManualAccount[] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftBalance, setDraftBalance] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    label: '',
    accountType: 'brokerage' as string,
    balance: '',
    entity: 'personal' as Entity,
  })

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/investments')
      if (!response.ok) return
      const data = await response.json()
      setAccounts(data.accounts)
    } catch {
      // Section shows its empty state; nothing to break
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const create = async () => {
    const balance = Number(form.balance)
    if (!form.label.trim()) {
      setError('Give it a name — e.g. Charles Schwab Brokerage')
      return
    }
    if (!Number.isFinite(balance) || balance < 0) {
      setError('Enter a balance of zero or more')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label.trim(),
          accountType: form.accountType,
          balance,
          entity: form.entity,
          riskProfile: 'index',
        }),
      })
      if (!response.ok) {
        const payload = await response.json()
        setError(payload.error || 'Failed to add')
        return
      }
      setForm({ label: '', accountType: 'brokerage', balance: '', entity: 'personal' })
      setShowForm(false)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const saveBalance = async (account: ManualAccount) => {
    const balance = Number(draftBalance)
    if (!Number.isFinite(balance) || balance < 0) return

    setBusy(true)
    try {
      const response = await fetch('/api/investments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: account.id, balance }),
      })
      if (response.ok) {
        setEditingId(null)
        await load()
      }
    } finally {
      setBusy(false)
    }
  }

  const setEntity = async (account: ManualAccount, entity: Entity) => {
    if (account.entity === entity) return
    await fetch('/api/investments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: account.id, entity }),
    })
    await load()
  }

  const remove = async (account: ManualAccount) => {
    if (!confirm(`Remove ${account.label ?? typeLabel(account.accountType)}?`)) return
    await fetch(`/api/investments?id=${account.id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Manual accounts</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              For institutions you can&apos;t link — update the balance yourself as it changes.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(previous => !previous)}
            className="shrink-0"
          >
            {showForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
            {showForm ? 'Close' : 'Add account'}
          </Button>
        </div>

        {showForm && (
          <div className="mt-4 p-4 rounded-lg border border-blue-200 bg-blue-50/40 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
              <div className="space-y-1.5 flex-1 min-w-[180px]">
                <Label className="text-slate-700 text-xs">Name</Label>
                <Input
                  placeholder="e.g. Charles Schwab Brokerage"
                  value={form.label}
                  onChange={event => setForm(f => ({ ...f, label: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs">Type</Label>
                <select
                  value={form.accountType}
                  onChange={event => setForm(f => ({ ...f, accountType: event.target.value }))}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                >
                  {TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 w-32">
                <Label className="text-slate-700 text-xs">Balance</Label>
                <Input
                  inputMode="decimal"
                  placeholder="0"
                  value={form.balance}
                  onChange={event => setForm(f => ({ ...f, balance: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs">Belongs to</Label>
                <div className="inline-flex p-0.5 bg-white border border-slate-200 rounded-md">
                  {(['personal', 'business'] as const).map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, entity: option }))}
                      className={`px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                        form.entity === option ? 'bg-slate-900 text-white' : 'text-slate-500'
                      }`}
                    >
                      {option === 'personal' ? 'Personal' : 'Business'}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={create} disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        {accounts === null ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        ) : accounts.length === 0 && !showForm ? (
          <p className="mt-4 text-sm text-slate-400">
            Nothing yet. A brokerage you can&apos;t link, an old 401(k), a business reserve — they
            all count toward net worth once added.
          </p>
        ) : accounts.length > 0 ? (
          <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
            {accounts.map(account => (
              <div key={account.id} className="flex items-center justify-between gap-3 py-3 group">
                <div className="flex items-center gap-3 min-w-0">
                  <TrendingUp className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {account.label ?? typeLabel(account.accountType)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {typeLabel(account.accountType)} · manual · updated{' '}
                      {account.updatedAt.slice(0, 10)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="inline-flex p-0.5 bg-slate-100 rounded-md opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {(['personal', 'business'] as const).map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setEntity(account, option)}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                          account.entity === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        {option === 'personal' ? 'Personal' : 'Business'}
                      </button>
                    ))}
                  </div>
                  {account.entity === 'business' && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded group-hover:hidden">
                      Biz
                    </span>
                  )}

                  {editingId === account.id ? (
                    <span className="flex items-center gap-1">
                      <Input
                        autoFocus
                        inputMode="decimal"
                        value={draftBalance}
                        onChange={event => setDraftBalance(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') saveBalance(account)
                          if (event.key === 'Escape') setEditingId(null)
                        }}
                        className="w-28 h-8"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => saveBalance(account)}
                        className="text-emerald-600 hover:text-emerald-700 p-1"
                        aria-label="Save balance"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(account.id)
                        setDraftBalance(String(account.balance))
                      }}
                      className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-slate-900 hover:text-blue-600"
                      title="Update balance"
                    >
                      {currency.format(account.balance)}
                      <Pencil className="w-3 h-3 text-slate-300 group-hover:text-slate-500" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => remove(account)}
                    className="text-slate-300 hover:text-red-500 p-1"
                    aria-label="Remove account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
