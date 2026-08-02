"use client"

import React, { useState, useRef, useEffect, Suspense } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useInView } from "framer-motion"
import { DollarSign, Target, MapPin, X, CreditCard, TrendingUp, TrendingDown, CheckCircle2, Clock, AlertTriangle, ChevronLeft, ChevronRight, Calendar, Play, Rocket } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { PageHeader } from "@/components/page-header"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/contexts/auth-context"
import { AIFinancialReport } from "@/components/ai-financial-report"
import { LinkedAccountsCard } from "@/components/linked-accounts-card"

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

interface EntityView {
  income: { measured: number | null; plan: number }
  expenses: { measured: number | null; plan: number }
  surplus: { value: number; basis: 'measured' | 'plan'; monthsOfData: number }
}

type OverviewRange = '1w' | '1m' | '2m' | '3m' | '6m' | '1y'

interface FinancialOverview {
  netWorth: { net: number; accountCount: number }
  entities: { personal: EntityView; business: EntityView | null }
  hasBankData: boolean
  coverage?: { earliestTransaction: string | null; availableRanges: OverviewRange[] }
  window?: { range: OverviewRange; days: number; start: string; end: string; label: string }
}

interface MonthlyGoalProjection {
  goalId: string
  title: string
  category: string
  targetAmount: number
  projectedBalance: number
  monthlyAllocation: number
  progressPercentage: number
  status: 'active' | 'completed' | 'not_started' | 'at_risk'
  deadline: string
  startDate: string | null
  isCompletedThisMonth: boolean
  isStartingThisMonth: boolean
}

interface MonthlyProjection {
  month: string
  monthLabel: string
  activeGoals: MonthlyGoalProjection[]
  completedGoals: { goalId: string; title: string; completedInMonth: string }[]
  upcomingGoals: { goalId: string; title: string; startsInMonth: string }[]
  financials: {
    totalMonthlyIncome: number
    totalMonthlyExpenses: number
    monthlySurplus: number
    savingsRate: number
    totalAllocatedToGoals: number
  }
  summary: {
    activeGoalsCount: number
    completedGoalsCount: number
    upcomingGoalsCount: number
    totalGoalProgress: number
  }
}

interface RecurringExpense {
  id: string
  name: string
  amount: number
  category?: string
}

interface Goal {
  id: string
  title: string
  current_amount: number
  target_amount: number
  deadline?: string
  category?: string
}

interface SideProject {
  id: string
  name: string
  current_monthly_earnings: number
  description?: string
}

function BasisChip({ basis, monthsOfData, windowLabel }: { basis: 'measured' | 'plan'; monthsOfData: number; windowLabel?: string }) {
  if (basis === 'measured') {
    return <span className="text-[10px] font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">measured · {windowLabel ?? `${monthsOfData} mo`}</span>
  }

  return <span className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">planned</span>
}

