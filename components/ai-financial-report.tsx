"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lightbulb,
  DollarSign,
  ArrowRight,
  Shield,
  Zap,
  Rocket,
  Briefcase,
  PiggyBank,
  Scissors,
  ChartLine,
  ChevronRight
} from "lucide-react"

interface GoalAnalysis {
  goalName: string
  status: 'on_track' | 'at_risk' | 'needs_attention'
  analysis: string
  recommendation: string
}

interface ActionPlanItem {
  priority: number
  action: string
  impact: string
  timeframe: string
}

interface WhatIfScenario {
  scenario: string
  impact: string
  recommendation: string
}

interface GrowthOpportunity {
  category: 'investing' | 'career' | 'side_income' | 'savings' | 'expense_optimization'
  title: string
  description: string
  potentialReturn: string
  riskLevel: 'low' | 'medium' | 'high'
  effortLevel: 'minimal' | 'moderate' | 'significant'
  steps: string[]
  relevanceToGoals: string
}

interface ParsedReportContent {
  healthScore: number
  summary: string
  strengths: string[]
  concerns: string[]
  goalAnalysis: GoalAnalysis[]
  actionPlan: ActionPlanItem[]
  growthOpportunities: GrowthOpportunity[]
  monthlyBudgetAdvice: string
  whatIfScenario: WhatIfScenario
}

interface AIReport {
  id: string
  user_id: string
  report_content: string
  financial_health_score: number | null
  context_hash: string
  model_used: string
  total_monthly_income: number
  total_monthly_expenses: number
  total_goals_amount: number
  active_goals_count: number
  generated_at: string
  parsedContent: ParsedReportContent
}

