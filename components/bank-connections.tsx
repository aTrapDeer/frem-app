"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlaidLinkButton } from "@/components/plaid-link-button"
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  RefreshCw,
  Trash2,
  Wallet,
} from "lucide-react"

type Entity = 'personal' | 'business'

interface LinkedAccount {
  id: string
  name: string
  mask: string | null
  type: string
  subtype: string | null
  currentBalance: number
  availableBalance: number | null
  entity: Entity
  entityLabel: string | null
  isExcluded: boolean
}

interface Connection {
  id: string
  provider: 'plaid' | 'mercury'
  institutionName: string
  entity: Entity
  entityLabel: string | null
  status: 'active' | 'reauth_required' | 'error' | 'disconnected'
  statusDetail: string | null
  lastSyncedAt: string | null
  accounts: LinkedAccount[]
}

interface SyncSummary {
  connectionId: string
  institutionName: string
  added: number
  modified: number
  removed: number
  error?: string
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

function formatSyncedAt(timestamp: string | null): string {
  if (!timestamp) return 'Never synced'

  const then = new Date(timestamp).getTime()
  const minutes = Math.floor((Date.now() - then) / 60000)

  if (minutes < 1) return 'Synced just now'
  if (minutes < 60) return `Synced ${minutes}m ago`
  if (minutes < 1440) return `Synced ${Math.floor(minutes / 60)}h ago`
  return `Synced ${Math.floor(minutes / 1440)}d ago`
}

function accountIcon(type: string) {
  if (type === 'credit') return CreditCard
  if (type === 'loan') return Landmark
  return Wallet
}

export function BankConnections() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<SyncSummary[] | null>(null)
  const [retaggingId, setRetaggingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [entity, setEntity] = useState<Entity>('personal')
  const [entityLabel, setEntityLabel] = useState('')

  const fetchConnections = useCallback(async () => {
    try {
      const response = await fetch('/api/connections')
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to load connections')
        return
      }

      setConnections(data.connections)
      setError(null)
    } catch {
      setError('Failed to load connections')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const handleSync = async (connectionId?: string) => {
    setSyncingId(connectionId ?? 'all')
    setLastSync(null)

    try {
      const response = await fetch('/api/plaid/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionId ? { connectionId } : {}),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Sync failed')
        return
      }

      setLastSync(data.synced)
      await fetchConnections()
    } catch {
      setError('Sync failed')
    } finally {
      setSyncingId(null)
    }
  }

  const handleRetag = async (account: LinkedAccount, entity: Entity) => {
    if (account.entity === entity) return

    setRetaggingId(account.id)
    try {
      const response = await fetch('/api/bank-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          entity,
          // Carry the connection's business label onto business accounts
          entityLabel: entity === 'business' ? account.entityLabel : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update account')
        return
      }

      if (data.transactionsRetagged > 0) {
        setNotice(
          `${account.name} is now ${entity} — ${data.transactionsRetagged} transaction${
            data.transactionsRetagged === 1 ? '' : 's'
          } re-tagged.`
        )
      }

      await fetchConnections()
    } catch {
      setError('Failed to update account')
    } finally {
      setRetaggingId(null)
    }
  }

  const handleDisconnect = async (connection: Connection) => {
    const confirmed = window.confirm(
      `Disconnect ${connection.institutionName}? This removes its synced accounts and transactions.`
    )
    if (!confirmed) return

    try {
      const response = await fetch(`/api/connections?id=${connection.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to disconnect')
        return
      }
      await fetchConnections()
    } catch {
      setError('Failed to disconnect')
    }
  }

  const totalAdded = lastSync?.reduce((sum, entry) => sum + entry.added, 0) ?? 0
  const totalAccounts = connections.reduce((sum, c) => sum + c.accounts.length, 0)

  // Debt reduces net worth, so credit and loan balances subtract
  const netBalance = connections.reduce(
    (sum, connection) =>
      sum +
      connection.accounts.reduce((inner, account) => {
        const isDebt = account.type === 'credit' || account.type === 'loan'
        return inner + (isDebt ? -Math.abs(account.currentBalance) : account.currentBalance)
      }, 0),
    0
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const isEmpty = connections.length === 0

  const connectPanel = (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-5 sm:items-end">
        <div className="space-y-2">
          <Label className="text-slate-700">This account belongs to</Label>
          {/* Segmented control reads as one choice rather than two buttons */}
          <div className="inline-flex p-1 bg-slate-100 rounded-lg">
            {(['personal', 'business'] as const).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setEntity(option)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  entity === option
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {option === 'personal' ? 'Personal' : 'Business'}
              </button>
            ))}
          </div>
        </div>

        {entity === 'business' && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            className="space-y-2 flex-1 min-w-0"
          >
            <Label htmlFor="entity-label" className="text-slate-700">
              Business name <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="entity-label"
              placeholder="e.g. My LLC"
              value={entityLabel}
              onChange={event => setEntityLabel(event.target.value)}
            />
          </motion.div>
        )}

        <PlaidLinkButton
          entity={entity}
          entityLabel={entityLabel.trim() || null}
          onLinked={fetchConnections}
          onError={setError}
        />
      </div>

      <p className="text-xs text-slate-400">
        Sandbox mode — search any bank, then sign in with{' '}
        <code className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">user_good</code>
        {' / '}
        <code className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">pass_good</code>
      </p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* When nothing is linked, the connect form IS the page — no separate empty state */}
      {isEmpty ? (
        <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200 shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Connect your first account</h3>
                <p className="text-sm text-slate-600">
                  Balances and transactions stay current on their own.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">{connectPanel}</div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Connect another account</h3>
            {connectPanel}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {lastSync && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {totalAdded > 0
              ? `Pulled ${totalAdded} new transaction${totalAdded === 1 ? '' : 's'}.`
              : 'Already up to date — no new transactions.'}
          </span>
        </div>
      )}

      {/* Linked institutions */}
      {!isEmpty && (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Connected</h3>
              <p className="text-sm text-slate-400">
                {totalAccounts} account{totalAccounts === 1 ? '' : 's'} across {connections.length}{' '}
                institution{connections.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="flex items-end gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Net</p>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    netBalance < 0 ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  {netBalance < 0 ? '−' : ''}{currency.format(Math.abs(netBalance))}
                </p>
              </div>
            <Button
              variant="outline"
              onClick={() => handleSync()}
              disabled={syncingId !== null}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncingId === 'all' ? 'animate-spin' : ''}`} />
                Sync all
              </Button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {connections.map(connection => (
              <motion.div
                key={connection.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-slate-900">{connection.institutionName}</h4>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              connection.entity === 'business'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {connection.entityLabel || (connection.entity === 'business' ? 'Business' : 'Personal')}
                          </span>
                          {connection.status !== 'active' && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                              {connection.status === 'reauth_required' ? 'Reconnect needed' : 'Sync error'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatSyncedAt(connection.lastSyncedAt)}
                          {connection.statusDetail ? ` · ${connection.statusDetail}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(connection.id)}
                          disabled={syncingId !== null}
                        >
                          <RefreshCw
                            className={`w-4 h-4 ${syncingId === connection.id ? 'animate-spin' : ''}`}
                          />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(connection)}
                          disabled={syncingId !== null}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
                      {connection.accounts.map(account => {
                        const Icon = accountIcon(account.type)
                        // Credit and loan balances represent debt, not assets
                        const isDebt = account.type === 'credit' || account.type === 'loan'

                        return (
                          <div
                            key={account.id}
                            className="flex items-center justify-between gap-4 py-3 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {account.name}
                                  {account.mask && (
                                    <span className="text-slate-400 font-normal"> ····{account.mask}</span>
                                  )}
                                </p>
                                <p className="text-xs text-slate-500 capitalize">
                                  {account.subtype || account.type}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {/* One institution can hold both personal and business
                                  accounts, so entity is set per account, not per link */}
                              <div
                                className={`inline-flex p-0.5 bg-slate-100 rounded-md transition-opacity ${
                                  retaggingId === account.id ? '' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                                }`}
                              >
                                {(['personal', 'business'] as const).map(option => (
                                  <button
                                    key={option}
                                    type="button"
                                    disabled={retaggingId !== null}
                                    onClick={() => handleRetag(account, option)}
                                    className={`px-2 py-0.5 rounded text-xs font-medium transition-all disabled:opacity-50 ${
                                      account.entity === option
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                  >
                                    {option === 'personal' ? 'Personal' : 'Business'}
                                  </button>
                                ))}
                              </div>

                              {/* Always visible so the split is readable at a glance */}
                              {account.entity === 'business' && (
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded group-hover:hidden">
                                  Biz
                                </span>
                              )}

                              <p
                                className={`text-sm font-semibold tabular-nums w-24 text-right ${
                                  isDebt ? 'text-red-600' : 'text-slate-900'
                                }`}
                              >
                                {isDebt && account.currentBalance > 0 ? '−' : ''}
                                {currency.format(Math.abs(account.currentBalance))}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
