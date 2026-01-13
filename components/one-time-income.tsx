"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Banknote, 
  Plus, 
  Pencil, 
  Trash2, 
  X,
  Gift,
  ShoppingBag,
  Award,
  Undo2,
  Percent,
  Scale,
  Heart,
  MoreHorizontal,
  Target,
  ArrowRight,
  Check,
  Calendar
} from "lucide-react"

interface OneTimeIncome {
  id: string
  user_id: string
  amount: number
  description: string
  source: 'sale' | 'gift' | 'bonus' | 'refund' | 'cashback' | 'settlement' | 'inheritance' | 'other'
  income_date: string
  applied_to_goals: boolean
  goal_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface Goal {
  id: string
  title: string
  target_amount: number
  current_amount: number
}

interface IncomeSummary {
  incomes: OneTimeIncome[]
  totalAmount: number
  appliedAmount: number
  unappliedAmount: number
  recentTotal: number
  totalCount: number
  unappliedCount: number
}

const SOURCE_CONFIG = {
  sale: { icon: ShoppingBag, label: 'Sale', color: 'bg-blue-500' },
  gift: { icon: Gift, label: 'Gift', color: 'bg-pink-500' },
  bonus: { icon: Award, label: 'Bonus', color: 'bg-amber-500' },
  refund: { icon: Undo2, label: 'Refund', color: 'bg-green-500' },
  cashback: { icon: Percent, label: 'Cashback', color: 'bg-teal-500' },
  settlement: { icon: Scale, label: 'Settlement', color: 'bg-purple-500' },
  inheritance: { icon: Heart, label: 'Inheritance', color: 'bg-rose-500' },
  other: { icon: MoreHorizontal, label: 'Other', color: 'bg-slate-500' }
}

export function OneTimeIncomeManager() {
  const [summary, setSummary] = useState<IncomeSummary | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState<OneTimeIncome | null>(null)
  const [editingIncome, setEditingIncome] = useState<OneTimeIncome | null>(null)
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    source: 'other' as OneTimeIncome['source'],
    income_date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [incomeRes, goalsRes] = await Promise.all([
        fetch('/api/one-time-income'),
        fetch('/api/goals')
      ])
      
      if (incomeRes.ok) {
        const data = await incomeRes.json()
        setSummary(data)
      }
      
      if (goalsRes.ok) {
        const data = await goalsRes.json()
        setGoals(data.filter((g: Goal & { status: string }) => g.status === 'active'))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      source: 'other',
      income_date: new Date().toISOString().split('T')[0],
      notes: ''
    })
    setEditingIncome(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        ...(editingIncome && { id: editingIncome.id })
      }

