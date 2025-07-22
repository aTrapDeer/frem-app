"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
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
import { ArrowRight, ArrowLeft, Target, Edit, Trash2 } from "lucide-react"
import { SideProjects } from "@/components/side-projects"
import { useAuth } from "@/contexts/auth-context"
import { getGoals, createGoal, updateGoal, calculateDailyTarget } from "@/lib/database"

const goalSchema = z.object({
  title: z.string().min(1, "Goal title is required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  deadline: z.string().min(1, "Deadline is required"),
  category: z.enum(["emergency", "vacation", "car", "house", "debt", "investment", "other"]),
})

type GoalFormData = z.infer<typeof goalSchema>

interface Goal {
  id: string
  title: string
  target_amount: number
  current_amount: number
  deadline: string
  category: string
  status: string
}

export default function GoalsPage() {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
    getValues
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    mode: "onChange",
  })

  // Watch form values for step navigation
  const watchedValues = watch()

  // Load goals from database
  useEffect(() => {
    async function fetchGoals() {
      if (!user) return
      
      try {
        setLoading(true)
        const data = await getGoals(user.id)
        setGoals(data)
      } catch (error) {
        console.error('Error fetching goals:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchGoals()
    }
  }, [user])

  const onSubmit = async (data: GoalFormData) => {
    if (!user) return
    
    try {
      setSubmitting(true)
      
      const newGoal = await createGoal({
        user_id: user.id,
        title: data.title,
        target_amount: data.amount,
        current_amount: 0,
        deadline: data.deadline,
        category: data.category,
        status: 'active',
        priority: 'medium'
      })
      
      setGoals(prev => [newGoal, ...prev])
      reset()
      setStep(1)
      setSuccessMessage(`Great! "${data.title}" goal has been created successfully.`)
      
      // Refresh daily target calculations since goals affect the target
      try {
        await calculateDailyTarget(user.id)
      } catch (error) {
        console.error('Error refreshing daily target:', error)
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(""), 5000)
    } catch (error) {
      console.error('Error creating goal:', error)
      // You could add error state here for user feedback
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditGoal = async (goalId: string, updates: Partial<GoalFormData>) => {
    if (!user) return
    
    try {
      setSubmitting(true)
      
      const updatedGoal = await updateGoal(goalId, {
        title: updates.title,
        target_amount: updates.amount,
        deadline: updates.deadline,
        category: updates.category,
        updated_at: new Date().toISOString()
      })
      
      setGoals(prev => prev.map(goal => 
        goal.id === goalId ? updatedGoal : goal
      ))
      
      setEditingGoal(null)
      setSuccessMessage("Goal updated successfully!")
      
      // Refresh daily target calculations since goal changes affect the target
      try {
        await calculateDailyTarget(user.id)
      } catch (error) {
        console.error('Error refreshing daily target:', error)
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(""), 5000)
    } catch (error) {
      console.error('Error updating goal:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (!user || !confirm('Are you sure you want to delete this goal?')) return
    
    try {
      await updateGoal(goalId, { status: 'cancelled' })
      setGoals(prev => prev.filter(goal => goal.id !== goalId))
      setSuccessMessage("Goal deleted successfully!")
      setTimeout(() => setSuccessMessage(""), 5000)
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  const totalSteps = 3
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
                    index={index}
                    onEdit={setEditingGoal}
                    onDelete={handleDeleteGoal}
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

interface GoalCardProps {
  goal: Goal
  index: number
  onEdit: (goal: Goal) => void
  onDelete: (goalId: string) => void
}

function GoalCard({ goal, index, onEdit, onDelete }: GoalCardProps) {
  const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0

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
                  <h3 className="text-lg font-bold text-slate-900">{goal.title}</h3>
                  <p className="text-sm text-slate-600 capitalize">{goal.category}</p>
                </div>
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
              <div className="text-right mt-2">
                <p className="text-2xl font-bold font-numbers text-slate-900">${goal.current_amount.toLocaleString()}</p>
                <p className="text-sm text-slate-600">of ${goal.target_amount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Progress value={progress} />
            <div className="flex justify-between text-sm text-slate-600">
              <span>{Math.round(progress)}% complete</span>
              <span>Due {new Date(goal.deadline).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface GoalWizardStepProps {
  step: number
  register: any
  errors: any
  watchedValues: any
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
            <Label htmlFor="title">What's your goal?</Label>
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
                  <div>Deadline: <strong>{new Date(watchedValues.deadline).toLocaleDateString()}</strong></div>
                  {(() => {
                    const today = new Date()
                    const deadline = new Date(watchedValues.deadline)
                    const monthsLeft = Math.max(1, Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)))
                    const monthlyTarget = Math.round(watchedValues.amount / monthsLeft)
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
              type="submit" 
              disabled={!isValid || submitting}
              className="bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white"
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
    deadline: goal.deadline,
    category: goal.category as GoalFormData['category']
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(editData.amount)
    if (!editData.title || !amount || !editData.deadline || !editData.category) return
    
    onSave(goal.id, {
      title: editData.title,
      amount: amount,
      deadline: editData.deadline,
      category: editData.category
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
