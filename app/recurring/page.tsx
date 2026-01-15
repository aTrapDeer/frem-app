"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, DollarSign, Plus, Trash2, RefreshCw, List, Wallet, Receipt, Pencil, X, Sparkles } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/contexts/auth-context"
import { IncomeSources } from "@/components/income-sources"
import { OneTimeTransactions } from "@/components/one-time-transactions"

interface RecurringExpense {
  id: string
  user_id: string
  name: string
  description: string | null
  amount: number
  category: string
  due_date: number
  status: string
  auto_pay: boolean
  reminder_enabled: boolean
  created_at: string
  updated_at: string
}

export default function RecurringExpenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<RecurringExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year' | 'custom'>('month')
  const [activeTab, setActiveTab] = useState<'income' | 'expenses' | 'one-time'>('income')

  const [newExpense, setNewExpense] = useState({
    name: "",
    amount: "",
    category: "",
    dueDate: "",
    description: "",
  })
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    amount: "",
    category: "",
    dueDate: "",
    description: "",
  })



  const totalMonthly = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const dailyImpact = totalMonthly / 30

  // Load expenses from API
  useEffect(() => {
    async function fetchExpenses() {
      if (!user) return
      
      try {
        setLoading(true)
        const response = await fetch('/api/recurring')
        if (response.ok) {
          const data = await response.json()
          setExpenses(data)
        }
      } catch (error) {
        console.error('Error fetching expenses:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchExpenses()
    }
  }, [user])

  const addExpense = async () => {
    if (!newExpense.name || !newExpense.amount || !newExpense.category || !newExpense.dueDate || !user) return
    
    try {
      setSubmitting(true)
      const response = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newExpense.name,
          amount: parseFloat(newExpense.amount),
          category: newExpense.category.toLowerCase(),
          due_date: parseInt(newExpense.dueDate),
          description: newExpense.description || null,
          status: "active",
          auto_pay: false,
          reminder_enabled: true,
        })
      })
      
      if (response.ok) {
        const expense = await response.json()
        setExpenses(prev => [expense, ...prev])
        setNewExpense({ name: "", amount: "", category: "", dueDate: "", description: "" })
      }
    } catch (error) {
      console.error('Error creating expense:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const deleteExpense = async (id: string) => {
    if (!user || !confirm('Are you sure you want to delete this expense?')) return
    
    try {
      const response = await fetch('/api/recurring', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'cancelled' })
      })
      
      if (response.ok) {
        setExpenses(prev => prev.filter(expense => expense.id !== id))
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  const openEditModal = (expense: RecurringExpense) => {
    setEditingExpense(expense)
    setEditForm({
      name: expense.name,
      amount: expense.amount.toString(),
      category: expense.category,
      dueDate: expense.due_date.toString(),
      description: expense.description || "",
    })
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setEditingExpense(null)
    setShowEditModal(false)
    setEditForm({ name: "", amount: "", category: "", dueDate: "", description: "" })
  }

  const updateExpense = async () => {
    if (!editingExpense || !editForm.name || !editForm.amount || !editForm.category || !editForm.dueDate || !user) return
    
    try {
      setSubmitting(true)
      const response = await fetch('/api/recurring', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingExpense.id,
          name: editForm.name,
          amount: parseFloat(editForm.amount),
          category: editForm.category.toLowerCase(),
          due_date: parseInt(editForm.dueDate),
          description: editForm.description || null,
        })
      })
      
      if (response.ok) {
        const updatedExpense = await response.json()
        setExpenses(prev => prev.map(exp => 
          exp.id === editingExpense.id ? updatedExpense : exp
        ))
        closeEditModal()
      }
    } catch (error) {
      console.error('Error updating expense:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const categories = ["housing", "utilities", "entertainment", "health", "transportation", "food", "subscriptions", "insurance", "other"]

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDay = firstDay.getDay() // 0 = Sunday
    
    const days = []
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const getExpensesForDay = (day: number) => {
    return expenses.filter(expense => expense.due_date === day)
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Time range calculations
  const calculateProjectedExpenses = (range: 'month' | 'quarter' | 'year' | 'custom') => {
    const totalMonthly = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    
    switch (range) {
      case 'month':
        return { amount: totalMonthly, period: '1 Month', multiplier: 1 }
      case 'quarter':
        return { amount: totalMonthly * 3, period: '3 Months (Quarter)', multiplier: 3 }
      case 'year':
        return { amount: totalMonthly * 12, period: '12 Months (Year)', multiplier: 12 }
      default:
        return { amount: totalMonthly, period: '1 Month', multiplier: 1 }
    }
  }

  const projectedData = calculateProjectedExpenses(timeRange)
  const averageDaily = projectedData.amount / (30.44 * projectedData.multiplier)

  const getCategoryColor = (category: string) => {
    const colors = {
      Housing: "from-indigo-400 to-blue-500",
      Utilities: "from-orange-400 to-red-500",
      Entertainment: "from-indigo-400 to-blue-500",
      Health: "from-green-400 to-emerald-500",
      Transportation: "from-blue-400 to-cyan-500",
      Food: "from-pink-400 to-rose-500",
      Other: "from-gray-400 to-slate-500",
    }
    return colors[category as keyof typeof colors] || colors.Other
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Navbar />

      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Budget</h1>
            <p className="text-gray-600">Manage your income sources, recurring costs, and one-time transactions</p>
          </div>

          {/* Tab Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-8 max-w-2xl">
            <button
              onClick={() => setActiveTab('income')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'income'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="h-4 w-4" />
              <span>Income Sources</span>
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'expenses'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span>Recurring Expenses</span>
            </button>
            <button
              onClick={() => setActiveTab('one-time')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'one-time'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>One-Time</span>
            </button>
          </div>

          {/* Income Sources Tab */}
          {activeTab === 'income' && (
            <IncomeSources />
          )}

          {/* One-Time Transactions Tab */}
          {activeTab === 'one-time' && (
            <OneTimeTransactions />
          )}

          {/* Expenses Tab */}
          {/* Edit Expense Modal */}
          {showEditModal && editingExpense && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Edit Expense</h3>
                  <Button variant="ghost" size="sm" onClick={closeEditModal}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-expense-name">Expense Name</Label>
                    <Input
                      id="edit-expense-name"
                      placeholder="e.g., Netflix, Rent"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="bg-white border-gray-200"
                    />
                  </div>

                <div>
                  <Label htmlFor="edit-expense-description">Description (Optional)</Label>
                  <Input
                    id="edit-expense-description"
                    placeholder="e.g., Annual plan, split with roommate"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="bg-white border-gray-200"
                  />
                </div>

                  <div>
                    <Label htmlFor="edit-expense-amount">Monthly Amount</Label>
                    <Input
                      id="edit-expense-amount"
                      type="number"
                      placeholder="0.00"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                      className="bg-white border-gray-200"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-expense-category">Category</Label>
                    <select
                      id="edit-expense-category"
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full h-10 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm"
                    >
                      <option value="">Select category</option>
                      <option value="housing">🏠 Housing</option>
                      <option value="utilities">⚡ Utilities</option>
                      <option value="entertainment">🎬 Entertainment</option>
                      <option value="health">⚕️ Health</option>
                      <option value="transportation">🚗 Transportation</option>
                      <option value="food">🍕 Food</option>
                      <option value="subscriptions">📺 Subscriptions</option>
                      <option value="insurance">🛡️ Insurance</option>
                      <option value="other">📦 Other</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="edit-expense-due">Due Date (Day of Month)</Label>
                    <Input
                      id="edit-expense-due"
                      type="number"
                      min="1"
                      max="31"
                      placeholder="1-31"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                      className="bg-white border-gray-200"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={closeEditModal}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={updateExpense}
                      disabled={submitting || !editForm.name || !editForm.amount || !editForm.category || !editForm.dueDate}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white disabled:opacity-50"
                    >
                      {submitting ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'expenses' && (
          <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-800">${totalMonthly.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Total Monthly</p>
              </div>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-800">${dailyImpact.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Daily Impact</p>
              </div>
            </Card>

            <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-800">{expenses.length}</p>
                <p className="text-sm text-gray-600">Active Subscriptions</p>
              </div>
            </Card>
          </div>

          {/* Expense Projections */}
          {expenses.length > 0 && (
            <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg mb-8">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Expense Projections</h3>
                    <div className="flex items-center space-x-4">
                      {(['month', 'quarter', 'year'] as const).map((range) => (
                        <Button
                          key={range}
                          variant={timeRange === range ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setTimeRange(range)}
                          className={`text-white ${timeRange === range ? 'bg-white/20' : 'hover:bg-white/10'}`}
                        >
                          {range === 'month' ? '1M' : range === 'quarter' ? '3M' : '12M'}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold mb-1">
                      ${projectedData.amount.toLocaleString()}
                    </div>
                    <p className="text-sm text-white/80">Total for {projectedData.period}</p>
                    <p className="text-xs text-white/60">
                      ~${averageDaily.toFixed(2)}/day average
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Expenses List */}
            <div className="lg:col-span-2">
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">Monthly Expenses</h3>
                  <div className="flex space-x-2">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="flex items-center space-x-1"
                    >
                      <List className="h-4 w-4" />
                      <span>List</span>
                    </Button>
                    <Button
                      variant={viewMode === 'calendar' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('calendar')}
                      className="flex items-center space-x-1"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Calendar</span>
                    </Button>
                  </div>
                </div>

                {viewMode === 'list' ? (
                  <div className="space-y-4">
                    {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="animate-pulse flex items-center space-x-4">
                            <div className="w-10 h-10 bg-slate-300 rounded-lg"></div>
                            <div className="space-y-2">
                              <div className="h-4 bg-slate-300 rounded w-32"></div>
                              <div className="h-3 bg-slate-300 rounded w-24"></div>
                            </div>
                          </div>
                          <div className="animate-pulse">
                            <div className="h-6 bg-slate-300 rounded w-16"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : expenses.length === 0 ? (
                    <div className="text-center py-12">
                      <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">No Recurring Expenses</h3>
                      <p className="text-slate-600">Add your monthly subscriptions and bills to track them.</p>
                    </div>
                  ) : (
                    expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 group hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-10 h-10 bg-gradient-to-r ${getCategoryColor(expense.category)} rounded-lg flex items-center justify-center`}
                        >
                          <DollarSign className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">{expense.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{expense.category}</span>
                            <span>•</span>
                            <span>
                              Due: {expense.due_date}
                              {expense.due_date === 1
                                ? "st"
                                : expense.due_date === 2
                                  ? "nd"
                                  : expense.due_date === 3
                                    ? "rd"
                                    : "th"}
                            </span>
                          </div>
                          {expense.description && (
                            <div className="text-xs text-slate-500 mt-1">
                              {expense.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-800">${expense.amount}</p>
                          <p className="text-sm text-gray-600">/month</p>
                        </div>
                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(expense)}
                            className="border-slate-200 text-slate-600 hover:bg-slate-50 bg-transparent"
                            title="Edit expense"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteExpense(expense.id)}
                            className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                            title="Delete expense"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    ))
                  )}
                  </div>
                ) : (
                  // Calendar View
                  <div className="space-y-4">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newDate = new Date(selectedMonth)
                          newDate.setMonth(newDate.getMonth() - 1)
                          setSelectedMonth(newDate)
                        }}
                      >
                        ←
                      </Button>
                      <h4 className="text-lg font-semibold text-gray-800">
                        {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newDate = new Date(selectedMonth)
                          newDate.setMonth(newDate.getMonth() + 1)
                          setSelectedMonth(newDate)
                        }}
                      >
                        →
                      </Button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                          {day}
                        </div>
                      ))}
                      
                      {getDaysInMonth(selectedMonth).map((day, index) => (
                        <div
                          key={index}
                          className={`min-h-[80px] p-2 border border-gray-200 rounded ${!day ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
                        >
                          {day && (
                            <>
                              <div className="text-sm font-medium text-gray-800 mb-1">{day}</div>
                              {getExpensesForDay(day).map(expense => (
                                <div
                                  key={expense.id}
                                  className={`text-xs p-1 rounded mb-1 ${getCategoryColor(expense.category)} text-white`}
                                  title={`${expense.name} - $${expense.amount}`}
                                >
                                  ${expense.amount}
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Legend */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      {categories.map(category => {
                        const categoryExpenses = expenses.filter(e => e.category === category)
                        if (categoryExpenses.length === 0) return null
                        return (
                          <div key={category} className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded ${getCategoryColor(category)}`}></div>
                            <span className="text-gray-600 capitalize">{category} ({categoryExpenses.length})</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Add New Expense */}
            <div>
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6 rounded-2xl">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">Add New Expense</h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="expense-name">Expense Name</Label>
                    <Input
                      id="expense-name"
                      placeholder="e.g., Netflix, Rent"
                      value={newExpense.name}
                      onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                      className="bg-white border-gray-200"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expense-description">Description (Optional)</Label>
                    <Input
                      id="expense-description"
                      placeholder="e.g., Annual plan, shared subscription"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      className="bg-white border-gray-200"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expense-amount">Monthly Amount</Label>
                    <Input
                      id="expense-amount"
                      type="number"
                      placeholder="0.00"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      className="bg-white border-gray-200"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expense-category">Category</Label>
                    <select
                      id="expense-category"
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                      className="w-full h-10 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm"
                    >
                      <option value="">Select category</option>
                      <option value="housing">🏠 Housing</option>
                      <option value="utilities">⚡ Utilities</option>
                      <option value="entertainment">🎬 Entertainment</option>
                      <option value="health">⚕️ Health</option>
                      <option value="transportation">🚗 Transportation</option>
                      <option value="food">🍕 Food</option>
                      <option value="subscriptions">📺 Subscriptions</option>
                      <option value="insurance">🛡️ Insurance</option>
                      <option value="other">📦 Other</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="expense-due">Due Date (Day of Month)</Label>
                    <Input
                      id="expense-due"
                      type="number"
                      min="1"
                      max="31"
                      placeholder="1-31"
                      value={newExpense.dueDate}
                      onChange={(e) => setNewExpense({ ...newExpense, dueDate: e.target.value })}
                      className="bg-white border-gray-200"
                    />
                  </div>

                  <Button 
                    onClick={addExpense}
                    disabled={submitting || !newExpense.name || !newExpense.amount || !newExpense.category || !newExpense.dueDate}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {submitting ? "Adding..." : "Add Expense"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
      </div>
    </AuthGuard>
  )
}
