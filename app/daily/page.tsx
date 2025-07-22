"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { createTransaction, getTransactions, Transaction } from "@/lib/database"
import { Plus, Minus, DollarSign, TrendingUp, Target, TrendingDown } from "lucide-react"
import { Navbar } from "@/components/navbar"

export default function DailyInterface() {
  const { user, userSettings, loading } = useAuth()
  const router = useRouter()
  const [incomeAmount, setIncomeAmount] = useState("")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [incomeDescription, setIncomeDescription] = useState("")
  const [expenseDescription, setExpenseDescription] = useState("")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  // Fetch today's transactions
  useEffect(() => {
    async function fetchTransactions() {
      if (!user) return
      
      try {
        setTransactionsLoading(true)
        const today = new Date().toISOString().split('T')[0]
        const data = await getTransactions(user.id, today)
        setTransactions(data)
      } catch (error) {
        console.error('Error fetching transactions:', error)
      } finally {
        setTransactionsLoading(false)
      }
    }

    if (user) {
      fetchTransactions()
    }
  }, [user])

  // Show loading state
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const addTransaction = async (type: "income" | "expense") => {
    const amount = parseFloat(type === "income" ? incomeAmount : expenseAmount)
    const description = type === "income" ? incomeDescription : expenseDescription
    
    if (!amount || !description || !user) return
    
    try {
      setSubmitting(true)
      const newTransaction = await createTransaction({
        user_id: user.id,
        type,
        amount,
        description,
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_time: new Date().toTimeString().split(' ')[0]
      })
      
      setTransactions(prev => [newTransaction, ...prev])
      
      // Clear form
      if (type === "income") {
        setIncomeAmount("")
        setIncomeDescription("")
      } else {
        setExpenseAmount("")
        setExpenseDescription("")
      }
    } catch (error) {
      console.error('Error adding transaction:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const dailyGoal = userSettings?.daily_budget_target || 150
  const dailyTotal = transactions.reduce((sum, transaction) => {
    return sum + (transaction.type === 'income' ? transaction.amount : -transaction.amount)
  }, 0)
  
  const progressPercentage = Math.max(0, Math.min((dailyTotal / dailyGoal) * 100, 100))

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Today&apos;s Financial Activity</h1>
            <p className="text-gray-600">Track your daily income and expenses with ease</p>
          </div>

          {/* Daily Summary */}
          <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-8 rounded-3xl mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-800">${dailyTotal.toFixed(2)}</p>
                <p className="text-gray-600">Today&apos;s Total</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-800">${dailyGoal}</p>
                <p className="text-gray-600">Daily Goal</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress to Goal</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-blue-500 h-4 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </Card>

          {/* Input Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Add Income */}
            <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-4 rounded-2xl">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
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
                    Description
                  </Label>
                  <Input
                    id="income-description"
                    placeholder="e.g., Freelance work"
                    value={incomeDescription}
                    onChange={(e) => setIncomeDescription(e.target.value)}
                    className="bg-white border-gray-200 text-sm"
                    disabled={submitting}
                  />
                </div>
                <Button
                  onClick={() => addTransaction("income")}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm py-2"
                  disabled={!incomeAmount || !incomeDescription || submitting}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {submitting ? "Adding..." : "Add Income"}
                </Button>
              </div>
            </Card>

            {/* Add Expense */}
            <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-4 rounded-2xl">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
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
                    Description
                  </Label>
                  <Input
                    id="expense-description"
                    placeholder="e.g., Lunch, Transportation"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    className="bg-white border-gray-200 text-sm"
                    disabled={submitting}
                  />
                </div>
                <Button
                  onClick={() => addTransaction("expense")}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm py-2"
                  disabled={!expenseAmount || !expenseDescription || submitting}
                >
                  <Minus className="h-4 w-4 mr-2" />
                  {submitting ? "Adding..." : "Add Expense"}
                </Button>
              </div>
            </Card>
          </div>

          {/* Recent Entries */}
          <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Today&apos;s Entries</h3>

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
                <p>No transactions today. Add your first transaction above!</p>
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
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            transaction.type === "income"
                              ? "bg-gradient-to-r from-green-500 to-emerald-600"
                              : "bg-gradient-to-r from-red-500 to-pink-600"
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
                      <div
                        className={`text-lg font-semibold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
                      >
                        {transaction.type === "income" ? "+" : "-"}${transaction.amount.toFixed(2)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
