"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Wallet, 
  PiggyBank, 
  Plus, 
  Pencil, 
  Trash2, 
  X,
  Building2,
  Check,
  DollarSign
} from "lucide-react"

interface FinancialAccount {
  id: string
  user_id: string
  account_type: 'checking' | 'savings'
  name: string
  balance: number
  institution: string | null
  notes: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

interface AccountsSummary {
  accounts: FinancialAccount[]
  totalChecking: number
  totalSavings: number
  totalBalance: number
  checkingCount: number
  savingsCount: number
}

export function FinancialAccounts() {
  const [summary, setSummary] = useState<AccountsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null)
  const [formData, setFormData] = useState({
    account_type: 'checking' as 'checking' | 'savings',
    name: '',
    balance: '',
    institution: '',
    notes: '',
    is_primary: false
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/accounts')
      const data = await response.json()
      setSummary(data)
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      account_type: 'checking',
      name: '',
      balance: '',
      institution: '',
      notes: '',
      is_primary: false
    })
    setEditingAccount(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        ...formData,
        balance: parseFloat(formData.balance) || 0,
        ...(editingAccount && { id: editingAccount.id })
      }

      const response = await fetch('/api/accounts', {
        method: editingAccount ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        await fetchAccounts()
        resetForm()
      }
    } catch (error) {
      console.error('Error saving account:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (account: FinancialAccount) => {
    setFormData({
      account_type: account.account_type,
      name: account.name,
      balance: account.balance.toString(),
      institution: account.institution || '',
      notes: account.notes || '',
      is_primary: account.is_primary
    })
    setEditingAccount(account)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return

    try {
      const response = await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchAccounts()
      }
    } catch (error) {
      console.error('Error deleting account:', error)
    }
  }

  if (loading) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            <div className="h-20 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Wallet className="h-4 w-4 text-emerald-600" />
          </div>
          Bank Accounts
        </CardTitle>
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Account
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 sm:p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <span className="text-xs sm:text-sm font-medium text-blue-800">Checking</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-blue-900">
              ${summary?.totalChecking.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {summary?.checkingCount || 0} account{(summary?.checkingCount || 0) !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 sm:p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <PiggyBank className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              <span className="text-xs sm:text-sm font-medium text-purple-800">Savings</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-purple-900">
              ${summary?.totalSavings.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-purple-600 mt-1">
              {summary?.savingsCount || 0} account{(summary?.savingsCount || 0) !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3 sm:p-4 border border-emerald-200">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              <span className="text-xs sm:text-sm font-medium text-emerald-800">Total Balance</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-900">
              ${summary?.totalBalance.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-emerald-600 mt-1">All accounts</p>
          </div>
        </div>

        {/* Account List */}
        {summary?.accounts && summary.accounts.length > 0 ? (
          <div className="space-y-3">
            {summary.accounts.map((account, index) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl border ${
                  account.account_type === 'checking' 
                    ? 'bg-blue-50/50 border-blue-200' 
                    : 'bg-purple-50/50 border-purple-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${
                      account.account_type === 'checking' 
                        ? 'bg-blue-500' 
                        : 'bg-purple-500'
                    }`}>
                      {account.account_type === 'checking' 
                        ? <Wallet className="h-5 w-5 text-white" />
                        : <PiggyBank className="h-5 w-5 text-white" />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-slate-900 truncate">{account.name}</h4>
                        {account.is_primary && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                        <span className="capitalize">{account.account_type}</span>
                        {account.institution && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[120px]">{account.institution}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-[52px] sm:pl-0">
                    <p className={`text-xl font-bold whitespace-nowrap ${
                      account.account_type === 'checking' 
                        ? 'text-blue-700' 
                        : 'text-purple-700'
                    }`}>
                      ${account.balance.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(account)}
                        className="h-8 w-8 p-0 hover:bg-slate-200"
                      >
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(account.id)}
                        className="h-8 w-8 p-0 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
                {account.notes && (
                  <p className="text-sm text-slate-500 mt-2 pl-[52px]">{account.notes}</p>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Accounts Yet</h3>
            <p className="text-slate-600 mb-4">Add your checking and savings accounts to track your total balance.</p>
            <Button onClick={() => setShowForm(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Account
            </Button>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
              onClick={(e) => e.target === e.currentTarget && resetForm()}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-md p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">
                    {editingAccount ? 'Edit Account' : 'Add New Account'}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Account Type */}
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, account_type: 'checking' }))}
                        className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                          formData.account_type === 'checking'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Wallet className="h-5 w-5" />
                        <span className="font-medium">Checking</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, account_type: 'savings' }))}
                        className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                          formData.account_type === 'savings'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <PiggyBank className="h-5 w-5" />
                        <span className="font-medium">Savings</span>
                      </button>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Account Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Main Checking, Emergency Fund"
                      value={formData.name}
                      onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Balance */}
                  <div className="space-y-2">
                    <Label htmlFor="balance">Current Balance</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <Input
                        id="balance"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="pl-7"
                        value={formData.balance}
                        onChange={(e) => setFormData(f => ({ ...f, balance: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Institution */}
                  <div className="space-y-2">
                    <Label htmlFor="institution">Bank/Institution (optional)</Label>
                    <Input
                      id="institution"
                      placeholder="e.g., Chase, Bank of America"
                      value={formData.institution}
                      onChange={(e) => setFormData(f => ({ ...f, institution: e.target.value }))}
                    />
                  </div>

                  {/* Primary */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, is_primary: !f.is_primary }))}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                        formData.is_primary
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-300'
                      }`}
                    >
                      {formData.is_primary && <Check className="h-4 w-4 text-white" />}
                    </button>
                    <Label className="cursor-pointer" onClick={() => setFormData(f => ({ ...f, is_primary: !f.is_primary }))}>
                      Set as primary account
                    </Label>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Any additional notes..."
                      value={formData.notes}
                      onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>

                  {/* Submit */}
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={saving || !formData.name}
                      className={`flex-1 ${
                        formData.account_type === 'checking'
                          ? 'bg-blue-500 hover:bg-blue-600'
                          : 'bg-purple-500 hover:bg-purple-600'
                      } text-white`}
                    >
                      {saving ? 'Saving...' : (editingAccount ? 'Update Account' : 'Add Account')}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