// Growth Opportunity Card Component
function GrowthOpportunityCard({ opportunity, index }: { opportunity: GrowthOpportunity, index: number }) {
  const [expanded, setExpanded] = useState(false)

  const getCategoryIcon = (category: GrowthOpportunity['category']) => {
    switch (category) {
      case 'investing':
        return <ChartLine className="h-5 w-5" />
      case 'career':
        return <Briefcase className="h-5 w-5" />
      case 'side_income':
        return <Rocket className="h-5 w-5" />
      case 'savings':
        return <PiggyBank className="h-5 w-5" />
      case 'expense_optimization':
        return <Scissors className="h-5 w-5" />
      default:
        return <TrendingUp className="h-5 w-5" />
    }
  }

  const getCategoryColor = (category: GrowthOpportunity['category']) => {
    switch (category) {
      case 'investing':
        return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', gradient: 'from-blue-500 to-indigo-600' }
      case 'career':
        return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', gradient: 'from-purple-500 to-pink-600' }
      case 'side_income':
        return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', gradient: 'from-emerald-500 to-teal-600' }
      case 'savings':
        return { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', gradient: 'from-cyan-500 to-blue-600' }
      case 'expense_optimization':
        return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', gradient: 'from-orange-500 to-red-600' }
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', gradient: 'from-slate-500 to-slate-600' }
    }
  }

  const getCategoryLabel = (category: GrowthOpportunity['category']) => {
    switch (category) {
      case 'investing': return 'Investment'
      case 'career': return 'Career Growth'
      case 'side_income': return 'Side Income'
      case 'savings': return 'Savings Strategy'
      case 'expense_optimization': return 'Cost Reduction'
      default: return 'Opportunity'
    }
  }

  const getRiskColor = (risk: GrowthOpportunity['riskLevel']) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-700'
      case 'medium': return 'bg-amber-100 text-amber-700'
      case 'high': return 'bg-red-100 text-red-700'
    }
  }

  const getEffortColor = (effort: GrowthOpportunity['effortLevel']) => {
    switch (effort) {
      case 'minimal': return 'bg-green-100 text-green-700'
      case 'moderate': return 'bg-amber-100 text-amber-700'
      case 'significant': return 'bg-purple-100 text-purple-700'
    }
  }

  const colors = getCategoryColor(opportunity.category)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`rounded-xl border ${colors.border} overflow-hidden`}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full p-4 ${colors.bg} flex items-center justify-between hover:brightness-95 transition-all`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${colors.gradient} rounded-lg flex items-center justify-center text-white`}>
            {getCategoryIcon(opportunity.category)}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-900">{opportunity.title}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}>
                {getCategoryLabel(opportunity.category)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-emerald-600">
                {opportunity.potentialReturn}
              </span>
              <span className="text-slate-300">•</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getRiskColor(opportunity.riskLevel)}`}>
                {opportunity.riskLevel} risk
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getEffortColor(opportunity.effortLevel)}`}>
                {opportunity.effortLevel} effort
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white border-t border-slate-100 space-y-4">
              {/* Description */}
              <p className="text-slate-700">{opportunity.description}</p>

              {/* Steps to Take */}
              {opportunity.steps && opportunity.steps.length > 0 && (
                <div>
                  <h5 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    How to Get Started
                  </h5>
                  <ol className="space-y-2">
                    {opportunity.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-medium text-slate-600 flex-shrink-0 mt-0.5">
                          {stepIndex + 1}
                        </div>
                        <span className="text-sm text-slate-600">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Relevance to Goals */}
              {opportunity.relevanceToGoals && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-100">
                  <div className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
                        How This Helps Your Goals
                      </span>
                      <p className="text-sm text-slate-700 mt-1">{opportunity.relevanceToGoals}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function AIFinancialReport() {
  const [report, setReport] = useState<AIReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReport()
  }, [])

  const fetchReport = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/ai-report')
      const data = await response.json()
      
      if (data.report) {
        setReport(data.report)
      }
    } catch (err) {
      console.error('Error fetching report:', err)
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    try {
      setGenerating(true)
      setError(null)
      const response = await fetch('/api/ai-report', { method: 'POST' })
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
        return
      }
      
      if (data.report) {
        setReport(data.report)
      }
    } catch (err) {
      console.error('Error generating report:', err)
      setError('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500'
    if (score >= 60) return 'text-green-500'
    if (score >= 40) return 'text-amber-500'
    if (score >= 20) return 'text-orange-500'
    return 'text-red-500'
  }

  const getHealthScoreGradient = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-teal-500'
    if (score >= 60) return 'from-green-500 to-emerald-500'
    if (score >= 40) return 'from-amber-500 to-yellow-500'
    if (score >= 20) return 'from-orange-500 to-amber-500'
    return 'from-red-500 to-orange-500'
  }

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    if (score >= 20) return 'Needs Work'
    return 'Critical'
  }

  const getGoalStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'at_risk':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case 'needs_attention':
        return <Clock className="h-5 w-5 text-red-500" />
      default:
        return <Target className="h-5 w-5 text-slate-500" />
    }
  }

  const getGoalStatusBg = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-50 border-green-200'
      case 'at_risk':
        return 'bg-amber-50 border-amber-200'
      case 'needs_attention':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-slate-50 border-slate-200'
    }
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
            <span className="text-slate-300">Loading AI Financial Advisor...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No report yet - show generate button
  if (!report) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 border-slate-700 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDIwMjAiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0em0wLTZoLTJWMTBoMnY2em0tNiA2aC00djJoNHYtMnptMCA2aC00djJoNHYtMnptMCA2aC00djJoNHYtMnptMCA2aC00djJoNHYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        <CardContent className="relative p-8 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">AI Financial Advisor</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Get personalized insights and actionable recommendations based on your complete financial picture - income, goals, and expenses.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}
            <Button 
              onClick={generateReport}
              disabled={generating}
              size="lg"
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 px-8"
            >
              {generating ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing Your Finances...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Financial Report
                </>
              )}
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    )
  }

  const content = report.parsedContent

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header Card with Health Score */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 border-slate-700 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDIwMjAiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0em0wLTZoLTJ2LTRoMnY0em0wLTZoLTJWMTBoMnY2em0tNiA2aC00djJoNHYtMnptMCA2aC00djJoNHYtMnptMCA2aC00djJoNHYtMnptMCA2aC00djJoNHYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        <CardContent className="relative p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Health Score */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${getHealthScoreGradient(content.healthScore)} p-1`}>
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                    <div className="text-center">
                      <span className={`text-3xl font-bold ${getHealthScoreColor(content.healthScore)}`}>
                        {content.healthScore}
                      </span>
                      <p className="text-xs text-slate-400">/ 100</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-lg font-semibold text-white">Financial Health Score</h3>
                </div>
                <p className={`text-lg font-medium ${getHealthScoreColor(content.healthScore)}`}>
                  {getHealthScoreLabel(content.healthScore)}
                </p>
                <p className="text-sm text-slate-400 mt-1 max-w-md">{content.summary}</p>
              </div>
            </div>

            {/* Generate New Report Button */}
            <div className="flex flex-col items-end gap-2">
              <Button 
                onClick={generateReport}
                disabled={generating}
                variant="outline"
                className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white"
              >
                {generating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate New Report
                  </>
                )}
              </Button>
              <p className="text-xs text-slate-500">
                Last updated: {new Date(report.generated_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strengths and Concerns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.strengths?.map((strength, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-2"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">{strength}</span>
                </motion.li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Concerns */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              Areas to Watch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.concerns?.map((concern, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-2"
                >
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">{concern}</span>
                </motion.li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Goal Analysis */}
      {content.goalAnalysis && content.goalAnalysis.length > 0 && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Target className="h-4 w-4 text-indigo-600" />
              </div>
              Goal Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {content.goalAnalysis.map((goal, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-xl border ${getGoalStatusBg(goal.status)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getGoalStatusIcon(goal.status)}
                      <h4 className="font-semibold text-slate-900">{goal.goalName}</h4>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                      goal.status === 'on_track' ? 'bg-green-100 text-green-700' :
                      goal.status === 'at_risk' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {goal.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm mb-2">{goal.analysis}</p>
                  <div className="flex items-start gap-2 bg-white/50 rounded-lg p-2">
                    <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-700">{goal.recommendation}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Plan */}
      {content.actionPlan && content.actionPlan.length > 0 && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Zap className="h-4 w-4 text-purple-600" />
              </div>
              Your Action Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {content.actionPlan.sort((a, b) => a.priority - b.priority).map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4 p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {action.priority}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-1">{action.action}</h4>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        <span>{action.impact}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <Clock className="h-4 w-4" />
                        <span>{action.timeframe}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Growth Opportunities */}
      {content.growthOpportunities && content.growthOpportunities.length > 0 && (
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Rocket className="h-4 w-4 text-white" />
              </div>
              Opportunities to Grow
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Personalized ways to increase income, save more, and build wealth
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {content.growthOpportunities.map((opportunity, index) => (
                <GrowthOpportunityCard key={index} opportunity={opportunity} index={index} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Budget Advice */}
      {content.monthlyBudgetAdvice && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Monthly Budget Recommendation</h4>
                <p className="text-slate-700">{content.monthlyBudgetAdvice}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* What If Scenario */}
      {content.whatIfScenario && (
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">What If Scenario</h4>
                <p className="text-amber-800 font-medium mb-2">{content.whatIfScenario.scenario}</p>
                <p className="text-slate-700 mb-3">{content.whatIfScenario.impact}</p>
                <div className="flex items-start gap-2 bg-white/70 rounded-lg p-3">
                  <ArrowRight className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-700">{content.whatIfScenario.recommendation}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Metadata */}
      <div className="text-center text-xs text-slate-400 space-y-1">
        <p>Report generated using {report.model_used}</p>
        <p>
          Based on {report.active_goals_count} active goals, 
          ${report.total_monthly_income.toLocaleString()}/month income, 
          ${report.total_monthly_expenses.toLocaleString()}/month expenses
        </p>
      </div>
    </motion.div>
  )
}

