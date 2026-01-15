"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { formatCurrency } from "@/lib/utils"
import { DollarSign, Target, CreditCard, Zap, TrendingUp, Calendar, CheckCircle2, AlertTriangle, Clock, Gauge, Sparkles, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface DashboardData {
  dailyTotal: number
  goalProgress: number
  monthlyRecurringTotal: number
  monthlyProjectIncome: number
  transactionCount: number
  activeGoalsCount: number
  activeSideProjectsCount: number
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
}

interface KPICardProps {
  title: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  current: number
  target?: number
  isPercentage?: boolean
  index: number
}

interface QuickStatCardProps {
  title: string
  value: string | number
  index: number
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [projections, setProjections] = useState<ProjectionSummary | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  // Fetch dashboard data and projections from API
  useEffect(() => {
    async function fetchDashboard() {
      if (!user) return
      
      try {
        setDataLoading(true)
        const [dashboardRes, projectionsRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/projections')
        ])
        
        if (dashboardRes.ok) {
          const data = await dashboardRes.json()
          setDashboardData(data)
        }
        
        if (projectionsRes.ok) {
          const projectionsData = await projectionsRes.json()
          setProjections(projectionsData)
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setDataLoading(false)
      }
    }

    if (user) {
      fetchDashboard()
    }
  }, [user])

  // Show loading state
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
            <p className="text-slate-600">Welcome back! Here&apos;s your financial overview.</p>
          </motion.div>

          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="glass-card">
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                      <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* KPI Cards */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GoalLikelihoodCard projections={projections} index={0} />
              <FinancialRunwayCard projections={projections} index={1} />
              <KPICard
                title="Monthly Expenses"
                icon={CreditCard}
                current={dashboardData?.monthlyRecurringTotal || 0}
                index={2}
              />
            </div>
          )}

          {/* Goal Projections Summary */}
          {projections && projections.goals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <span>Goal Projections</span>
                      {projections.hasVariableIncome && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          Variable Income
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-500">Monthly Surplus</div>
                      <div className="text-lg font-bold text-green-600">+{formatCurrency(projections.monthlySurplus)}</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {projections.goals.slice(0, 3).map((goal) => {
                      const statusConfig = {
                        completed: { bg: 'bg-green-500', icon: CheckCircle2, color: 'text-green-600' },
                        ahead: { bg: 'bg-blue-500', icon: TrendingUp, color: 'text-blue-600' },
                        on_track: { bg: 'bg-green-500', icon: CheckCircle2, color: 'text-green-600' },
                        behind: { bg: 'bg-amber-500', icon: Clock, color: 'text-amber-600' },
                        at_risk: { bg: 'bg-red-500', icon: AlertTriangle, color: 'text-red-600' }
                      }
                      const config = statusConfig[goal.status]
                      const StatusIcon = config.icon
                      
                      return (
                        <div key={goal.goalId} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 ${config.bg} rounded-full flex items-center justify-center`}>
                              <StatusIcon className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{goal.title}</div>
                              <div className="text-xs text-slate-500">
                                {formatCurrency(goal.totalProjectedProgress)} / {formatCurrency(goal.targetAmount)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold ${config.color}`}>
                              {Math.round(goal.progressPercentage)}%
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(goal.projectedCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {projections.goals.length > 3 && (
                    <Button
                      variant="ghost"
                      className="w-full mt-3 text-blue-600"
                      onClick={() => router.push('/goals')}
                    >
                      View all {projections.goals.length} goals →
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <QuickStatCard
              title="Today's Transactions"
              value={dashboardData?.transactionCount || 0}
              index={0}
            />
            <QuickStatCard
              title="Active Goals"
              value={dashboardData?.activeGoalsCount || 0}
              index={1}
            />
            <QuickStatCard
              title="Monthly Income"
              value={formatCurrency(projections?.totalMonthlyIncome || 0)}
              index={2}
            />
            <QuickStatCard
              title="Monthly Expenses"
              value={formatCurrency(projections?.totalMonthlyExpenses || 0)}
              index={3}
            />
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="glass-card card-lift">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => router.push('/recurring')}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent"
                  >
                    <DollarSign className="h-6 w-6 text-green-600" />
                    <div className="text-center">
                      <div className="font-semibold">Add Transaction</div>
                      <div className="text-xs text-slate-600">One-time income or expense</div>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => router.push('/goals')}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent"
                  >
                    <Target className="h-6 w-6 text-blue-600" />
                    <div className="text-center">
                      <div className="font-semibold">Update Goals</div>
                      <div className="text-xs text-slate-600">Track your progress</div>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => router.push('/recurring')}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent"
                  >
                    <CreditCard className="h-6 w-6 text-cyan-600" />
                    <div className="text-center">
                      <div className="font-semibold">Manage Budget</div>
                      <div className="text-xs text-slate-600">Income & expenses</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  )
}

function KPICard({ title, icon: Icon, current, target, isPercentage, index }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <Card className="glass-card card-lift">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
          <Icon className="h-4 w-4 text-slate-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-numbers text-slate-900">
            <CountUpNumber value={current} isPercentage={isPercentage} />
            {target && <span className="text-lg text-slate-500">/{formatCurrency(target)}</span>}
          </div>

          {target && !isPercentage && (
            <div className="mt-2">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((current / target) * 100, 100)}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="bg-blue-600 h-2 rounded-full"
                />
              </div>
              <p className="text-xs text-slate-600 mt-1">{Math.round((current / target) * 100)}% of target</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function QuickStatCard({ title, value, index }: QuickStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 + index * 0.05 }}
    >
      <Card className="glass-card p-4 text-center">
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-600">{title}</div>
      </Card>
    </motion.div>
  )
}

function CountUpNumber({ value, isPercentage }: { value: number; isPercentage?: boolean }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 1000
    const increment = value / (duration / 16)
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value])

  if (isPercentage) {
    return <span>{Math.round(displayValue)}%</span>
  }

  return <span>{formatCurrency(displayValue)}</span>
}

