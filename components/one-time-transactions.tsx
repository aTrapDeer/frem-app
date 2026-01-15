"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { Plus, Minus, DollarSign, TrendingUp, TrendingDown, Calendar, Pencil, X } from "lucide-react"

interface Transaction {
  id: string
  user_id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string | null
  transaction_date: string
  transaction_time: string
  created_at: string
  updated_at: string
}

export function OneTimeTransactions() {
  const { user } = useAuth()
  const [incomeAmount, setIncomeAmount] = useState("")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [incomeDescription, setIncomeDescription] = useState("")
  const [expenseDescription, setExpenseDescription] = useState("")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    amount: "",
    description: "",
    type: "income" as Transaction["type"],
  })

  // Fetch transactions for selected date
  useEffect(() => {
    async function fetchTransactions() {
      if (!user) return
      
      try {
        setTransactionsLoading(true)
        const response = await fetch(`/api/transactions?date=${dateFilter}`)
        if (response.ok) {
          const data = await response.json()
          setTransactions(data)
        }
      } catch (error) {
        console.error('Error fetching transactions:', error)
      } finally {
        setTransactionsLoading(false)
      }
    }

    if (user) {
      fetchTransactions()
    }
  }, [user, dateFilter])

  const addTransaction = async (type: "income" | "expense") => {
    const amount = parseFloat(type === "income" ? incomeAmount : expenseAmount)
    const rawDescription = (type === "income" ? incomeDescription : expenseDescription).trim()
    const description = rawDescription || (type === "income" ? "One-time income" : "One-time expense")
    
    if (!amount || !user) return
    
    try {
      setSubmitting(true)
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount,
          description,
          transaction_date: dateFilter,
          transaction_time: new Date().toTimeString().split(' ')[0]
        })
      })
      
      if (response.ok) {
        const newTransaction = await response.json()
        setTransactions(prev => [newTransaction, ...prev])
        
        // Clear form
        if (type === "income") {
          setIncomeAmount("")
          setIncomeDescription("")
        } else {
          setExpenseAmount("")
          setExpenseDescription("")
        }
      }
    } catch (error) {
      console.error('Error adding transaction:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setEditForm({
      amount: transaction.amount.toString(),
      description: transaction.description || "",
      type: transaction.type
    })
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setEditingTransaction(null)
    setShowEditModal(false)
    setEditForm({ amount: "", description: "", type: "income" })
  }

  const updateTransaction = async () => {
    if (!editingTransaction || !user) return
    const amount = parseFloat(editForm.amount)
    const rawDescription = editForm.description.trim()
    const description = rawDescription || (editForm.type === "income" ? "One-time income" : "One-time expense")

    if (!amount) return

    try {
      setSubmitting(true)
      const response = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTransaction.id,
          amount,
          description,
          type: editForm.type
        })
      })

      if (response.ok) {
        const updated = await response.json()
        setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t))
        closeEditModal()
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const deleteTransaction = async (id: string) => {
    if (!user || !confirm('Are you sure you want to delete this transaction?')) return
    
    try {
      const response = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setTransactions(prev => prev.filter(t => t.id !== id))
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
    }
  }

  const netTotal = transactions.reduce((sum, transaction) => {
    return sum + (transaction.type === 'income' ? transaction.amount : -transaction.amount)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <Card className="bg-white border-gray-200 shadow-sm p-4 rounded-xl">
        <div className="flex items-center space-x-3">
          <Calendar className="h-5 w-5 text-slate-600" />
          <Label htmlFor="date-filter" className="text-sm font-medium text-slate-700">
            Date:
          </Label>
          <Input
            id="date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="max-w-xs bg-white border-gray-200"
          />
        </div>
      </Card>

      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Add Income */}
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-4 rounded-2xl">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Plus className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Add Income</h3>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="income-amount" className="text-sm">
                Amount
              </Label>
              <Input
                id="income-amount"
                type="number"
                placeholder="0.00"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                className="bg-white border-gray-200 text-sm"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="income-description" className="text-sm">
                Description (Optional)
              </Label>
              <Input
                id="income-description"
                placeholder="e.g., Gift, Tax refund, Bonus"
                value={incomeDescription}
                onChange={(e) => setIncomeDescription(e.target.value)}
                className="bg-white border-gray-200 text-sm"
                disabled={submitting}
              />
            </div>
            <Button
              onClick={() => addTransaction("income")}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2"
              disabled={!incomeAmount || submitting}
            >
              <Plus className="h-4 w-4 mr-2" />
              {submitting ? "Adding..." : "Add Income"}
            </Button>
          </div>
        </Card>

        {/* Add Expense */}
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-4 rounded-2xl">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <Minus className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Add Expense</h3>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="expense-amount" className="text-sm">
                Amount
              </Label>
              <Input
                id="expense-amount"
                type="number"
                placeholder="0.00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="bg-white border-gray-200 text-sm"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="expense-description" className="text-sm">
                Description (Optional)
              </Label>
              <Input
                id="expense-description"
                placeholder="e.g., Car repair, Tax payment, Medical bill"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                className="bg-white border-gray-200 text-sm"
                disabled={submitting}
              />
            </div>
            <Button
              onClick={() => addTransaction("expense")}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-sm py-2"
              disabled={!expenseAmount || submitting}
            >
              <Minus className="h-4 w-4 mr-2" />
              {submitting ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Transactions</h3>

        {transactionsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <p>No transactions for this date. Add your first transaction above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => {
              const time = new Date(`1970-01-01T${transaction.transaction_time}`).toLocaleTimeString([], { 
                hour: "2-digit", 
                minute: "2-digit" 
              })
              
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 group hover:shadow-sm transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        transaction.type === "income"
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <TrendingUp className="h-4 w-4 text-white" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{transaction.description}</p>
                      <p className="text-sm text-gray-600">{time}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div
                      className={`text-lg font-semibold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
                    >
                      {transaction.type === "income" ? "+" : "-"}${transaction.amount.toFixed(2)}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditModal(transaction)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTransaction(transaction.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {!transactionsLoading && (
          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Net Total</span>
            <span className={`text-lg font-semibold ${netTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netTotal >= 0 ? '+' : ''}${netTotal.toFixed(2)}
            </span>
          </div>
        )}
      </Card>

      {showEditModal && editingTransaction && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Edit Transaction</h3>
              <Button variant="ghost" size="sm" onClick={closeEditModal}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <select
                  id="edit-type"
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value as Transaction["type"] })}
                  className="w-full h-10 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              <div>
                <Label htmlFor="edit-amount">Amount</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  placeholder="0.00"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="bg-white border-gray-200"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Input
                  id="edit-description"
                  placeholder="Add details for context"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="bg-white border-gray-200"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={closeEditModal} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={updateTransaction}
                  disabled={submitting || !editForm.amount}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

