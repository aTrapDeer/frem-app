"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Plus, Briefcase, DollarSign, TrendingUp } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface SideProject {
  id: string
  name: string
  description: string | null
  current_monthly_earnings: number
  projected_monthly_earnings: number
  time_invested_weekly: number
  status: "active" | "planning" | "paused" | "completed" | "cancelled"
  category: string | null
}

export function SideProjects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<SideProject[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    projected_monthly_earnings: "",
    category: "",
  })

  // Fetch side projects from API
  useEffect(() => {
    async function fetchProjects() {
      if (!user) return
      
      try {
        setLoading(true)
        const response = await fetch('/api/side-projects')
        if (response.ok) {
          const data = await response.json()
          setProjects(data)
        }
      } catch (error) {
        console.error('Error fetching side projects:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchProjects()
    }
  }, [user])

  const totalCurrentEarnings = projects.reduce((sum, project) => sum + project.current_monthly_earnings, 0)
  const totalProjectedEarnings = projects.reduce((sum, project) => sum + project.projected_monthly_earnings, 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700"
      case "planning":
        return "bg-blue-100 text-blue-700"
      case "paused":
        return "bg-indigo-100 text-indigo-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const addProject = async () => {
    if (!newProject.name || !newProject.description || !user) return
    
    try {
      setSubmitting(true)
      const response = await fetch('/api/side-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProject.name,
          description: newProject.description,
          projected_monthly_earnings: Number(newProject.projected_monthly_earnings) || 0,
          category: newProject.category || null,
          status: "planning",
          current_monthly_earnings: 0,
          time_invested_weekly: 0,
        })
      })
      
      if (response.ok) {
        const project = await response.json()
        setProjects(prev => [project, ...prev])
        setNewProject({ name: "", description: "", projected_monthly_earnings: "", category: "" })
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Error creating side project:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-slate-600">Current Monthly</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">${totalCurrentEarnings.toFixed(0)}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-slate-600">Projected Monthly</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">${totalProjectedEarnings.toFixed(0)}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-slate-600">Active Projects</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{projects.filter((p) => p.status === "active").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Side Projects</CardTitle>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              size="sm"
              className="bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Project Form */}
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-slate-50 rounded-lg space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder="e.g., Freelance Writing"
                  />
                </div>
                <div>
                  <Label htmlFor="project-category">Category</Label>
                  <Input
                    id="project-category"
                    value={newProject.category}
                    onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                    placeholder="e.g., Design, Writing, Consulting"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="project-description">Description</Label>
                <Input
                  id="project-description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Brief description of your project"
                />
              </div>
              <div>
                <Label htmlFor="projected-earnings">Projected Monthly Earnings</Label>
                <Input
                  id="projected-earnings"
                  type="number"
                  value={newProject.projected_monthly_earnings}
                  onChange={(e) => setNewProject({ ...newProject, projected_monthly_earnings: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={addProject} 
                  disabled={submitting}
                  className="bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white"
                >
                  {submitting ? "Adding..." : "Add Project"}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {/* Projects List */}
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Side Projects Yet</h3>
              <p className="text-slate-600 mb-6">Create your first side project to start tracking additional income streams.</p>
              <Button
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Project
              </Button>
            </div>
          ) : (
            projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="p-4 bg-white rounded-lg border border-slate-200 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900">{project.name}</h4>
                    <p className="text-sm text-slate-600">{project.description}</p>
                    <span className="text-xs text-slate-500">{project.category}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Current</span>
                    <p className="font-semibold text-slate-900">${project.current_monthly_earnings.toFixed(0)}/mo</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Projected</span>
                    <p className="font-semibold text-slate-900">${project.projected_monthly_earnings.toFixed(0)}/mo</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Time/Week</span>
                    <p className="font-semibold text-slate-900">{project.time_invested_weekly}h</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Progress</span>
                    <div className="mt-1">
                      <Progress 
                        value={project.projected_monthly_earnings > 0 ? (project.current_monthly_earnings / project.projected_monthly_earnings) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