// Goal Success Likelihood Card
function GoalLikelihoodCard({ projections, index }: { projections: ProjectionSummary | null, index: number }) {
  // Calculate likelihood based on goal statuses
  const calculateLikelihood = () => {
    if (!projections || projections.goals.length === 0) {
      return { percentage: 0, label: 'No Goals', color: 'slate', trend: 'neutral' as const }
    }

    const statusWeights = {
      completed: 100,
      ahead: 95,
      on_track: 85,
      behind: 50,
      at_risk: 20
    }

    const totalWeight = projections.goals.reduce((sum, goal) => {
      return sum + statusWeights[goal.status]
    }, 0)

    const avgLikelihood = Math.round(totalWeight / projections.goals.length)

    // Determine color and label
    let color: string
    let label: string
    let trend: 'up' | 'down' | 'neutral'

    if (avgLikelihood >= 85) {
      color = 'emerald'
      label = 'Excellent'
      trend = 'up'
    } else if (avgLikelihood >= 70) {
      color = 'green'
      label = 'Good'
      trend = 'up'
    } else if (avgLikelihood >= 50) {
      color = 'amber'
      label = 'Moderate'
      trend = 'neutral'
    } else if (avgLikelihood >= 30) {
      color = 'orange'
      label = 'At Risk'
      trend = 'down'
    } else {
      color = 'red'
      label = 'Critical'
      trend = 'down'
    }

    return { percentage: avgLikelihood, label, color, trend }
  }

  const { percentage, label, color, trend } = calculateLikelihood()

  // Count goal statuses for breakdown
  const statusCounts = projections?.goals.reduce((acc, goal) => {
    acc[goal.status] = (acc[goal.status] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const onTrackCount = (statusCounts.completed || 0) + (statusCounts.ahead || 0) + (statusCounts.on_track || 0)
  const needsWorkCount = (statusCounts.behind || 0) + (statusCounts.at_risk || 0)

  const colorClasses = {
    emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-600', ring: 'ring-emerald-500/20' },
    green: { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-600', ring: 'ring-green-500/20' },
    amber: { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-600', ring: 'ring-amber-500/20' },
    orange: { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-600', ring: 'ring-orange-500/20' },
    red: { bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-600', ring: 'ring-red-500/20' },
    slate: { bg: 'bg-slate-400', light: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-500/20' }
  }

  const colors = colorClasses[color as keyof typeof colorClasses]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <Card className="glass-card card-lift overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Goal Success Likelihood
          </CardTitle>
          {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-500" />}
          {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-500" />}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {/* Circular Progress */}
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="3"
                />
                <motion.path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${percentage}, 100`}
                  className={colors.text}
                  initial={{ strokeDasharray: "0, 100" }}
                  animate={{ strokeDasharray: `${percentage}, 100` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${colors.text}`}>{percentage}%</span>
              </div>
            </div>

            <div className="flex-1">
              <div className={`text-lg font-semibold ${colors.text}`}>{label}</div>
              {projections && projections.goals.length > 0 && (
                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                  {onTrackCount > 0 && (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span>{onTrackCount} on track</span>
                    </div>
                  )}
                  {needsWorkCount > 0 && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span>{needsWorkCount} need attention</span>
                    </div>
                  )}
                </div>
              )}
              {(!projections || projections.goals.length === 0) && (
                <p className="text-xs text-slate-500 mt-1">Add goals to track</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Financial Runway Card
function FinancialRunwayCard({ projections, index }: { projections: ProjectionSummary | null, index: number }) {
  const surplus = projections?.monthlySurplus || 0
  const monthlyExpenses = projections?.totalMonthlyExpenses || 0
  
  // Calculate how many months of expenses the surplus covers
  const surplusRatio = monthlyExpenses > 0 ? (surplus / monthlyExpenses) * 100 : 0
  
  const isPositive = surplus >= 0
  
  // Determine health status
  let status: { label: string; color: string; icon: typeof TrendingUp }
  if (surplus >= monthlyExpenses * 0.3) {
    status = { label: 'Strong', color: 'emerald', icon: Sparkles }
  } else if (surplus >= monthlyExpenses * 0.1) {
    status = { label: 'Healthy', color: 'green', icon: TrendingUp }
  } else if (surplus > 0) {
    status = { label: 'Tight', color: 'amber', icon: Clock }
  } else {
    status = { label: 'Deficit', color: 'red', icon: AlertTriangle }
  }

  const colorClasses = {
    emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    green: { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    amber: { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    red: { bg: 'bg-red-500', light: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' }
  }

  const colors = colorClasses[status.color as keyof typeof colorClasses]
  const StatusIcon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <Card className={`glass-card card-lift border ${colors.border}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Monthly Surplus
          </CardTitle>
          <div className={`p-1.5 rounded-full ${colors.light}`}>
            <StatusIcon className={`h-4 w-4 ${colors.text}`} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className={`text-2xl font-bold ${isPositive ? colors.text : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{formatCurrency(surplus)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${colors.light} ${colors.text} font-medium`}>
                  {status.label}
                </span>
                {monthlyExpenses > 0 && (
                  <span className="text-xs text-slate-500">
                    {Math.abs(surplusRatio).toFixed(0)}% of expenses
                  </span>
                )}
              </div>
            </div>
            
            {/* Visual bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(Math.abs(surplusRatio), 100)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className={`h-2 rounded-full ${isPositive ? colors.bg : 'bg-red-500'}`}
              />
            </div>
            
            <p className="text-xs text-slate-500">
              {isPositive 
                ? `Available for savings & goals after all expenses`
                : `Spending exceeds income by ${formatCurrency(Math.abs(surplus))}`
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
