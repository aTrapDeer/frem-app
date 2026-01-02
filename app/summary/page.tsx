"use client"

import React, { useState, useRef, useEffect, Suspense } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useInView } from "framer-motion"
import { Calendar, DollarSign, Target, MapPin, X, CreditCard, TrendingUp, TrendingDown, CheckCircle2, Clock, AlertTriangle } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/contexts/auth-context"
import { AIFinancialReport } from "@/components/ai-financial-report"
import { FinancialAccounts } from "@/components/financial-accounts"
import { OneTimeIncomeManager } from "@/components/one-time-income"

const BubbleMap = React.lazy(() => import("@/components/bubble-map"))

interface Milestone {
  id: string
  title: string
  description: string | null
  target_amount: number | null
  current_amount: number
  category: string
  status: string
  deadline: string | null
}

interface UserFinancialData {
  income: number
  expenses: Array<{ name: string; amount: number }>
  goals: Array<{ title: string; current_amount: number; target_amount: number }>
  sideProjects: Array<{ name: string; current_monthly_earnings: number }>
}

interface GoalProjection {
  goalId: string
  title: string
  targetAmount: number
  currentAmount: number
  projectedAmount: number
  totalProjectedProgress: number
  progressPercentage: number
  monthlyAllocation: number
  urgencyScore: number
  originalDeadline: string
  projectedCompletionDate: string
  daysUntilProjectedCompletion: number
  isOnTrack: boolean
  daysAheadOrBehind: number
  status: 'on_track' | 'ahead' | 'behind' | 'at_risk' | 'completed'
  category: string
}

interface ProjectionSummary {
  goals: GoalProjection[]
  totalMonthlyIncome: number
  totalMonthlyExpenses: number
  monthlySurplus: number
  surplusAllocatedToGoals: number
  hasVariableIncome: boolean
  scenarios?: {
    conservative: GoalProjection[]
    expected: GoalProjection[]
    optimistic: GoalProjection[]
  }
}

interface Transaction {
  id: string
  type: string
  amount: number
  description?: string
  date?: string
}