const RANGE_OPTIONS: Array<{ key: OverviewRange; label: string }> = [
  { key: '1w', label: '1W' },
  { key: '1m', label: '1M' },
  { key: '2m', label: '2M' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
]

function RangePills({
  selected,
  available,
  onSelect,
}: {
  selected: OverviewRange
  available: OverviewRange[]
  onSelect: (range: OverviewRange) => void
}) {
  return (
    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-1">
      {RANGE_OPTIONS.map(option => {
        const enabled = available.includes(option.key)
        const active = selected === option.key
        return (
          <button
            key={option.key}
            type="button"
            disabled={!enabled}
            title={enabled ? undefined : "Sorry — we don't have transaction data for this full period yet"}
            onClick={() => onSelect(option.key)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              active
                ? 'bg-indigo-600 text-white'
                : enabled
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default function SummaryPage() {
  const { user, userSettings } = useAuth()
  const [showBubbleMap, setShowBubbleMap] = useState(false)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [financialData, setFinancialData] = useState<UserFinancialData | null>(null)
  const [targetData, setTargetData] = useState<{ 
    dailyTarget: number
    monthlyGoalObligations: number
    monthlyRecurringTotal: number
    totalMonthlyObligations: number
    estimatedMonthlyIncome: number
    monthlySurplusDeficit: number
    activeGoalsCount: number
    recurringExpensesCount: number
    monthlyProjectIncome: number
  } | null>(null)
  const [incomeSummary, setIncomeSummary] = useState<{ 
    totalMonthlyMid: number
    totalMonthlyLow: number
    totalMonthlyHigh: number
    hasCommissionIncome: boolean 
  } | null>(null)
  const [projections, setProjections] = useState<ProjectionSummary | null>(null)
  const [overview, setOverview] = useState<FinancialOverview | null>(null)
  const [selectedRange, setSelectedRange] = useState<OverviewRange>('3m')
  const [monthlyProjections, setMonthlyProjections] = useState<MonthlyProjection[]>([])
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0)
  const timelineRef = useRef<HTMLDivElement>(null)
  const isTimelineInView = useInView(timelineRef, { once: true, margin: "-100px" })

  const handleRangeSelect = async (range: OverviewRange) => {
    setSelectedRange(range)
    try {
      const response = await fetch(`/api/overview?range=${range}`)
      if (response.ok) setOverview(await response.json() as FinancialOverview)
    } catch {
      // Keep showing the current window on failure
    }
  }

  // Fetch user's actual milestones and financial data from API
  useEffect(() => {
    async function fetchData() {
      if (!user) return
      
      try {
        setLoading(true)
        
        // Fetch all user financial data from summary API and projections
        // Only fetch 12 months initially for faster load
        const [summaryRes, projectionsRes, monthlyRes, overviewRes] = await Promise.all([
          fetch('/api/summary'),
          fetch('/api/projections'),
          fetch('/api/projections/monthly?months=12'),
          fetch('/api/overview').catch(() => null)
        ])
        
        if (!summaryRes.ok) throw new Error('Failed to fetch summary data')
        
        const data = await summaryRes.json()
        const { 
          milestones: milestonesData, 
          goals: goalsData, 
          recurringExpenses: recurringExpensesData, 
          sideProjects: sideProjectsData, 
          targetCalculation, 
          incomeSummary: incomeSummaryData,
          oneTimeNet
        } = data
        
        setMilestones(milestonesData)
        setTargetData(targetCalculation)
        setIncomeSummary(incomeSummaryData)
        
        if (projectionsRes.ok) {
          const projectionsData = await projectionsRes.json()
          setProjections(projectionsData)
        }

        if (overviewRes?.ok) {
          const overviewData = await overviewRes.json() as FinancialOverview
          setOverview(overviewData)
        }
        
        if (monthlyRes.ok) {
          const monthlyData = await monthlyRes.json()
          console.log('Monthly projections loaded:', monthlyData)
          if (monthlyData.monthlyProjections && Array.isArray(monthlyData.monthlyProjections)) {
            setMonthlyProjections(monthlyData.monthlyProjections)
            console.log('Set monthly projections:', monthlyData.monthlyProjections.length, 'months')
          } else {
            console.error('Invalid monthly projections data:', monthlyData)
          }
        } else {
          console.error('Monthly projections fetch failed:', monthlyRes.status)
        }
        
        // Base monthly income from sources or daily target estimate
        const baseMonthlyIncome = incomeSummaryData?.totalMonthlyMid || targetCalculation?.estimatedMonthlyIncome || (userSettings?.daily_budget_target ? userSettings.daily_budget_target * 30 : 0)

        // Apply one-time net for the current month
        const estimatedMonthlyIncome = baseMonthlyIncome + (oneTimeNet || 0)
        
        // Prepare financial data for journey map
        const userData: UserFinancialData = {
          income: estimatedMonthlyIncome,
          expenses: (recurringExpensesData as RecurringExpense[]).map((expense: RecurringExpense) => ({
            name: expense.name,
            amount: expense.amount
          })),
          goals: (goalsData as Goal[]).map((goal: Goal) => ({
            title: goal.title,
            current_amount: goal.current_amount,
            target_amount: goal.target_amount
          })),
          sideProjects: (sideProjectsData as SideProject[]).map((project: SideProject) => ({
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

  // Get selected month data or fall back to current data
  const selectedMonth = monthlyProjections[selectedMonthIndex]
  
  // Calculate dynamic KPIs from selected month or actual user data
  const monthlyIncome = selectedMonth?.financials.totalMonthlyIncome || targetData?.estimatedMonthlyIncome || incomeSummary?.totalMonthlyMid || 0
  const monthlyExpenses = selectedMonth?.financials.totalMonthlyExpenses || targetData?.monthlyRecurringTotal || 0
  const monthlySurplus = selectedMonth?.financials.monthlySurplus || targetData?.monthlySurplusDeficit || (monthlyIncome - monthlyExpenses)
  const personalOverview = overview?.entities.personal
  const measuredIncome = personalOverview?.income.measured
  const measuredSavingsRate = personalOverview?.surplus.basis === 'measured' && measuredIncome !== null && measuredIncome !== undefined && measuredIncome > 0
    ? Math.round((personalOverview.surplus.value / measuredIncome) * 100)
    : null
  const hasMeasuredSavingsRate = measuredSavingsRate !== null
  const displayedMonthlyIncome = personalOverview?.income.measured ?? personalOverview?.income.plan ?? monthlyIncome
  const displayedMonthlySurplus = personalOverview?.surplus.value ?? monthlySurplus
  const plannedMonthlySurplus = personalOverview
    ? personalOverview.income.plan - personalOverview.expenses.plan
    : monthlySurplus
  
  // Calculate savings rate (percentage of income saved/available after expenses)
  const savingsRate = measuredSavingsRate ?? (selectedMonth?.financials.savingsRate || (monthlyIncome > 0 ? Math.round((monthlySurplus / monthlyIncome) * 100) : 0))
  
  // Calculate average goal progress from selected month or projections
  const goalProgress = selectedMonth?.summary.totalGoalProgress 
    || (projections?.goals && projections.goals.length > 0
    ? Math.round(projections.goals.reduce((sum, g) => sum + g.progressPercentage, 0) / projections.goals.length)
    : financialData?.goals && financialData.goals.length > 0
      ? Math.round(financialData.goals.reduce((sum, g) => sum + (g.current_amount / g.target_amount * 100), 0) / financialData.goals.length)
        : 0)
  
  // Calculate months until goals complete (average)
  const avgMonthsToGoals = projections?.goals && projections.goals.length > 0
    ? Math.round(projections.goals.reduce((sum, g) => sum + (g.daysUntilProjectedCompletion / 30), 0) / projections.goals.length)
    : 0

  const kpis = {
    // Dynamic metrics based on selected month
    savingsRate,
    goalProgress,
    monthlySurplus: displayedMonthlySurplus,
    avgMonthsToGoals,
    // Financial health metrics from target calculation
    // Obligations = goal requirements + recurring expenses, always from the
    // daily-target calculation. The previous fallback chain grabbed
    // totalAllocatedToGoals — the SURPLUS allocated to goals — whenever a month
    // was selected, so "Obligations" and "Surplus" rendered the same number
    // with different labels.
    monthlyObligations: targetData?.totalMonthlyObligations || 0,
    monthlyIncome: displayedMonthlyIncome,
    dailyTarget: targetData?.dailyTarget || 0,
    financialHealth: displayedMonthlySurplus >= 0 ? 'positive' : 'negative',
    surplus: displayedMonthlySurplus,
    activeGoals: selectedMonth?.summary.activeGoalsCount || targetData?.activeGoalsCount || 0,
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
      <div className="app-surface">
        <Navbar />

      <main className="pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <PageHeader
              title="Summary"
              subtitle="The whole picture — measured where we have transactions, planned where we don't."
              actions={
                overview?.coverage && overview.coverage.availableRanges.length > 0 ? (
                  <RangePills
                    selected={selectedRange}
                    available={overview.coverage.availableRanges}
                    onSelect={handleRangeSelect}
                  />
                ) : undefined
              }
            />
          </motion.div>

          {/* Month Navigation */}
          {monthlyProjections.length > 0 && (
            <div className="relative z-10">
              <Card className="app-card">
                <CardContent className="p-3 sm:p-4">
                  {/* Mobile Layout */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-slate-600">Viewing projections for</p>
                        <p className="text-base sm:text-lg font-bold text-slate-900 truncate">
                          {monthlyProjections[selectedMonthIndex]?.monthLabel || 'Current Month'}
                          {selectedMonthIndex === 0 && (
                            <span className="ml-2 text-xs font-normal bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {/* Navigation Controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 relative z-20">
                      <button
                        type="button"
                        aria-label="Previous month"
                        onClick={() => {
                          console.log('Prev button clicked!')
                          setSelectedMonthIndex(prev => Math.max(0, prev - 1))
                        }}
                        disabled={selectedMonthIndex === 0}
                        className="h-9 w-9 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer select-none"
                        style={{ pointerEvents: 'auto' }}
                      >
                        <ChevronLeft className="h-4 w-4 pointer-events-none" />
                      </button>
                      
                      {/* Month indicator - hidden on mobile, shown on sm+ */}
                      <div className="hidden sm:flex items-center gap-1 px-2">
                        {monthlyProjections.slice(0, Math.min(6, monthlyProjections.length)).map((_, idx) => (
                          <button
                            type="button"
                            key={idx}
                            aria-label={`Go to month ${idx + 1}`}
                            onClick={() => {
                              console.log('Dot clicked:', idx)
                              setSelectedMonthIndex(idx)
                            }}
                            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                              idx === selectedMonthIndex 
                                ? 'bg-indigo-600 w-3' 
                                : 'bg-slate-300 hover:bg-slate-400'
                            }`}
                            style={{ pointerEvents: 'auto' }}
                          />
                        ))}
                        {monthlyProjections.length > 6 && (
                          <span className="text-xs text-slate-500 ml-1">...</span>
                        )}
                      </div>
                      
                      {/* Month counter for mobile */}
                      <span className="sm:hidden text-sm font-medium text-slate-600 min-w-[50px] text-center">
                        {selectedMonthIndex + 1}/{monthlyProjections.length}
                      </span>
                      
                      <button
                        type="button"
                        aria-label="Next month"
                        onClick={() => {
                          console.log('Next button clicked!')
                          setSelectedMonthIndex(prev => Math.min(monthlyProjections.length - 1, prev + 1))
                        }}
                        disabled={selectedMonthIndex >= monthlyProjections.length - 1}
                        className="h-9 w-9 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer select-none"
                        style={{ pointerEvents: 'auto' }}
                      >
                        <ChevronRight className="h-4 w-4 pointer-events-none" />
                      </button>
                      
                      {selectedMonthIndex !== 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            console.log('Reset clicked!')
                            setSelectedMonthIndex(0)
                          }}
                          className="text-indigo-600 text-xs sm:text-sm px-2 sm:px-3 hover:underline cursor-pointer"
                          style={{ pointerEvents: 'auto' }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Month quick stats — one quiet row, values carry the weight */}
                  {monthlyProjections[selectedMonthIndex] && (
                    <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-indigo-100">
                      {[
                        { value: monthlyProjections[selectedMonthIndex].summary.activeGoalsCount, label: 'active goals', accent: true },
                        { value: monthlyProjections[selectedMonthIndex].summary.completedGoalsCount, label: 'done' },
                        { value: monthlyProjections[selectedMonthIndex].summary.upcomingGoalsCount, label: 'upcoming' },
                        { value: `${Math.round(monthlyProjections[selectedMonthIndex].summary.totalGoalProgress)}%`, label: 'projected progress' },
                      ].map(stat => (
                        <span key={stat.label} className="flex items-baseline gap-1.5">
                          <span className={`text-xl sm:text-2xl font-bold tabular-nums ${stat.accent ? 'text-indigo-600' : 'text-slate-900'}`}>
                            {stat.value}
                          </span>
                          <span className="text-xs text-slate-500">{stat.label}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* KPI Strip - Dynamic metrics based on selected month */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              key={`savings-${selectedMonthIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="glass-card card-lift h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Savings Rate <span className="text-xs font-normal text-slate-400">· personal</span> {selectedMonth && selectedMonthIndex > 0 && <span className="text-xs text-indigo-500">({selectedMonth.monthLabel})</span>}
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 text-2xl font-bold font-numbers ${kpis.savingsRate >= 20 ? 'text-green-600' : kpis.savingsRate >= 10 ? 'text-amber-600' : kpis.savingsRate >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                    <span>{kpis.savingsRate}%</span>
                    {personalOverview && (
                      <BasisChip
                        basis={hasMeasuredSavingsRate ? 'measured' : 'plan'}
                        monthsOfData={personalOverview.surplus.monthsOfData} windowLabel={overview?.window?.label}
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 flex items-center mt-1">
                    {kpis.savingsRate >= 20 ? 'Strong share of income saved' : kpis.savingsRate >= 10 ? 'Good share of income saved' : kpis.savingsRate >= 0 ? 'Low share of income saved' : 'Spending exceeds income'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              key={`progress-${selectedMonthIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card className="glass-card card-lift h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Goal Progress {selectedMonth && selectedMonthIndex > 0 && <span className="text-xs text-indigo-500">({selectedMonth.monthLabel})</span>}
                  </CardTitle>
                  <Target className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-numbers text-slate-900">{Math.round(kpis.goalProgress)}%</div>
                  <div className="mt-2">
                    <Progress value={kpis.goalProgress} className="h-2" />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    avg across {kpis.activeGoals || projections?.goals?.length || 0} {selectedMonth && selectedMonthIndex > 0 ? 'active' : ''} goals
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              key={`surplus-${selectedMonthIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card className="glass-card card-lift h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Monthly Surplus <span className="text-xs font-normal text-slate-400">· personal</span> {selectedMonth && selectedMonthIndex > 0 && <span className="text-xs text-indigo-500">({selectedMonth.monthLabel})</span>}
                  </CardTitle>
                  <DollarSign className={`h-4 w-4 ${kpis.monthlySurplus >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </CardHeader>
                <CardContent>
                  <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 text-2xl font-bold font-numbers ${kpis.monthlySurplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <span>{kpis.monthlySurplus >= 0 ? '+' : ''}${Math.abs(Math.round(kpis.monthlySurplus)).toLocaleString()}</span>
                    {personalOverview && (
                      <BasisChip basis={personalOverview.surplus.basis} monthsOfData={personalOverview.surplus.monthsOfData} windowLabel={overview?.window?.label} />
                    )}
                  </div>
                  {personalOverview?.surplus.basis === 'measured' && (
                    <p className="text-xs text-slate-500 mt-1">
                      planned {plannedMonthlySurplus >= 0 ? '+' : ''}${Math.abs(Math.round(plannedMonthlySurplus)).toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 mt-1">
                    {personalOverview?.surplus.basis === 'measured' && kpis.monthlySurplus < 0
                      ? 'Spending more than you earn'
                      : selectedMonth && selectedMonthIndex > 0
                      ? `allocated to ${kpis.activeGoals} goals`
                      : kpis.avgMonthsToGoals > 0 ? `~${kpis.avgMonthsToGoals} mo to goals` : 'after expenses'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Financial KPIs */}
          {targetData && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="app-card card-lift-sm h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">Monthly Income <span className="text-xs font-normal text-slate-400">· personal</span></CardTitle>
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-2xl font-bold font-numbers text-slate-900">
                      <span>${kpis.monthlyIncome.toLocaleString()}</span>
                      {personalOverview && (
                        <BasisChip
                          basis={personalOverview.income.measured !== null ? 'measured' : 'plan'}
                          monthsOfData={personalOverview.surplus.monthsOfData} windowLabel={overview?.window?.label}
                        />
                      )}
                    </div>
                    {personalOverview?.income.measured !== null && personalOverview?.income.measured !== undefined && (
                      <p className="text-xs text-slate-500 mt-1">planned ${personalOverview.income.plan.toLocaleString()}</p>
                    )}
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
                <Card className="app-card card-lift-sm h-full">
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
                <Card className="app-card card-lift-sm h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">{personalOverview ? <>Monthly Surplus <span className="text-xs font-normal text-slate-400">· personal</span></> : `Monthly ${kpis.surplus >= 0 ? 'Surplus' : 'Deficit'}`}</CardTitle>
                    {kpis.surplus >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                  </CardHeader>
                  <CardContent>
                    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 text-2xl font-bold font-numbers ${kpis.surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span>{kpis.surplus >= 0 ? '+' : ''}${Math.abs(Math.round(kpis.surplus)).toLocaleString()}</span>
                      {personalOverview && (
                        <BasisChip basis={personalOverview.surplus.basis} monthsOfData={personalOverview.surplus.monthsOfData} windowLabel={overview?.window?.label} />
                      )}
                    </div>
                    {personalOverview?.surplus.basis === 'measured' && (
                      <p className="text-xs text-slate-500 mt-1">
                        planned {plannedMonthlySurplus >= 0 ? '+' : ''}${Math.abs(Math.round(plannedMonthlySurplus)).toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 mt-1">
                      {personalOverview?.surplus.basis === 'measured' && kpis.surplus < 0
                        ? 'Spending more than you earn'
                        : kpis.surplus >= 0 ? 'Extra to invest' : 'Need more income'}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <Card className="app-card card-lift-sm h-full">
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

              {overview?.hasBankData && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                >
                  <Card className="app-card card-lift-sm h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600">Net (linked accounts)</CardTitle>
                      <CreditCard className="h-4 w-4 text-slate-600" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold font-numbers ${overview.netWorth.net >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                        {overview.netWorth.net >= 0 ? '' : '-'}${Math.abs(Math.round(overview.netWorth.net)).toLocaleString()}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {overview.netWorth.accountCount} linked {overview.netWorth.accountCount === 1 ? 'account' : 'accounts'}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
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
                  <h3 className="text-lg font-semibold text-slate-900 mb-5">Where you stand</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                    {/* Measured reality, per ledger */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-2">
                        Personal
                        {personalOverview?.surplus.basis === 'measured' && (
                          <BasisChip basis="measured" monthsOfData={personalOverview.surplus.monthsOfData} windowLabel={overview?.window?.label} />
                        )}
                      </h4>
                      <div className="space-y-2 text-sm tabular-nums">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Income</span>
                          <span className="font-medium text-slate-900">
                            ${Math.round(personalOverview?.income.measured ?? personalOverview?.income.plan ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Spending</span>
                          <span className="font-medium text-slate-900">
                            ${Math.round(personalOverview?.expenses.measured ?? personalOverview?.expenses.plan ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="font-semibold text-slate-800">Surplus</span>
                          <span className={`font-semibold ${(personalOverview?.surplus.value ?? 0) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                            {(personalOverview?.surplus.value ?? 0) < 0 ? '−' : '+'}$
                            {Math.abs(Math.round(personalOverview?.surplus.value ?? 0)).toLocaleString()}/mo
                          </span>
                        </div>
                      </div>

                      {overview?.entities.business && (
                        <div className="mt-5">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-purple-600 mb-3 flex items-center gap-2">
                            Business
                            {overview.entities.business.surplus.basis === 'measured' && (
                              <BasisChip basis="measured" monthsOfData={overview.entities.business.surplus.monthsOfData} windowLabel={overview.window?.label} />
                            )}
                          </h4>
                          <div className="space-y-2 text-sm tabular-nums">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Income</span>
                              <span className="font-medium text-slate-900">
                                ${Math.round(overview.entities.business.income.measured ?? 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Spending</span>
                              <span className="font-medium text-slate-900">
                                ${Math.round(overview.entities.business.expenses.measured ?? 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-200">
                              <span className="font-semibold text-slate-800">Surplus</span>
                              <span className={`font-semibold ${overview.entities.business.surplus.value < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                {overview.entities.business.surplus.value < 0 ? '−' : '+'}$
                                {Math.abs(Math.round(overview.entities.business.surplus.value)).toLocaleString()}/mo
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* What the plan asks for */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-2">
                        The plan asks
                        <BasisChip basis="plan" monthsOfData={0} />
                      </h4>
                      <div className="space-y-2 text-sm tabular-nums">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Goals ({targetData.activeGoalsCount})</span>
                          <span className="font-medium text-slate-900">${targetData.monthlyGoalObligations.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Monthly bills ({targetData.recurringExpensesCount})</span>
                          <span className="font-medium text-slate-900">${targetData.monthlyRecurringTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="font-semibold text-slate-800">Total monthly need</span>
                          <span className="font-semibold text-slate-800">${targetData.totalMonthlyObligations.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-400 pt-1 leading-relaxed">
                          Bills come from your Plan (wizard or Money → Plan). Goal amounts are
                          each goal&apos;s required monthly pace.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* The verdict, from measured money — never from the plan */}
                  {personalOverview?.surplus.basis === 'measured' && (
                    <div
                      className={`mt-6 p-4 rounded-lg border-l-4 ${
                        personalOverview.surplus.value >= targetData.totalMonthlyObligations
                          ? 'border-l-emerald-500 bg-emerald-50/50'
                          : personalOverview.surplus.value >= 0
                            ? 'border-l-amber-500 bg-amber-50/50'
                            : 'border-l-red-500 bg-red-50/50'
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-900">
                        {personalOverview.surplus.value >= targetData.totalMonthlyObligations
                          ? 'Your measured surplus covers the whole plan.'
                          : personalOverview.surplus.value >= 0
                            ? `Measured surplus is $${Math.round(personalOverview.surplus.value).toLocaleString()}/mo — the plan asks for $${targetData.totalMonthlyObligations.toLocaleString()}.`
                            : 'You are spending more than you earn on the personal side.'}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        {personalOverview.surplus.value >= targetData.totalMonthlyObligations
                          ? 'Room to raise a goal, shorten a deadline, or build the cushion.'
                          : personalOverview.surplus.value >= 0
                            ? 'Close the gap by trimming the plan, extending deadlines, or raising owner pay — the goals page can walk through the levers.'
                            : overview?.entities.business
                              ? 'Business surplus exists but only reaches you through owner pay — review your pay level, or trim personal spending.'
                              : 'Start with the biggest category gap on the Money page.'}
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
              <LinkedAccountsCard />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.84 }}
            >
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
            {selectedMonthIndex > 0 && selectedMonth && (
              <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <p className="text-sm text-indigo-700">
                  📊 <strong>Note:</strong> The AI report below analyzes your overall financial health. 
                  For {selectedMonth.monthLabel} projections, see the time-based goals section above 
                  showing {selectedMonth.summary.activeGoalsCount} active goals with ${selectedMonth.financials.monthlySurplus.toLocaleString()} surplus.
                </p>
              </div>
            )}
            <AIFinancialReport />
          </motion.div>

          {/* Monthly Goal Projections - Time-bound view */}
          {loading && monthlyProjections.length === 0 && (
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-24 bg-slate-100 rounded"></div>
                  <div className="h-24 bg-slate-100 rounded"></div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {selectedMonth && (selectedMonth.activeGoals.length > 0 || selectedMonth.completedGoals.length > 0 || selectedMonth.upcomingGoals.length > 0) && (
            <motion.div
              key={selectedMonthIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Goals for {selectedMonth.monthLabel}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedMonthIndex > 0 && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                          {selectedMonthIndex} month{selectedMonthIndex > 1 ? 's' : ''} ahead
                        </span>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Goals starting this month */}
                  {selectedMonth.activeGoals.filter(g => g.isStartingThisMonth).length > 0 && (
                    <div className="mb-4 sm:mb-6">
                      <h4 className="text-xs sm:text-sm font-semibold text-indigo-600 mb-2 sm:mb-3 flex items-center gap-2">
                        <Rocket className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Starting This Month
                      </h4>
                      <div className="space-y-2">
                        {selectedMonth.activeGoals.filter(g => g.isStartingThisMonth).map(goal => (
                          <div key={goal.goalId} className="p-2.5 sm:p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600 flex-shrink-0" />
                                <span className="font-medium text-slate-900 text-sm truncate">{goal.title}</span>
                              </div>
                              <span className="text-xs sm:text-sm text-indigo-600 font-medium flex-shrink-0">
                                ${goal.targetAmount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Goals completing this month */}
                  {selectedMonth.activeGoals.filter(g => g.isCompletedThisMonth).length > 0 && (
                    <div className="mb-4 sm:mb-6">
                      <h4 className="text-xs sm:text-sm font-semibold text-green-600 mb-2 sm:mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Completing This Month 🎉
                      </h4>
                      <div className="space-y-2">
                        {selectedMonth.activeGoals.filter(g => g.isCompletedThisMonth).map(goal => (
                          <div key={goal.goalId} className="p-2.5 sm:p-3 bg-green-50 rounded-lg border border-green-100">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                                <span className="font-medium text-slate-900 text-sm truncate">{goal.title}</span>
                              </div>
                              <span className="text-xs sm:text-sm text-green-600 font-medium flex-shrink-0">
                                ${goal.targetAmount.toLocaleString()} ✓
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Goals */}
                  {selectedMonth.activeGoals.filter(g => !g.isStartingThisMonth && !g.isCompletedThisMonth).length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Active Goals ({selectedMonth.activeGoals.filter(g => !g.isStartingThisMonth && !g.isCompletedThisMonth).length})
                      </h4>
                      {selectedMonth.activeGoals.filter(g => !g.isStartingThisMonth && !g.isCompletedThisMonth).map((goal, index) => {
                        const statusConfig = {
                          active: { bg: 'bg-blue-500', border: 'border-blue-200', icon: TrendingUp },
                          completed: { bg: 'bg-green-500', border: 'border-green-200', icon: CheckCircle2 },
                          not_started: { bg: 'bg-slate-400', border: 'border-slate-200', icon: Clock },
                          at_risk: { bg: 'bg-red-500', border: 'border-red-200', icon: AlertTriangle }
                        }
                        const config = statusConfig[goal.status]
                        const StatusIcon = config.icon
                        
                        return (
                          <motion.div
                            key={goal.goalId}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`p-3 sm:p-4 rounded-xl border ${config.border} bg-gradient-to-r from-white to-slate-50`}
                          >
                            <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-7 h-7 sm:w-8 sm:h-8 ${config.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                  <StatusIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-slate-900 text-sm sm:text-base truncate">{goal.title}</h4>
                                  <p className="text-xs text-slate-500 capitalize">{goal.category}</p>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                                goal.status === 'completed' ? 'bg-green-100 text-green-700' :
                                goal.status === 'at_risk' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {goal.status === 'at_risk' ? 'Risk' : 'Active'}
                              </span>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="mb-2 sm:mb-3">
                              <div className="flex justify-between text-xs sm:text-sm mb-1">
                                <span className="text-slate-600 truncate">
                                  ${goal.projectedBalance.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                                </span>
                                <span className="font-semibold text-slate-900 ml-2">{Math.round(goal.progressPercentage)}%</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 sm:h-2">
                                <div 
                                  className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 ${config.bg}`}
                                  style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
                                />
                              </div>
                            </div>
                            
                            {/* Allocation info - responsive */}
                            <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                              <div>
                                <p className="text-slate-500 truncate">Monthly</p>
                                <p className="font-semibold text-green-600">+${goal.monthlyAllocation.toLocaleString()}</p>
                              </div>
                              <div className="text-right sm:text-left">
                                <p className="text-slate-500">Due</p>
                                <p className="font-medium text-slate-900">
                                  {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}

                  {/* Upcoming Goals */}
                  {selectedMonth.upcomingGoals.length > 0 && (
                    <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-200">
                      <h4 className="text-xs sm:text-sm font-semibold text-amber-600 mb-2 sm:mb-3 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Not Yet Started
                      </h4>
                      <div className="space-y-2">
                        {selectedMonth.upcomingGoals.map(goal => (
                          <div key={goal.goalId} className="p-2.5 sm:p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-slate-700 text-sm truncate">{goal.title}</span>
                              <span className="text-xs text-amber-700 flex-shrink-0">{goal.startsInMonth}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previously Completed */}
                  {selectedMonth.completedGoals.length > 0 && (
                    <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-200">
                      <h4 className="text-xs sm:text-sm font-semibold text-green-600 mb-2 sm:mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Already Completed
                      </h4>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {selectedMonth.completedGoals.map(goal => (
                          <span key={goal.goalId} className="px-2 sm:px-3 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm">
                            ✓ {goal.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Surplus allocation */}
                  {selectedMonth.financials.monthlySurplus > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-sm text-blue-700">
                        <strong>${selectedMonth.financials.totalAllocatedToGoals.toLocaleString()}</strong> allocated to goals in {selectedMonth.monthLabel}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Fallback: Overall Goal Projection Timeline (when no monthly data) */}
          {!selectedMonth && projections && projections.goals.length > 0 && (
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
                      Or add some <a href="/recurring" className="text-indigo-600 hover:underline">one-time transactions</a> to get started
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
                      <Card className="glass-card card-lift h-full">
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
