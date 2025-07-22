"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, DollarSign, Plus, Edit, Trash2, RefreshCw } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"

export default function RecurringExpenses() {
  const [expenses] = useState<any[]>([]) // Empty - users will add their own expenses

  const [newExpense, setNewExpense] = useState({
    name: "",
    amount: "",
    category: "",
    dueDate: "",
  })



  const totalMonthly = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const dailyImpact = totalMonthly / 30

  const categories = ["Housing", "Utilities", "Entertainment", "Health", "Transportation", "Food", "Other"]

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
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Recurring Monthly Expenses</h1>
            <p className="text-gray-600">Manage your monthly subscriptions and recurring costs</p>
          </div>

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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Expenses List */}
            <div className="lg:col-span-2">
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6 rounded-2xl">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">Monthly Expenses</h3>

                <div className="space-y-4">
                  {expenses.length === 0 ? (
                    <div className="text-center py-12">
                      <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">No Recurring Expenses</h3>
                      <p className="text-slate-600">Add your monthly subscriptions and bills to track them.</p>
                    </div>
                  ) : (
                    expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200"
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
                              Due: {expense.dueDate}
                              {expense.dueDate === 1
                                ? "st"
                                : expense.dueDate === 2
                                  ? "nd"
                                  : expense.dueDate === 3
                                    ? "rd"
                                    : "th"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-800">${expense.amount}</p>
                          <p className="text-sm text-gray-600">/month</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-indigo-200 text-indigo-600 bg-transparent"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-200 text-red-600 bg-transparent">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    ))
                  )}
                </div>
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
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
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

                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AuthGuard>
  )
}
