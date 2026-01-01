"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Target,
  CheckCircle,
  Circle,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/contexts/auth-context"

interface Milestone {
  id: string
  title: string
  description: string | null
  target_amount: number | null
  current_amount: number
  deadline: string | null
  status: string
  priority: string
  category: string
}

export default function Roadmap() {
  const { user } = useAuth()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch user's milestones from API
  useEffect(() => {
    async function fetchMilestones() {
      if (!user) return
      
      try {
        setLoading(true)
        const response = await fetch('/api/milestones')
        if (response.ok) {
          const data = await response.json()
          setMilestones(data)
        }
      } catch (error) {
        console.error('Error fetching milestones:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchMilestones()
    }
  }, [user])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "from-red-400 to-orange-500"
      case "medium":
        return "from-indigo-400 to-blue-500"
      case "low":
        return "from-green-400 to-emerald-500"
      default:
        return "from-gray-400 to-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "in-progress":
        return <Circle className="h-5 w-5 text-blue-500" />
      case "planned":
        return <Circle className="h-5 w-5 text-gray-400" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Navbar />

      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Financial Roadmap</h1>
            <p className="text-gray-600">Track your progress toward major financial milestones</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Milestones */}
            <div className="lg:col-span-2">
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">Your Milestones</h3>
                  <Link href="/goals">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 bg-transparent"
                    >
                      Add Milestone
                    </Button>
                  </Link>
                </div>

                <div className="space-y-4">
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="animate-pulse">
                            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2 mb-4"></div>
                            <div className="h-2 bg-slate-200 rounded w-full"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : milestones.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Target className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">No Milestones Yet</h3>
                      <p className="text-slate-600 mb-6">Create your first financial milestone to start tracking your roadmap.</p>
                      <Link href="/goals">
                        <Button className="bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white">
                          Create Your First Milestone
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    milestones.map((milestone) => {
                      const progress = milestone.target_amount && milestone.target_amount > 0 
                        ? (milestone.current_amount / milestone.target_amount) * 100 
                        : 0
                      
                      const daysLeft = milestone.deadline 
                        ? Math.max(0, Math.ceil((new Date(milestone.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                        : null

                      return (
                        <div
                          key={milestone.id}
                          className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 transition-all duration-300 hover:border-gray-300 hover:shadow-md"
                        >
                          <div className="flex items-start space-x-4">
                            <div
                              className={`mt-1 h-12 w-12 flex-shrink-0 rounded-xl bg-gradient-to-r ${getPriorityColor(milestone.priority)} flex items-center justify-center shadow-sm`}
                            >
                              {getStatusIcon(milestone.status)}
                            </div>

                            <div className="flex-1 space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="text-base font-semibold text-gray-800">{milestone.title}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
                                    {milestone.priority} Priority
                                  </span>
                                </div>
                              </div>

                              {milestone.target_amount && (
                                <div className="space-y-3">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Progress</span>
                                    <span className="font-medium text-gray-800">
                                      ${milestone.current_amount.toLocaleString()} / ${milestone.target_amount.toLocaleString()}
                                    </span>
                                  </div>

                                  <Progress value={progress} className="h-2" />

                                  <div className="flex justify-between text-sm text-gray-600">
                                    <span>{Math.round(progress)}% complete</span>
                                    {daysLeft !== null && (
                                      <span>{daysLeft > 0 ? `${daysLeft} days left` : "Overdue"}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <div>
              <Card className="bg-white border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>

                <div className="space-y-3">
                  <Link href="/goals">
                    <Button
                      variant="outline"
                      className="w-full justify-between border-orange-200 text-orange-600 hover:bg-orange-50 bg-transparent"
                    >
                      Create New Milestone
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>

                  <Link href="/daily">
                    <Button
                      variant="outline"
                      className="w-full justify-between border-indigo-200 text-indigo-600 hover:bg-indigo-50 bg-transparent"
                    >
                      Update Daily Progress
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>

                  <Link href="/summary">
                    <Button
                      variant="outline"
                      className="w-full justify-between border-green-200 text-green-600 hover:bg-green-50 bg-transparent"
                    >
                      View Summary
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
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