      const response = await fetch('/api/one-time-income', {
        method: editingIncome ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        await fetchData()
        resetForm()
      }
    } catch (error) {
      console.error('Error saving income:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (income: OneTimeIncome) => {
    setFormData({
      amount: income.amount.toString(),
      description: income.description,
      source: income.source,
      income_date: income.income_date,
      notes: income.notes || ''
    })
    setEditingIncome(income)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this income record?')) return

    try {
      const response = await fetch(`/api/one-time-income?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Error deleting income:', error)
    }
  }

  const handleApplyToGoal = async (incomeId: string, goalId: string) => {
    setApplying(true)
    try {
      const response = await fetch('/api/one-time-income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_to_goal',
          income_id: incomeId,
          goal_id: goalId
        })
      })

      if (response.ok) {
        await fetchData()
        setShowApplyModal(null)
      }
    } catch (error) {
      console.error('Error applying income to goal:', error)
    } finally {
      setApplying(false)
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
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <Banknote className="h-4 w-4 text-amber-600" />
          </div>
          One-Time Income
        </CardTitle>
        <Button
          size="sm"
          onClick={() => setShowForm(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Income
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3 sm:p-4 border border-amber-200">
            <p className="text-xs sm:text-sm font-medium text-amber-800 mb-1">Total Received</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-900">
              ${summary?.totalAmount.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-amber-600 mt-1">{summary?.totalCount || 0} entries</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 sm:p-4 border border-green-200">
            <p className="text-xs sm:text-sm font-medium text-green-800 mb-1">Applied to Goals</p>
            <p className="text-xl sm:text-2xl font-bold text-green-900">
              ${summary?.appliedAmount.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-green-600 mt-1">Contributing to your goals</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 sm:p-4 border border-blue-200">
            <p className="text-xs sm:text-sm font-medium text-blue-800 mb-1">Available to Apply</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-900">
              ${summary?.unappliedAmount.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {summary?.unappliedCount || 0} pending
            </p>
          </div>
        </div>

        {/* Income List */}
        {summary?.incomes && summary.incomes.length > 0 ? (
          <div className="space-y-3">
            {summary.incomes.map((income, index) => {
              const config = SOURCE_CONFIG[income.source]
              const Icon = config.icon

              return (
                <motion.div
                  key={income.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-xl border ${
                    income.applied_to_goals 
                      ? 'bg-green-50/50 border-green-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 shrink-0 ${config.color} rounded-lg flex items-center justify-center`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-slate-900 truncate">{income.description}</h4>
                          {income.applied_to_goals && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                              <Check className="h-3 w-3" />
                              Applied
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                          <span>{config.label}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(income.income_date).toLocaleDateString()}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-[52px] sm:pl-0">
                      <p className="text-xl font-bold text-emerald-600 whitespace-nowrap">
                        +${income.amount.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {!income.applied_to_goals && goals.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowApplyModal(income)}
                            className="h-8 px-2 hover:bg-green-100 text-green-600"
                          >
                            <Target className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Apply</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(income)}
                          className="h-8 w-8 p-0 hover:bg-slate-200"
                          disabled={income.applied_to_goals}
                        >
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(income.id)}
                          className="h-8 w-8 p-0 hover:bg-red-100"
                          disabled={income.applied_to_goals}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {income.notes && (
                    <p className="text-sm text-slate-500 mt-2 pl-[52px]">{income.notes}</p>
                  )}
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Banknote className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No One-Time Income Yet</h3>
            <p className="text-slate-600 mb-4">
              Record extra income like sales, gifts, bonuses, or refunds to apply towards your goals.
            </p>
            <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Income
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
                className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">
                    {editingIncome ? 'Edit Income' : 'Add One-Time Income'}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        className="pl-7 text-lg"
                        value={formData.amount}
                        onChange={(e) => setFormData(f => ({ ...f, amount: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="e.g., Sold old laptop, Tax refund"
                      value={formData.description}
                      onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Source */}
                  <div className="space-y-2">
                    <Label>Source Type</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(SOURCE_CONFIG).map(([key, config]) => {
                        const Icon = config.icon
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setFormData(f => ({ ...f, source: key as OneTimeIncome['source'] }))}
                            className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                              formData.source === key
                                ? 'border-amber-500 bg-amber-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className={`w-8 h-8 ${config.color} rounded-lg flex items-center justify-center`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-xs font-medium">{config.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="income_date">Date Received</Label>
                    <Input
                      id="income_date"
                      type="date"
                      value={formData.income_date}
                      onChange={(e) => setFormData(f => ({ ...f, income_date: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Any additional details..."
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
                      disabled={saving || !formData.amount || !formData.description}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      {saving ? 'Saving...' : (editingIncome ? 'Update Income' : 'Add Income')}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Apply to Goal Modal */}
        <AnimatePresence>
          {showApplyModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
              onClick={(e) => e.target === e.currentTarget && setShowApplyModal(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-md p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Apply to Goal</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowApplyModal(null)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-200">
                  <p className="text-sm text-amber-800">Applying</p>
                  <p className="text-2xl font-bold text-amber-900">${showApplyModal.amount.toLocaleString()}</p>
                  <p className="text-sm text-amber-700">{showApplyModal.description}</p>
                </div>

                <p className="text-sm text-slate-600 mb-4">Select a goal to apply this income to:</p>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {goals.map((goal) => {
                    const remaining = goal.target_amount - goal.current_amount
                    const wouldComplete = showApplyModal.amount >= remaining

                    return (
                      <button
                        key={goal.id}
                        onClick={() => handleApplyToGoal(showApplyModal.id, goal.id)}
                        disabled={applying}
                        className="w-full p-4 rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-all text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-slate-900">{goal.title}</h4>
                            <p className="text-sm text-slate-500">
                              ${goal.current_amount.toLocaleString()} / ${goal.target_amount.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {wouldComplete && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                Would Complete!
                              </span>
                            )}
                            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-green-500 transition-colors" />
                          </div>
                        </div>
                        <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-green-500 transition-all"
                            style={{ width: `${Math.min((goal.current_amount / goal.target_amount) * 100, 100)}%` }}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowApplyModal(null)} className="w-full">
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

