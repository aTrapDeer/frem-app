"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Building2, CreditCard, Landmark, Loader2, TrendingUp, Wallet } from "lucide-react"

/**
 * Linked accounts, summarised.
 *
 * Replaces the old hand-typed "Bank Accounts" widget, which only knew
 * checking/savings and drifted the moment a balance changed. This reads the
 * accounts FREM actually syncs — checking, savings, brokerage, credit, loans —
 * with their live balances and personal/business tags.
 */

type Entity = 'personal' | 'business'

interface AccountRow {
  id: string
  name: string
  mask: string | null
  type: string
  subtype: string | null
  currentBalance: number
  entity: Entity
  institution: string
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function iconFor(type: string) {
  if (type === 'credit') return CreditCard
  if (type === 'loan') return Landmark
  if (type === 'investment') return TrendingUp
  return Wallet
}

export function LinkedAccountsCard() {
  const [rows, setRows] = useState<AccountRow[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch('/api/connections')
        if (!response.ok) {
          if (!cancelled) setFailed(true)
          return
        }
        const data = await response.json()
        const flat: AccountRow[] = []
        for (const connection of data.connections ?? []) {
          for (const account of connection.accounts ?? []) {
            flat.push({
              id: account.id,
              name: account.name,
              mask: account.mask,
              type: account.type,
              subtype: account.subtype,
              currentBalance: account.currentBalance,
              entity: account.entity,
              institution: connection.institutionName,
            })
          }
        }
        if (!cancelled) setRows(flat)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const net =
    rows?.reduce((sum, account) => {
      const isDebt = account.type === 'credit' || account.type === 'loan'
      return sum + (isDebt ? -Math.abs(account.currentBalance) : account.currentBalance)
    }, 0) ?? 0

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">Linked accounts</h3>
            <p className="text-xs text-slate-500 mt-0.5">Live balances from your banks</p>
          </div>
          {rows && rows.length > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Net</p>
              <p
                className={`text-xl font-bold tabular-nums ${net < 0 ? 'text-red-600' : 'text-slate-900'}`}
              >
                {net < 0 ? '−' : ''}
                {currency.format(Math.abs(net))}
              </p>
            </div>
          )}
        </div>

        {rows === null && !failed ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : failed || rows === null || rows.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No accounts connected yet.</p>
            <Link
              href="/accounts"
              className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Connect a bank
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {rows.map(account => {
                const Icon = iconFor(account.type)
                const isDebt = account.type === 'credit' || account.type === 'loan'
                return (
                  <div key={account.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {account.name}
                          {account.mask && (
                            <span className="text-slate-400 font-normal"> ····{account.mask}</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 capitalize truncate">
                          {account.institution} · {account.subtype || account.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {account.entity === 'business' && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                          Biz
                        </span>
                      )}
                      <p
                        className={`text-sm font-semibold tabular-nums ${
                          isDebt ? 'text-red-600' : 'text-slate-900'
                        }`}
                      >
                        {isDebt ? '−' : ''}
                        {currency.format(Math.abs(account.currentBalance))}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <Link
              href="/accounts"
              className="inline-flex items-center gap-1 mt-4 text-sm text-blue-600 hover:text-blue-700"
            >
              Manage accounts
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
