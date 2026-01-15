"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowRight, ArrowLeft, Target, Edit, Trash2, TrendingUp, Calendar, AlertTriangle, CheckCircle2, Clock, Info } from "lucide-react"
import { SideProjects } from "@/components/side-projects"
import { useAuth } from "@/contexts/auth-context"

const goalSchema = z.object({
  title: z.string().min(1, "Goal title is required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  start_date: z.string().optional(),
  deadline: z.string().min(1, "Deadline is required"),
  category: z.enum(["emergency", "vacation", "car", "house", "debt", "investment", "other"]),
  interest_rate: z.preprocess(
    (value) => {
      if (value === '' || value === undefined || value === null) return undefined
      const num = Number(value)
      return isNaN(num) ? undefined : num
    },
    z.number().min(0).max(100).optional()
  ),
  urgency_score: z.preprocess(
    (value) => (typeof value === 'string' ? parseInt(value, 10) : value),
    z.number().min(1).max(5)
  ),
})

type GoalFormData = z.infer<typeof goalSchema>

// Urgency labels
const urgencyLevels = [
  { value: 1, label: 'Low', description: 'Nice to have, flexible timeline', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { value: 2, label: 'Medium-Low', description: 'Important but not urgent', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  { value: 3, label: 'Medium', description: 'Balanced priority', color: 'bg-amber-100 text-amber-600 border-amber-200' },
  { value: 4, label: 'High', description: 'Important, should complete soon', color: 'bg-orange-100 text-orange-600 border-orange-200' },
  { value: 5, label: 'Urgent', description: 'Top priority, pay off first', color: 'bg-red-100 text-red-600 border-red-200' },
]

interface Goal {
  id: string
  title: string
  target_amount: number
  current_amount: number
  start_date: string | null
  deadline: string
  interest_rate: number | null
  category: string
  status: string
  urgency_score: number // 1-5, higher = more urgent
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

export default function GoalsPage() {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [goals, setGoals] = useState<Goal[]>([])
  const [projections, setProjections] = useState<ProjectionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [showProjectionInfo, setShowProjectionInfo] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    mode: "onChange",
    defaultValues: {
      urgency_score: 3,
      start_date: "",
      interest_rate: undefined,
    },
  })

  // Watch form values for step navigation
  const watchedValues = watch()

  // Load goals and projections from API
  useEffect(() => {
    async function fetchData() {
      if (!user) return
      
      try {
        setLoading(true)
        const [goalsRes, projectionsRes] = await Promise.all([
          fetch('/api/goals'),
          fetch('/api/projections')
        ])
        
        if (goalsRes.ok) {
          const goalsData = await goalsRes.json()
          // Filter out cancelled goals as a safeguard
          setGoals(goalsData.filter((goal: Goal) => goal.status !== 'cancelled'))
        }
        
        if (projectionsRes.ok) {
          const projectionsData = await projectionsRes.json()
          setProjections(projectionsData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user])
  
  // Helper to get projection for a specific goal
  const getProjection = (goalId: string): GoalProjection | undefined => {
    return projections?.goals.find(p => p.goalId === goalId)
  }

  const onSubmit = async (data: GoalFormData) => {
    if (!user) return
    
    try {
      setSubmitting(true)
      
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          target_amount: data.amount,
          current_amount: 0,
          start_date: data.start_date || null,
          interest_rate: data.category === 'investment' ? (data.interest_rate ?? null) : null,
          deadline: data.deadline,
          category: data.category,
          urgency_score: data.urgency_score || 3,
          status: 'active',
          priority: 'medium'
        })
      })
      
      if (response.ok) {
        const newGoal = await response.json()
        setGoals(prev => [newGoal, ...prev])
        reset()
        setStep(1)
        setSuccessMessage(`Great! "${data.title}" goal has been created successfully.`)
        
        // Refresh projections
        const projectionsRes = await fetch('/api/projections')
        if (projectionsRes.ok) {
          setProjections(await projectionsRes.json())
        }
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(""), 5000)
    } catch (error) {
      console.error('Error creating goal:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditGoal = async (goalId: string, updates: Partial<GoalFormData>) => {
    if (!user) return
    
    try {
      setSubmitting(true)
      
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: goalId,
          title: updates.title,
          target_amount: updates.amount,
          start_date: updates.start_date || null,
          interest_rate: updates.category === 'investment' ? (updates.interest_rate ?? null) : null,
          deadline: updates.deadline,
          category: updates.category,
          urgency_score: updates.urgency_score
        })
      })
      
      if (response.ok) {
        const updatedGoal = await response.json()
        setGoals(prev => prev.map(goal => 
          goal.id === goalId ? updatedGoal : goal
        ))
        setEditingGoal(null)
        setSuccessMessage("Goal updated successfully!")
        
        // Refresh projections
        const projectionsRes = await fetch('/api/projections')
        if (projectionsRes.ok) {
          setProjections(await projectionsRes.json())
        }
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(""), 5000)
    } catch (error) {
      console.error('Error updating goal:', error)
    } finally {
      setSubmitting(false)
    }
  }
  
  // Quick update urgency score without opening full modal
  const handleQuickUrgencyUpdate = async (goalId: string, newScore: number) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goalId, urgency_score: newScore })
      })
      
      if (response.ok) {
        const updatedGoal = await response.json()
        setGoals(prev => prev.map(goal => 
          goal.id === goalId ? updatedGoal : goal
        ))
        
        // Refresh projections
        const projectionsRes = await fetch('/api/projections')
        if (projectionsRes.ok) {
          setProjections(await projectionsRes.json())
        }
      }
    } catch (error) {
      console.error('Error updating urgency:', error)
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (!user || !confirm('Are you sure you want to delete this goal?')) return
    
    try {
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goalId, status: 'cancelled' })
      })
      
      if (response.ok) {
        // Remove from local state
        setGoals(prev => prev.filter(goal => goal.id !== goalId))
        // Refresh projections to update dashboard
        const projectionsRes = await fetch('/api/projections')
        if (projectionsRes.ok) {
          setProjections(await projectionsRes.json())
        }
        setSuccessMessage("Goal deleted successfully!")
        setTimeout(() => setSuccessMessage(""), 5000)
      }
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Navbar />

      <main className="pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Financial Goals</h1>
            <p className="text-slate-600">Set targets and track your progress</p>
          </motion.div>

          {/* Projection Summary Banner */}
          {projections && projections.monthlySurplus > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-slate-900">Goal Projections Active</h3>
                        <button
                          onClick={() => setShowProjectionInfo(!showProjectionInfo)}
                          className={`p-1 rounded-full transition-colors ${showProjectionInfo ? 'bg-blue-100 text-blue-600' : 'hover:bg-blue-100 text-slate-500'}`}
                        >
                          <Info className="h-4 w-4" />
                        </button>
                        {projections.hasVariableIncome && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            Variable Income
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        Your <span className="font-medium text-green-600">${projections.monthlySurplus.toLocaleString()}/mo</span> surplus is automatically allocated to your goals
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-900">${projections.totalMonthlyIncome.toLocaleString()}</div>
                      <div className="text-xs text-slate-500">monthly income</div>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {showProjectionInfo && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 p-4 bg-white rounded-lg border border-blue-100">
                          <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-1.5">
                            <Info className="h-4 w-4 text-blue-500" />
                            How Projections Work
                          </h4>
                          <div className="text-sm text-slate-600 space-y-2">
                            <p>
                              <strong>1. Income Analysis:</strong> We calculate your total monthly income from all sources 
                              (${projections.totalMonthlyIncome.toLocaleString()})
                            </p>
                            <p>
                              <strong>2. Expense Deduction:</strong> Your recurring expenses (${projections.totalMonthlyExpenses.toLocaleString()}) are subtracted
                            </p>
                            <p>
                              <strong>3. Surplus Allocation:</strong> The remaining ${projections.monthlySurplus.toLocaleString()}/mo is proportionally 
                              distributed across your goals based on how much each goal needs
                            </p>
                            <p>
                              <strong>4. Timeline Projection:</strong> We estimate when each goal will be completed at this rate
                            </p>
                            {projections.hasVariableIncome && (
                              <p className="text-amber-700 bg-amber-50 p-2 rounded">
                                <strong>⚠️ Variable Income:</strong> Since you have commission-based income, projections use your 
                                &quot;safe average&quot; estimate. Actual results may vary.
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Existing Goals */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">Your Goals</h2>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="bg-white border border-slate-200 shadow-sm">
                      <CardContent className="p-6">
                        <div className="animate-pulse">
                          <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                          <div className="h-8 bg-slate-200 rounded w-1/2 mb-4"></div>
                          <div className="h-2 bg-slate-200 rounded w-full mb-2"></div>
                          <div className="h-2 bg-slate-200 rounded w-2/3"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : goals.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                  <Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Goals Yet</h3>
                  <p className="text-slate-600">Create your first financial goal to get started!</p>
                </div>
              ) : (
                goals.map((goal, index) => (
                  <GoalCard 
                    key={goal.id} 
                    goal={goal} 
                    projection={getProjection(goal.id)}
                    index={index}
                    onEdit={setEditingGoal}
                    onDelete={handleDeleteGoal}
                    onUrgencyChange={handleQuickUrgencyUpdate}
                  />
                ))
              )}
            </div>

            {/* Goal Creation Wizard */}
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Create New Goal
                  <span className="text-sm font-normal text-slate-600">
                    Step {step} of {totalSteps}
                  </span>
                </CardTitle>
                <Progress value={progress} className="w-full" />
              </CardHeader>
              <CardContent>
                {successMessage && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 text-sm font-medium">{successMessage}</p>
                  </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <GoalWizardStep
                    step={step}
                    register={register}
                    errors={errors}
                    watchedValues={watchedValues}
                    onNext={() => setStep((s) => Math.min(s + 1, totalSteps))}
                    onPrev={() => setStep((s) => Math.max(s - 1, 1))}
                    isValid={isValid}
                    submitting={submitting}
                  />
                </form>
              </CardContent>
            </Card>

            {/* Edit Goal Modal */}
            {editingGoal && (
              <EditGoalModal
                goal={editingGoal}
                onSave={handleEditGoal}
                onCancel={() => setEditingGoal(null)}
                submitting={submitting}
              />
            )}
          </div>

          {/* Side Projects Section */}
          <div className="mt-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-2xl font-bold text-slate-900 mb-6"
            >
              Side Projects & Income Streams
            </motion.h2>
            <SideProjects />
          </div>
        </div>
      </main>
      </div>
    </AuthGuard>
  )
}

interface GoalBreakdown {
  goal: Goal
  contributions: {
    all: Array<{
      id: string
      amount: number
      contribution_date: string
      description: string | null
      source: string
    }>
    manual: Array<{ id: string; amount: number; contribution_date: string; description: string | null }>
    oneTime: Array<{ id: string; amount: number; contribution_date: string; description: string | null }>
    totalManual: number
    totalOneTime: number
  }
  appliedIncomes: Array<{
    id: string
    amount: number
    description: string
    source: string
    income_date: string
  }>
  summary: {
    targetAmount: number
    currentAmount: number
    remaining: number
    monthsRemaining: number
    monthlyRequired: number
    deadline: string
    progressPercent: number
  }
  paymentSchedule: Array<{
    date: string
    month: string
    expectedContribution: number
    runningTotal: number
    progressPercent: number
  }>
}

interface GoalCardProps {
  goal: Goal
  projection?: GoalProjection
  index: number
  onEdit: (goal: Goal) => void
  onDelete: (goalId: string) => void
  onUrgencyChange: (goalId: string, newScore: number) => void
}

function GoalCard({ goal, projection, index, onEdit, onDelete, onUrgencyChange }: GoalCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [breakdown, setBreakdown] = useState<GoalBreakdown | null>(null)
  const [loadingBreakdown, setLoadingBreakdown] = useState(false)

  const manualProgress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0
  const projectedProgress = projection?.progressPercentage || manualProgress
  const urgency = goal.urgency_score || 3
  
  // Get urgency level info
  const urgencyInfo = urgencyLevels.find(u => u.value === urgency) || urgencyLevels[2]

  const fetchBreakdown = async () => {
    if (breakdown) {
      setShowBreakdown(true)
      return
    }
    
    setLoadingBreakdown(true)
    try {
      const response = await fetch(`/api/goals/${goal.id}/breakdown`)
      if (response.ok) {
        const data = await response.json()
        setBreakdown(data)
        setShowBreakdown(true)
      }
    } catch (error) {
      console.error('Error fetching breakdown:', error)
    } finally {
      setLoadingBreakdown(false)
    }
  }
  
  // Status badge styling
  const getStatusBadge = () => {
    if (!projection) return null
    
    const badges = {
      completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2, label: 'Completed!' },
      ahead: { bg: 'bg-blue-100', text: 'text-blue-700', icon: TrendingUp, label: `${projection.daysAheadOrBehind}d ahead` },
      on_track: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2, label: 'On Track' },
      behind: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock, label: `${Math.abs(projection.daysAheadOrBehind)}d behind` },
      at_risk: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle, label: 'At Risk' }
    }
    
    const badge = badges[projection.status]
    const Icon = badge.icon
    
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-slate-900">{goal.title}</h3>
                    {getStatusBadge()}
                  </div>
                  <p className="text-sm text-slate-600 capitalize">{goal.category}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={fetchBreakdown}
                    disabled={loadingBreakdown}
                    className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                    title="View breakdown & payment schedule"
                  >
                    {loadingBreakdown ? (
                      <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Info className="h-4 w-4 text-blue-500" />
                    )}
                  </button>
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(goal)}
                      className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Edit goal"
                    >
                      <Edit className="h-4 w-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => onDelete(goal.id)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Amount display - show projected vs manual */}
              <div className="text-right mt-2">
                {projection ? (
                  <>
                    <p className="text-2xl font-bold font-numbers text-slate-900">
                      ${projection.totalProjectedProgress.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-600">
                      of ${goal.target_amount.toLocaleString()}
                      {goal.current_amount > 0 && (
                        <span className="text-xs text-slate-400 ml-1">
                          (${goal.current_amount.toLocaleString()} saved + ${projection.projectedAmount.toLocaleString()} projected)
                        </span>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold font-numbers text-slate-900">${goal.current_amount.toLocaleString()}</p>
                    <p className="text-sm text-slate-600">of ${goal.target_amount.toLocaleString()}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative">
              {/* Background bar */}
              <Progress value={projectedProgress} className="h-3" />
              {/* Manual progress indicator (if different from projected) */}
              {projection && goal.current_amount > 0 && manualProgress < projectedProgress && (
                <div 
                  className="absolute top-0 left-0 h-3 bg-green-600 rounded-full transition-all"
                  style={{ width: `${manualProgress}%` }}
                />
              )}
            </div>
            
            <div className="flex justify-between text-sm text-slate-600">
              <span>{Math.round(projectedProgress)}% {projection ? 'projected' : 'complete'}</span>
              <span>Due {new Date(goal.deadline).toLocaleDateString()}</span>
            </div>
          </div>
          
          {/* Urgency Control */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Priority</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${urgencyInfo.color}`}>
                {urgencyInfo.label}
              </span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => {
                const levelInfo = urgencyLevels.find(u => u.value === level)!
                const isActive = level <= urgency
                return (
                  <button
                    key={level}
                    onClick={() => onUrgencyChange(goal.id, level)}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      isActive 
                        ? level <= 2 ? 'bg-slate-400' 
                          : level === 3 ? 'bg-amber-400'
                          : level === 4 ? 'bg-orange-400'
                          : 'bg-red-500'
                        : 'bg-slate-200 hover:bg-slate-300'
                    }`}
                    title={`${levelInfo.label}: ${levelInfo.description}`}
                  />
                )
              })}
            </div>
            <p className="text-xs text-slate-400 mt-1 text-center">{urgencyInfo.description}</p>
          </div>

          {/* Projection details */}
          {projection && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-slate-500 text-xs">Est. Completion</p>
                    <p className="font-medium text-slate-900">
                      {new Date(projection.projectedCompletionDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: projection.daysUntilProjectedCompletion > 365 ? 'numeric' : undefined
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-slate-500 text-xs">Monthly Allocation</p>
                    <p className="font-medium text-green-600">+${projection.monthlyAllocation.toLocaleString()}/mo</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown Modal */}
      <AnimatePresence>
        {showBreakdown && breakdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowBreakdown(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 32 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-500" />
                    Goal Breakdown
                  </h2>
                  <button
                    onClick={() => setShowBreakdown(false)}
                    className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <h3 className="text-lg text-slate-700">{breakdown.goal.title}</h3>
              </div>

              <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Progress Summary */}
                <div className="p-6 border-b border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Progress Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Target Amount</span>
                      <span className="font-bold text-slate-900">${breakdown.summary.targetAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Current Progress</span>
                      <span className="font-bold text-green-600">${breakdown.summary.currentAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Remaining</span>
                      <span className="font-bold text-amber-600">${breakdown.summary.remaining.toLocaleString()}</span>
                    </div>
                    <Progress value={breakdown.summary.progressPercent} className="h-2" />
                    <p className="text-center text-sm text-slate-500">
                      {breakdown.summary.progressPercent}% complete • {breakdown.summary.monthsRemaining} months to deadline
                    </p>
                  </div>
                </div>

                {/* Contribution Breakdown */}
                <div className="p-6 border-b border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Where Your Progress Comes From</h4>
                  <div className="space-y-2">
                    {breakdown.contributions.totalManual > 0 && (
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                            <Target className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">Manual Contributions</p>
                            <p className="text-xs text-slate-500">{breakdown.contributions.manual.length} contribution(s)</p>
                          </div>
                        </div>
                        <span className="font-bold text-green-600">+${breakdown.contributions.totalManual.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {breakdown.contributions.totalOneTime > 0 && (
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">One-Time Income Applied</p>
                            <p className="text-xs text-slate-500">{breakdown.appliedIncomes.length} income(s) applied</p>
                          </div>
                        </div>
                        <span className="font-bold text-amber-600">+${breakdown.contributions.totalOneTime.toLocaleString()}</span>
                      </div>
                    )}

                    {projection && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">Projected Allocation</p>
                            <p className="text-xs text-slate-500">From monthly surplus</p>
                          </div>
                        </div>
                        <span className="font-bold text-blue-600">+${projection.monthlyAllocation.toLocaleString()}/mo</span>
                      </div>
                    )}

                    {breakdown.summary.currentAmount === 0 && !projection && (
                      <div className="text-center py-4 text-slate-500">
                        <p>No contributions yet. Add income or set up automatic allocations.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Applied One-Time Incomes Detail */}
                {breakdown.appliedIncomes.length > 0 && (
                  <div className="p-6 border-b border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Applied One-Time Income Details</h4>
                    <div className="space-y-2">
                      {breakdown.appliedIncomes.map((income) => (
                        <div key={income.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                          <div>
                            <p className="font-medium text-slate-900">{income.description}</p>
                            <p className="text-xs text-slate-500">
                              {income.source} • {new Date(income.income_date).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="font-bold text-green-600">+${income.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expected Payment Schedule */}
                <div className="p-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Expected Payment Schedule
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Based on your monthly allocation of ${breakdown.summary.monthlyRequired.toLocaleString()}
                  </p>
                  <div className="space-y-2">
                    {breakdown.paymentSchedule.map((payment, idx) => (
                      <div 
                        key={`${payment.date}-${idx}`} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-slate-900">{payment.month}</span>
                            <span className="text-green-600 font-medium">+${payment.expectedContribution.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                              <div 
                                className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
                                style={{ width: `${payment.progressPercent}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 w-20 text-right">
                              ${payment.runningTotal.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {breakdown.summary.monthsRemaining > 6 && (
                      <p className="text-center text-sm text-slate-400 pt-2">
                        + {breakdown.summary.monthsRemaining - 6} more months until deadline
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <p className="text-xs text-center text-slate-500">
                  Deadline: {new Date(breakdown.summary.deadline).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface GoalWizardStepProps {
  step: number
  register: ReturnType<typeof useForm<GoalFormData>>['register']
  errors: Partial<Record<keyof GoalFormData, { message?: string }>>
  watchedValues: Partial<GoalFormData>
  onNext: () => void
  onPrev: () => void
  isValid: boolean
  submitting?: boolean
}

function GoalWizardStep({ step, register, errors, watchedValues, onNext, onPrev, isValid, submitting }: GoalWizardStepProps) {
  switch (step) {
    case 1:
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">What&apos;s your goal?</Label>
            <Input
              id="title"
              placeholder="e.g., Emergency Fund, New Car, Vacation to Europe"
              {...register("title")}
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            <p className="text-xs text-slate-500 mt-1">Give your goal a descriptive name that motivates you</p>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              {...register("category")}
              className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="">Choose a category...</option>
              <option value="emergency">🛡️ Emergency Fund</option>
              <option value="vacation">✈️ Vacation & Travel</option>
              <option value="car">🚗 Vehicle Purchase</option>
              <option value="house">🏠 Home & Property</option>
              <option value="debt">💳 Debt Payoff</option>
              <option value="investment">📈 Investment & Savings</option>
              <option value="other">🎯 Other Goal</option>
            </select>
            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>}
            <p className="text-xs text-slate-500 mt-1">This helps us provide better recommendations</p>
          </div>

          <div className="flex justify-end">
            <Button 
              type="button" 
              onClick={onNext} 
              disabled={!watchedValues.title || !watchedValues.category}
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )

    case 2:
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">How much do you need?</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                placeholder="5000.00"
                {...register("amount", { valueAsNumber: true })}
                className={`pl-8 ${errors.amount ? "border-red-500" : ""}`}
              />
            </div>
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
            <p className="text-xs text-slate-500 mt-1">
              Enter the total amount you want to save for this goal
            </p>
            {watchedValues.amount && watchedValues.amount > 0 && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> To reach ${watchedValues.amount.toLocaleString()}, you could save:
                </p>
                <div className="mt-1 text-xs text-blue-700 space-y-1">
                  <div>• ${Math.round(watchedValues.amount / 12).toLocaleString()}/month for 1 year</div>
                  <div>• ${Math.round(watchedValues.amount / 24).toLocaleString()}/month for 2 years</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onPrev}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <Button 
              type="button" 
              onClick={onNext} 
              disabled={!watchedValues.amount || watchedValues.amount <= 0}
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )

    case 3:
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="start_date">Start Date (Optional)</Label>
            <Input
              id="start_date"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              {...register("start_date")}
            />
            <p className="text-xs text-slate-500 mt-1">
              Leave blank to start immediately
            </p>
          </div>

          {watchedValues.category === 'investment' && (
            <div>
              <Label htmlFor="interest_rate">Estimated Annual Growth % (Optional)</Label>
              <Input
                id="interest_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g., 10"
                {...register("interest_rate", {
                  setValueAs: (value) => (value === "" ? undefined : Number(value))
                })}
              />
              <p className="text-xs text-slate-500 mt-1">
                Used to estimate compounding growth for investment goals
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="deadline">When do you want to achieve this?</Label>
            <Input
              id="deadline"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              {...register("deadline")}
              className={errors.deadline ? "border-red-500" : ""}
            />
            {errors.deadline && <p className="text-red-500 text-sm mt-1">{errors.deadline.message}</p>}
            <p className="text-xs text-slate-500 mt-1">
              Choose your target completion date
            </p>
            
            {watchedValues.deadline && watchedValues.amount && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  📅 Your Goal Summary:
                </p>
                <div className="mt-2 text-sm text-green-700">
                  <div>Goal: <strong>{watchedValues.title}</strong></div>
                  <div>Amount: <strong>${watchedValues.amount.toLocaleString()}</strong></div>
                  {watchedValues.start_date && (
                    <div>Start: <strong>{new Date(watchedValues.start_date).toLocaleDateString()}</strong></div>
                  )}
                  <div>Deadline: <strong>{new Date(watchedValues.deadline).toLocaleDateString()}</strong></div>
                  {(() => {
                    const today = new Date()
                    const deadline = new Date(watchedValues.deadline)
                    const startDate = watchedValues.start_date ? new Date(watchedValues.start_date) : today
                    const effectiveStart = startDate > today ? startDate : today
                    const monthsLeft = Math.max(1, Math.round((deadline.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24 * 30)))
                    const annualRate = watchedValues.category === 'investment' && watchedValues.interest_rate
                      ? Number(watchedValues.interest_rate)
                      : 0
                    const monthlyRate = annualRate > 0 ? Math.pow(1 + annualRate / 100, 1 / 12) - 1 : 0
                    const growthFactor = Math.pow(1 + monthlyRate, monthsLeft)
                    const rawMonthlyTarget = monthlyRate > 0
                      ? (watchedValues.amount - growthFactor * 0) * monthlyRate / (growthFactor - 1)
                      : watchedValues.amount / monthsLeft
                    const monthlyTarget = Math.round(rawMonthlyTarget)
                    return (
                      <div className="mt-2 p-2 bg-white rounded border border-green-300">
                        <div className="text-green-800 font-semibold">
                          💰 Save ${monthlyTarget.toLocaleString()}/month to reach your goal!
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onPrev}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <Button 
              type="button" 
              onClick={onNext}
              disabled={!watchedValues.deadline}
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )

    case 4:
      return (
        <div className="space-y-4">
          <div>
            <Label>How urgent is this goal?</Label>
            <p className="text-xs text-slate-500 mb-3">
              Higher priority goals get more of your monthly surplus allocation
            </p>
            
            <div className="space-y-2">
              {urgencyLevels.map((level) => (
                <label
                  key={level.value}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    Number(watchedValues.urgency_score) === level.value 
                      ? level.color + ' border-2' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    value={level.value.toString()}
                    {...register("urgency_score", { 
                      valueAsNumber: true,
                      setValueAs: (v) => parseInt(v, 10) 
                    })}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{level.label}</div>
                    <div className="text-xs text-slate-500">{level.description}</div>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div 
                        key={i} 
                        className={`w-2 h-4 rounded-full ${
                          i <= level.value 
                            ? i <= 2 ? 'bg-slate-400' 
                              : i === 3 ? 'bg-amber-400'
                              : i === 4 ? 'bg-orange-400'
                              : 'bg-red-500'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {watchedValues.urgency_score && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>How this works:</strong> Goals with higher urgency receive a larger share of your monthly surplus. 
                A &quot;{urgencyLevels.find(l => l.value === Number(watchedValues.urgency_score))?.label}&quot; goal will get 
                {Number(watchedValues.urgency_score) === 5 ? ' the maximum' : Number(watchedValues.urgency_score) === 1 ? ' the minimum' : ' a proportional'} allocation.
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onPrev}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <Button 
              type="submit" 
              disabled={!isValid || submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? "Creating..." : "Create Goal"}
            </Button>
          </div>
        </div>
      )

    default:
      return null
  }
}

interface EditGoalModalProps {
  goal: Goal
  onSave: (goalId: string, updates: Partial<GoalFormData>) => void
  onCancel: () => void
  submitting: boolean
}

function EditGoalModal({ goal, onSave, onCancel, submitting }: EditGoalModalProps) {
  const [editData, setEditData] = useState({
    title: goal.title,
    amount: goal.target_amount.toString(),
    start_date: goal.start_date || "",
    deadline: goal.deadline,
    interest_rate: goal.interest_rate?.toString() || "",
    category: goal.category as GoalFormData['category'],
    urgency_score: goal.urgency_score || 3
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(editData.amount)
    const interestRate = editData.interest_rate ? parseFloat(editData.interest_rate) : null
    if (!editData.title || !amount || !editData.deadline || !editData.category) return
    
    onSave(goal.id, {
      title: editData.title,
      amount: amount,
      start_date: editData.start_date,
      interest_rate: interestRate ?? undefined,
      deadline: editData.deadline,
      category: editData.category,
      urgency_score: editData.urgency_score
    })
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 32 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Edit Goal</h2>
            <button
              onClick={onCancel}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Goal Title</Label>
              <Input
                id="edit-title"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="bg-white"
              />
            </div>

            <div>
              <Label htmlFor="edit-amount">Target Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">$</span>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={editData.amount}
                  onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                  className="pl-8 bg-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-start-date">Start Date (Optional)</Label>
              <Input
                id="edit-start-date"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={editData.start_date}
                onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                className="bg-white"
              />
            </div>

            {editData.category === 'investment' && (
              <div>
                <Label htmlFor="edit-interest-rate">Estimated Annual Growth % (Optional)</Label>
                <Input
                  id="edit-interest-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editData.interest_rate}
                  onChange={(e) => setEditData({ ...editData, interest_rate: e.target.value })}
                  className="bg-white"
                />
              </div>
            )}

            <div>
              <Label htmlFor="edit-deadline">Target Date</Label>
              <Input
                id="edit-deadline"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={editData.deadline}
                onChange={(e) => setEditData({ ...editData, deadline: e.target.value })}
                className="bg-white"
              />
            </div>

            <div>
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
                value={editData.category}
                onChange={(e) => setEditData({ ...editData, category: e.target.value as GoalFormData['category'] })}
                className="w-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="emergency">🛡️ Emergency Fund</option>
                <option value="vacation">✈️ Vacation & Travel</option>
                <option value="car">🚗 Vehicle Purchase</option>
                <option value="house">🏠 Home & Property</option>
                <option value="debt">💳 Debt Payoff</option>
                <option value="investment">📈 Investment & Savings</option>
                <option value="other">🎯 Other Goal</option>
              </select>
            </div>

            <div>
              <Label>Priority</Label>
              <p className="text-xs text-slate-500 mb-2">Higher priority = more allocation</p>
              <div className="flex gap-2">
                {urgencyLevels.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setEditData({ ...editData, urgency_score: level.value })}
                    className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all border ${
                      editData.urgency_score === level.value 
                        ? level.color + ' border-2' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {level.value}
                  </button>
                ))}
              </div>
              <p className="text-xs text-center mt-1 text-slate-500">
                {urgencyLevels.find(l => l.value === editData.urgency_score)?.label}
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  )
}