export default function SummaryPage() {
  const { user, userSettings } = useAuth()
  const [showBubbleMap, setShowBubbleMap] = useState(false)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [financialData, setFinancialData] = useState<UserFinancialData | null>(null)
  const [targetData, setTargetData] = useState<{ dailyTarget: number; monthlyGoalObligations: number; monthlyRecurringTotal: number } | null>(null)
  const [incomeSummary, setIncomeSummary] = useState<{ totalMonthlyMid: number; hasCommissionIncome: boolean } | null>(null)
  const [projections, setProjections] = useState<ProjectionSummary | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const isTimelineInView = useInView(timelineRef, { once: true, margin: "-100px" })

  // Fetch user's actual milestones and financial data from API
  useEffect(() => {
    async function fetchData() {
      if (!user) return
      
      try {
        setLoading(true)
        
        // Fetch all user financial data from summary API and projections
        const [summaryRes, projectionsRes] = await Promise.all([
          fetch('/api/summary'),
          fetch('/api/projections')
        ])
        
        if (!summaryRes.ok) throw new Error('Failed to fetch summary data')
        
        const data = await summaryRes.json()
        const { 
          milestones: milestonesData, 
          goals: goalsData, 
          recurringExpenses: recurringExpensesData, 
          sideProjects: sideProjectsData, 
          transactions: recentTransactionsData, 
          targetCalculation, 
          incomeSummary: incomeSummaryData 
        } = data
        
        setMilestones(milestonesData)
        setTargetData(targetCalculation)
        setIncomeSummary(incomeSummaryData)
        
        if (projectionsRes.ok) {
          const projectionsData = await projectionsRes.json()
          setProjections(projectionsData)
        }
        
        // Calculate estimated monthly income from recent transactions
        const recentIncome = (recentTransactionsData as Transaction[])
          .filter((t: Transaction) => t.type === 'income')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0)
        
        // Estimate monthly income (rough calculation)
        const estimatedMonthlyIncome = recentIncome * 30 / Math.max(7, recentTransactionsData.length) || (userSettings?.daily_budget_target ? userSettings.daily_budget_target * 30 : 0)
        
        // Prepare financial data for journey map
        const userData: UserFinancialData = {
          income: estimatedMonthlyIncome,
          expenses: recurringExpensesData.map(expense => ({
            name: expense.name,
            amount: expense.amount
          })),
          goals: goalsData.map(goal => ({
            title: goal.title,
            current_amount: goal.current_amount,
            target_amount: goal.target_amount
          })),
          sideProjects: sideProjectsData.map(project => ({
            name: project.name,
            current_monthly_earnings: project.current_monthly_earnings
          }))
        }
        
        setFinancialData(userData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user, userSettings])

  // Calculate KPIs from actual user data
  const kpis = {
    totalMilestones: milestones.length,
    percentComplete: milestones.length > 0 
      ? milestones.filter(m => m.status === 'completed').length / milestones.length * 100 
      : 0,
    avgProgress: milestones.length > 0 
      ? milestones.reduce((sum, milestone) => {
          if (!milestone.target_amount) return sum
          return sum + (milestone.current_amount / milestone.target_amount * 100)
        }, 0) / milestones.length 
      : 0,
    // Financial health metrics from target calculation
    monthlyObligations: targetData?.totalMonthlyObligations || 0,
    monthlyIncome: targetData?.estimatedMonthlyIncome || 0,
    dailyTarget: targetData?.dailyTarget || 0,
    financialHealth: targetData ? (targetData.monthlySurplusDeficit >= 0 ? 'positive' : 'negative') : 'unknown',
    surplus: targetData?.monthlySurplusDeficit || 0,
    activeGoals: targetData?.activeGoalsCount || 0,
    recurringExpenses: targetData?.recurringExpensesCount || 0,
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      security: "from-green-500 to-emerald-600",
      debt: "from-red-500 to-pink-600",
      lifestyle: "from-purple-500 to-fuchsia-600",
      transportation: "from-blue-500 to-cyan-600",
      growth: "from-indigo-500 to-purple-600",
      investment: "from-yellow-500 to-orange-600",
      other: "from-gray-500 to-slate-600",
    }
    return colors[category as keyof typeof colors] || colors.other
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✓"
      case "in-progress":
        return "⏳"
      case "planned":
        return "📋"
      default:
        return "○"
    }
  }

  // Check if user has enough data for journey map
  const hasFinancialData = financialData && (
    financialData.expenses.length > 0 || 
    financialData.goals.length > 0 || 
    financialData.income > 0
  )

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Navbar />

      <main className="pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Financial Summary</h1>
            <p className="text-slate-600">Your complete financial journey at a glance</p>
          </motion.div>

          {/* KPI Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="glass-card card-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Milestones</CardTitle>
                  <Target className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-numbers text-slate-900">{kpis.totalMilestones}</div>
                  <p className="text-xs text-slate-600 flex items-center mt-1">
                    {milestones.filter(m => m.status === 'completed').length} completed
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="glass-card card-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Average Progress</CardTitle>
                  <Calendar className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-numbers text-slate-900">{Math.round(kpis.avgProgress)}%</div>
                  <div className="mt-2">
                    <Progress value={kpis.avgProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="glass-card card-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Completion Rate</CardTitle>
                  <DollarSign className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-numbers text-slate-900">{Math.round(kpis.percentComplete)}%</div>
                  <p className="text-xs text-slate-600 mt-1">
                    of your milestones achieved
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Financial KPIs */}
          {targetData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Monthly Income</CardTitle>
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-numbers text-slate-900">${kpis.monthlyIncome.toLocaleString()}</div>
                    <p className="text-xs text-slate-600 mt-1">
                      From all sources
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Monthly Obligations</CardTitle>
                    <CreditCard className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-numbers text-slate-900">${kpis.monthlyObligations.toLocaleString()}</div>
                    <p className="text-xs text-slate-600 mt-1">
                      Goals + expenses
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Monthly {kpis.surplus >= 0 ? 'Surplus' : 'Deficit'}</CardTitle>
                    {kpis.surplus >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold font-numbers ${kpis.surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {kpis.surplus >= 0 ? '+' : ''}${kpis.surplus.toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {kpis.surplus >= 0 ? 'Extra to invest' : 'Need more income'}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Daily Target</CardTitle>
                    <Target className="h-4 w-4 text-indigo-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-numbers text-slate-900">${kpis.dailyTarget.toFixed(0)}</div>
                    <p className="text-xs text-slate-600 mt-1">
                      To stay on track
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}

          {/* Financial Breakdown */}
          {targetData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mb-8"
            >
              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Smart Financial Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-slate-800 mb-3">Monthly Breakdown</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Goals ({targetData.activeGoalsCount}):</span>
                          <span className="font-medium text-blue-600">${targetData.monthlyGoalObligations.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Recurring Expenses ({targetData.recurringExpensesCount}):</span>
                          <span className="font-medium text-red-600">${targetData.monthlyRecurringTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="font-semibold text-slate-800">Total Monthly Need:</span>
                          <span className="font-semibold text-slate-800">${targetData.totalMonthlyObligations.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800 mb-3">
                        Income Sources
                        {incomeSummary?.hasCommissionIncome && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            Variable Income
                          </span>
                        )}
                      </h4>
                      <div className="space-y-2 text-sm">
                        {incomeSummary?.hasCommissionIncome ? (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">Conservative:</span>
                              <span className="font-medium text-red-500">${incomeSummary.totalMonthlyLow.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">Safe Average:</span>
                              <span className="font-medium text-green-600">${incomeSummary.totalMonthlyMid.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">Optimistic:</span>
                              <span className="font-medium text-blue-600">${incomeSummary.totalMonthlyHigh.toLocaleString()}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Primary Income:</span>
                            <span className="font-medium text-green-600">${(targetData.estimatedMonthlyIncome - targetData.monthlyProjectIncome).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-600">Side Projects:</span>
                          <span className="font-medium text-blue-600">${targetData.monthlyProjectIncome.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="font-semibold text-slate-800">Total Monthly Income:</span>
                          <span className="font-semibold text-slate-800">${targetData.estimatedMonthlyIncome.toLocaleString()}</span>
                        </div>
                        {incomeSummary?.hasCommissionIncome && (
                          <p className="text-xs text-slate-500 pt-2">
                            💡 Goals calculated using &quot;Safe Average&quot; for reliability
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {targetData.monthlySurplusDeficit !== 0 && (
                    <div className="mt-4 p-4 rounded-lg bg-slate-50 border">
                      <p className={`text-sm font-medium ${targetData.monthlySurplusDeficit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {targetData.monthlySurplusDeficit >= 0 ? '💚 Financial Health: Excellent' : '⚠️ Financial Health: Needs Attention'} 
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        {targetData.monthlySurplusDeficit >= 0 
                          ? `You have $${targetData.monthlySurplusDeficit.toLocaleString()}/month surplus. Consider increasing your goals or starting new investments.`
                          : `You need an additional $${Math.abs(targetData.monthlySurplusDeficit).toLocaleString()}/month income to comfortably meet your current financial obligations.`
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Bank Accounts & One-Time Income */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.82 }}
            >
              <FinancialAccounts />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.84 }}
            >
              <OneTimeIncomeManager />
            </motion.div>
          </div>

          {/* AI Financial Advisor Report */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.86 }}
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🤖</span> AI Financial Advisor
            </h2>
            <AIFinancialReport />
          </motion.div>

          {/* Goal Projection Timeline */}
          {projections && projections.goals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Goal Projection Timeline
                    </div>
                    {projections.hasVariableIncome && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                        Based on Safe Average Income
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projections.goals.map((goal, index) => {
                      const statusConfig = {
                        completed: { bg: 'bg-green-500', border: 'border-green-200', icon: CheckCircle2, label: 'Completed!' },
                        ahead: { bg: 'bg-blue-500', border: 'border-blue-200', icon: TrendingUp, label: `${goal.daysAheadOrBehind} days ahead` },
                        on_track: { bg: 'bg-green-500', border: 'border-green-200', icon: CheckCircle2, label: 'On Track' },
                        behind: { bg: 'bg-amber-500', border: 'border-amber-200', icon: Clock, label: `${Math.abs(goal.daysAheadOrBehind)} days behind` },
                        at_risk: { bg: 'bg-red-500', border: 'border-red-200', icon: AlertTriangle, label: 'At Risk' }
                      }
                      const config = statusConfig[goal.status]
                      const StatusIcon = config.icon
                      
                      return (
                        <motion.div
                          key={goal.goalId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`p-4 rounded-xl border ${config.border} bg-gradient-to-r from-white to-slate-50`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 ${config.bg} rounded-lg flex items-center justify-center`}>
                                  <StatusIcon className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-slate-900">{goal.title}</h4>
                                  <p className="text-xs text-slate-500 capitalize">{goal.category}</p>
                                </div>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              goal.status === 'completed' ? 'bg-green-100 text-green-700' :
                              goal.status === 'ahead' ? 'bg-blue-100 text-blue-700' :
                              goal.status === 'on_track' ? 'bg-green-100 text-green-700' :
                              goal.status === 'behind' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {config.label}
                            </span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-600">
                                ${goal.totalProjectedProgress.toLocaleString()} of ${goal.targetAmount.toLocaleString()}
                              </span>
                              <span className="font-semibold text-slate-900">{Math.round(goal.progressPercentage)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-500 ${config.bg}`}
                                style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
                              />
                            </div>
                          </div>
                          
                          {/* Timeline info */}
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">Monthly Allocation</p>
                              <p className="font-semibold text-green-600">+${goal.monthlyAllocation.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Original Deadline</p>
                              <p className="font-medium text-slate-900">
                                {new Date(goal.originalDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Projected Completion</p>
                              <p className={`font-semibold ${goal.isOnTrack ? 'text-green-600' : 'text-amber-600'}`}>
                                {new Date(goal.projectedCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                  
                  {projections.monthlySurplus > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-sm text-blue-700">
                        <strong>${projections.monthlySurplus.toLocaleString()}/month</strong> is being automatically allocated to your goals
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Bubble Map Toggle - Only show if user has data */}
          {hasFinancialData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center"
            >
              <Button
                onClick={() => setShowBubbleMap(true)}
                size="lg"
                className="bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white"
              >
                <MapPin className="mr-2 h-5 w-5" />
                Explore Your Financial Journey
              </Button>
              <p className="text-sm text-slate-600 mt-2">See exactly how today&apos;s decisions impact your future goals</p>
            </motion.div>
          )}

          {/* Milestone Timeline */}
          <div ref={timelineRef} className="space-y-8">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isTimelineInView ? 1 : 0, y: isTimelineInView ? 0 : 20 }}
              transition={{ duration: 0.6 }}
              className="text-3xl font-bold text-slate-900 text-center"
            >
              Your Financial Milestones
            </motion.h2>

            <div className="relative">
              {loading ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="glass-card">
                      <CardContent className="p-6">
                        <div className="animate-pulse">
                          <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                          <div className="h-8 bg-slate-200 rounded w-1/2 mb-4"></div>
                          <div className="h-2 bg-slate-200 rounded w-full"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : milestones.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Financial Milestones Yet</h3>
                  <p className="text-slate-600 mb-6">Create your first financial milestone to start tracking your progress.</p>
                  <div className="space-y-3">
                    <Button 
                      onClick={() => window.location.href = '/goals'}
                      className="bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white"
                    >
                      Create Your First Goal
                    </Button>
                    <div className="text-sm text-slate-500">
                      Or add some <a href="/daily" className="text-indigo-600 hover:underline">daily transactions</a> to get started
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {milestones.map((milestone, index) => (
                    <motion.div
                      key={milestone.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: isTimelineInView ? 1 : 0, x: isTimelineInView ? 0 : -20 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                    >
                      <Card className="glass-card card-lift">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <div className={`w-8 h-8 bg-gradient-to-r ${getCategoryColor(milestone.category)} rounded-lg flex items-center justify-center text-white text-sm font-bold`}>
                                  {getStatusIcon(milestone.status)}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">{milestone.title}</h3>
                              </div>
                              
                              <p className="text-slate-600 mb-4">{milestone.description}</p>
                              
                              {milestone.target_amount && (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Progress</span>
                                    <span className="font-medium text-slate-900">
                                      ${milestone.current_amount.toLocaleString()} / ${milestone.target_amount.toLocaleString()}
                                    </span>
                                  </div>
                                  <Progress value={(milestone.current_amount / milestone.target_amount) * 100} className="h-2" />
                                  <div className="flex justify-between text-sm text-slate-600">
                                    <span>{Math.round((milestone.current_amount / milestone.target_amount) * 100)}% complete</span>
                                    {milestone.deadline && (
                                      <span>Due {new Date(milestone.deadline).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 capitalize">
                              {milestone.status.replace('-', ' ')}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Bubble Map Modal - Only render if user has financial data */}
      {showBubbleMap && hasFinancialData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Financial Journey Map</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowBubbleMap(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 p-6">
              <Suspense
                fallback={<div className="flex items-center justify-center h-full">Loading visualization...</div>}
              >
                <BubbleMap userData={financialData} />
              </Suspense>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </AuthGuard>
  )
}
