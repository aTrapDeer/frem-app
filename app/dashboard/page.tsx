"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { formatCurrency } from "@/lib/utils"
import { DollarSign, Target, CreditCard, Zap } from "lucide-react"

interface DashboardData {
  dailyTotal: number
  goalProgress: number
  monthlyRecurringTotal: number
  monthlyProjectIncome: number
  transactionCount: number
  activeGoalsCount: number
  activeSideProjectsCount: number
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
  const { user, userSettings, isLoading } = useAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  // Fetch dashboard data from API
  useEffect(() => {
    async function fetchDashboard() {
      if (!user) return
      
      try {
        setDataLoading(true)
        const response = await fetch('/api/dashboard')
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        
        const data = await response.json()
        setDashboardData(data)
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

  const dailyTarget = userSettings?.daily_budget_target || 150

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
              <KPICard
                title="Daily Progress"
                icon={DollarSign}
                current={dashboardData?.dailyTotal || 0}
                target={dailyTarget}
                index={0}
              />
              <KPICard
                title="Goal Progress"
                icon={Target}
                current={dashboardData?.goalProgress || 0}
                isPercentage={true}
                index={1}
              />
              <KPICard
                title="Monthly Expenses"
                icon={CreditCard}
                current={dashboardData?.monthlyRecurringTotal || 0}
                index={2}
              />
            </div>
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
              title="Side Projects"
              value={dashboardData?.activeSideProjectsCount || 0}
              index={2}
            />
            <QuickStatCard
              title="Monthly Project Income"
              value={formatCurrency(dashboardData?.monthlyProjectIncome || 0)}
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
                    onClick={() => router.push('/daily')}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2 bg-transparent"
                  >
                    <DollarSign className="h-6 w-6 text-green-600" />
                    <div className="text-center">
                      <div className="font-semibold">Add Transaction</div>
                      <div className="text-xs text-slate-600">Log income or expense</div>
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
                      <div className="font-semibold">Manage Expenses</div>
                      <div className="text-xs text-slate-600">Recurring payments</div>
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
