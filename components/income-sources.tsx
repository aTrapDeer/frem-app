"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Plus, 
  DollarSign, 
  Briefcase, 
  TrendingUp, 
  TrendingDown,
  Edit,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  Info
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface IncomeSource {
  id: string
  name: string
  description: string | null
  income_type: 'salary' | 'hourly' | 'commission' | 'freelance' | 'other'
  pay_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'variable'
  base_amount: number
  hours_per_week: number
  is_commission_based: boolean
  commission_high: number
  commission_low: number
  commission_frequency_per_period: number
  estimated_monthly_low: number
  estimated_monthly_mid: number
  estimated_monthly_high: number
  status: string
  is_primary: boolean
}

interface IncomeSummary {
  sources: IncomeSource[]
  hasCommissionIncome: boolean
  totalMonthlyLow: number
  totalMonthlyMid: number
  totalMonthlyHigh: number
  primarySource: IncomeSource | null
  sourceCount: number
}

const incomeTypes = [
  { value: 'salary', label: '💼 Salary', description: 'Fixed annual/monthly salary' },
  { value: 'hourly', label: '⏰ Hourly', description: 'Paid by the hour' },
  { value: 'commission', label: '📈 Commission', description: 'Sales-based variable income' },
  { value: 'freelance', label: '💻 Freelance', description: 'Contract/project work' },
  { value: 'other', label: '📋 Other', description: 'Other income source' }
]

const payFrequencies = [
  { value: 'weekly', label: 'Weekly', multiplier: 4.33 },
  { value: 'biweekly', label: 'Bi-weekly (every 2 weeks)', multiplier: 2.17 },
  { value: 'semimonthly', label: 'Semi-monthly (twice a month)', multiplier: 2 },
  { value: 'monthly', label: 'Monthly', multiplier: 1 },
  { value: 'variable', label: 'Variable', multiplier: 1 }
]

// Commission fields with info tooltip
function CommissionFields({ 
  formData, 
  setFormData 
}: { 
  formData: {
    commission_low: string
    commission_high: string
    commission_frequency_per_period: string
    pay_frequency: string
  }
  setFormData: (data: Record<string, string | boolean>) => void 
}) {
  const [showInfo, setShowInfo] = useState(false)
  
  // Calculate preview values
  const commissionLow = parseFloat(formData.commission_low) || 0
  const commissionHigh = parseFloat(formData.commission_high) || 0
  const frequency = parseFloat(formData.commission_frequency_per_period) || 0
  
  const payFreq = payFrequencies.find(f => f.value === formData.pay_frequency)
  const multiplier = payFreq?.multiplier || 1
  const frequencyLabel = formData.pay_frequency === 'biweekly' ? 'two weeks' : 
                         formData.pay_frequency === 'semimonthly' ? 'pay period' :
                         formData.pay_frequency
  
  // Calculate monthly estimates
  const perPeriodLow = commissionLow * frequency
  const perPeriodHigh = commissionHigh * frequency
  const monthlyLow = Math.round(perPeriodLow * multiplier)
  const monthlyHigh = Math.round(perPeriodHigh * multiplier)
  const monthlyAvg = Math.round((monthlyLow + monthlyHigh) / 2)
  
  const hasValidInputs = commissionLow > 0 && commissionHigh > 0 && frequency > 0

  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-amber-800 flex items-center">
          <TrendingUp className="h-4 w-4 mr-2" />
          Commission Structure
        </h3>
        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className={`p-1.5 rounded-full transition-colors ${
            showInfo ? 'bg-blue-100 text-blue-600' : 'hover:bg-amber-100 text-amber-600'
          }`}
          title="How is this calculated?"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {/* Info Panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-2">
              <div className="font-medium text-blue-800 flex items-center gap-1.5">
                <Info className="h-4 w-4" />
                How We Calculate Your Monthly Commission
              </div>
              <div className="text-blue-700 space-y-1.5">
                <p>
                  <span className="font-medium">Step 1:</span> Multiply commission per sale by sales per period
                </p>
                <p className="pl-4 text-xs bg-blue-100 rounded px-2 py-1 font-mono">
                  ${commissionLow || '?'} × {frequency || '?'} = ${perPeriodLow || '?'} (low)
                  <br />
                  ${commissionHigh || '?'} × {frequency || '?'} = ${perPeriodHigh || '?'} (high)
                </p>
                <p>
                  <span className="font-medium">Step 2:</span> Convert to monthly ({multiplier}× for {formData.pay_frequency})
                </p>
                <p className="pl-4 text-xs bg-blue-100 rounded px-2 py-1 font-mono">
                  ${perPeriodLow || '?'} × {multiplier} = ${monthlyLow || '?'}/mo (low)
                  <br />
                  ${perPeriodHigh || '?'} × {multiplier} = ${monthlyHigh || '?'}/mo (high)
                </p>
                <p>
                  <span className="font-medium">Step 3:</span> Average for safe estimate
                </p>
                <p className="pl-4 text-xs bg-blue-100 rounded px-2 py-1 font-mono">
                  (${monthlyLow || '?'} + ${monthlyHigh || '?'}) ÷ 2 = ${monthlyAvg || '?'}/mo
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="commission_low">Low Commission</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <Input
              id="commission_low"
              type="number"
              step="0.01"
              placeholder="45"
              value={formData.commission_low}
              onChange={(e) => setFormData({ ...formData, commission_low: e.target.value })}
              className="pl-8 bg-white"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Per sale (worst case)</p>
        </div>
        
        <div>
          <Label htmlFor="commission_high">High Commission</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <Input
              id="commission_high"
              type="number"
              step="0.01"
              placeholder="75"
              value={formData.commission_high}
              onChange={(e) => setFormData({ ...formData, commission_high: e.target.value })}
              className="pl-8 bg-white"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Per sale (best case)</p>
        </div>
      </div>

      <div>
        <Label htmlFor="commission_frequency">Sales Per Pay Period</Label>
        <Input
          id="commission_frequency"
          type="number"
          step="0.5"
          placeholder="5"
          value={formData.commission_frequency_per_period}
          onChange={(e) => setFormData({ ...formData, commission_frequency_per_period: e.target.value })}
          className="bg-white"
        />
        <p className="text-xs text-slate-500 mt-1">
          Average sales you make each {frequencyLabel}
        </p>
      </div>

      {/* Live Estimate Preview */}
      {hasValidInputs && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-white border border-amber-300 rounded-lg"
        >
          <div className="text-xs text-slate-500 mb-1">Estimated Monthly Commission</div>
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-red-600 font-medium">${monthlyLow.toLocaleString()}</span>
              <span className="text-slate-400 mx-2">→</span>
              <span className="text-green-600 font-medium">${monthlyHigh.toLocaleString()}</span>
            </div>
            <div className="text-blue-600 font-bold">
              ~${monthlyAvg.toLocaleString()}/mo
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export function IncomeSources() {
  const { user } = useAuth()
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [summary, setSummary] = useState<IncomeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    income_type: 'salary' as IncomeSource['income_type'],
    pay_frequency: 'biweekly' as IncomeSource['pay_frequency'],
    base_amount: '',
    hours_per_week: '',
    is_commission_based: false,
    commission_high: '',
    commission_low: '',
    commission_frequency_per_period: '',
    is_primary: false
  })

  // Fetch income sources
  useEffect(() => {
    async function fetchData() {
      if (!user) return
      
      try {
        setLoading(true)
        const [sourcesRes, summaryRes] = await Promise.all([
          fetch('/api/income-sources'),
          fetch('/api/income-sources?summary=true')
        ])
        
        if (sourcesRes.ok && summaryRes.ok) {
          const sourcesData = await sourcesRes.json()
          const summaryData = await summaryRes.json()
          setSources(sourcesData)
          setSummary(summaryData)
        }
      } catch (error) {
        console.error('Error fetching income sources:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      income_type: 'salary',
      pay_frequency: 'biweekly',
      base_amount: '',
      hours_per_week: '',
      is_commission_based: false,
      commission_high: '',
      commission_low: '',
      commission_frequency_per_period: '',
      is_primary: false
    })
  }

  const handleAddSource = async () => {
    if (!formData.name || !user) return
    
    try {
      setSubmitting(true)
      const response = await fetch('/api/income-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          income_type: formData.income_type,
          pay_frequency: formData.pay_frequency,
          base_amount: parseFloat(formData.base_amount) || 0,
          hours_per_week: parseFloat(formData.hours_per_week) || 0,
          is_commission_based: formData.is_commission_based,
          commission_high: parseFloat(formData.commission_high) || 0,
          commission_low: parseFloat(formData.commission_low) || 0,
          commission_frequency_per_period: parseFloat(formData.commission_frequency_per_period) || 0,
          is_primary: formData.is_primary,
          status: 'active'
        })
      })
      
      if (response.ok) {
        const newSource = await response.json()
        setSources(prev => [newSource, ...prev])
        resetForm()
        setShowAddForm(false)
        
        // Refresh summary
        const summaryRes = await fetch('/api/income-sources?summary=true')
        if (summaryRes.ok) {
          setSummary(await summaryRes.json())
        }
      }
    } catch (error) {
      console.error('Error adding income source:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateSource = async () => {
    if (!editingSource) return
    
    try {
      setSubmitting(true)
      const response = await fetch('/api/income-sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSource.id,
          name: formData.name,
          description: formData.description || null,
          income_type: formData.income_type,
          pay_frequency: formData.pay_frequency,
          base_amount: parseFloat(formData.base_amount) || 0,
          hours_per_week: parseFloat(formData.hours_per_week) || 0,
          is_commission_based: formData.is_commission_based,
          commission_high: parseFloat(formData.commission_high) || 0,
          commission_low: parseFloat(formData.commission_low) || 0,
          commission_frequency_per_period: parseFloat(formData.commission_frequency_per_period) || 0,
          is_primary: formData.is_primary
        })
      })
      
      if (response.ok) {
        const updatedSource = await response.json()
        setSources(prev => prev.map(s => s.id === updatedSource.id ? updatedSource : s))
        setEditingSource(null)
        resetForm()
        
        // Refresh summary
        const summaryRes = await fetch('/api/income-sources?summary=true')
        if (summaryRes.ok) {
          setSummary(await summaryRes.json())
        }
      }
    } catch (error) {
      console.error('Error updating income source:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to remove this income source?')) return
    
    try {
      const response = await fetch(`/api/income-sources?id=${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setSources(prev => prev.filter(s => s.id !== id))
        
        // Refresh summary
        const summaryRes = await fetch('/api/income-sources?summary=true')
        if (summaryRes.ok) {
          setSummary(await summaryRes.json())
        }
      }
    } catch (error) {
      console.error('Error deleting income source:', error)
    }
  }

  const startEdit = (source: IncomeSource) => {
    setEditingSource(source)
    setFormData({
      name: source.name,
      description: source.description || '',
      income_type: source.income_type,
      pay_frequency: source.pay_frequency,
      base_amount: source.base_amount.toString(),
      hours_per_week: source.hours_per_week.toString(),
      is_commission_based: source.is_commission_based,
      commission_high: source.commission_high.toString(),
      commission_low: source.commission_low.toString(),
      commission_frequency_per_period: source.commission_frequency_per_period.toString(),
      is_primary: source.is_primary
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            <div className="h-20 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {summary && summary.sourceCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-100">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  <span>Monthly Income Estimate</span>
                </div>
                {summary.hasCommissionIncome && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                    Variable Income
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {summary.hasCommissionIncome ? (
                  <>
                    <div className="text-center p-4 bg-red-50 rounded-xl">
                      <TrendingDown className="h-5 w-5 text-red-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-slate-900">
                        {formatCurrency(summary.totalMonthlyLow)}
                      </div>
                      <div className="text-sm text-slate-600">Conservative</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                      <Briefcase className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-slate-900">
                        {formatCurrency(summary.totalMonthlyMid)}
                      </div>
                      <div className="text-sm text-slate-600">Safe Average</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <TrendingUp className="h-5 w-5 text-green-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-slate-900">
                        {formatCurrency(summary.totalMonthlyHigh)}
                      </div>
                      <div className="text-sm text-slate-600">Optimistic</div>
                    </div>
                  </>
                ) : (
                  <div className="col-span-3 text-center p-4 bg-blue-50 rounded-xl">
                    <Briefcase className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-slate-900">
                      {formatCurrency(summary.totalMonthlyMid)}
                    </div>
                    <div className="text-sm text-slate-600">Monthly Income</div>
                  </div>
                )}
              </div>
              
              {summary.hasCommissionIncome && (
                <p className="text-xs text-slate-500 mt-4 text-center">
                  💡 Your goals are calculated using the &quot;Safe Average&quot; to ensure achievability
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Income Sources List */}
      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Income Sources</span>
            <Button
              onClick={() => {
                resetForm()
                setShowAddForm(true)
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Income
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sources.length === 0 && !showAddForm ? (
            <div className="text-center py-8 text-slate-600">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <p className="mb-2">No income sources added yet</p>
              <p className="text-sm text-slate-500">
                Add your income sources to get accurate financial projections
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sources.map((source, index) => (
                <motion.div
                  key={source.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-slate-900">{source.name}</h3>
                          {source.is_primary && (
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          )}
                          {source.is_commission_based && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                              Commission
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 capitalize">
                          {source.income_type} • {source.pay_frequency.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setExpandedCard(expandedCard === source.id ? null : source.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          {expandedCard === source.id ? (
                            <ChevronUp className="h-4 w-4 text-slate-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-600" />
                          )}
                        </button>
                        <button
                          onClick={() => startEdit(source)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4 text-slate-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteSource(source.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center space-x-4">
                      {source.is_commission_based ? (
                        <>
                          <div className="text-sm">
                            <span className="text-slate-500">Range:</span>{' '}
                            <span className="font-medium text-slate-900">
                              {formatCurrency(source.estimated_monthly_low)} - {formatCurrency(source.estimated_monthly_high)}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-slate-500">Avg:</span>{' '}
                            <span className="font-bold text-blue-600">
                              {formatCurrency(source.estimated_monthly_mid)}/mo
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm">
                          <span className="font-bold text-blue-600 text-lg">
                            {formatCurrency(source.estimated_monthly_mid)}/mo
                          </span>
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {expandedCard === source.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Base Amount:</span>
                              <span className="ml-2 font-medium">
                                {formatCurrency(source.base_amount)}
                                {source.income_type === 'hourly' && '/hr'}
                              </span>
                            </div>
                            {source.income_type === 'hourly' && (
                              <div>
                                <span className="text-slate-500">Hours/Week:</span>
                                <span className="ml-2 font-medium">{source.hours_per_week}</span>
                              </div>
                            )}
                            {source.is_commission_based && (
                              <>
                                <div>
                                  <span className="text-slate-500">Commission Range:</span>
                                  <span className="ml-2 font-medium">
                                    {formatCurrency(source.commission_low)} - {formatCurrency(source.commission_high)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Sales/Period:</span>
                                  <span className="ml-2 font-medium">{source.commission_frequency_per_period}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {(showAddForm || editingSource) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowAddForm(false)
              setEditingSource(null)
              resetForm()
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingSource ? 'Edit Income Source' : 'Add Income Source'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingSource(null)
                      resetForm()
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-slate-600" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <Label htmlFor="name">Income Source Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Main Job, Side Hustle"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-white"
                    />
                  </div>

                  {/* Income Type */}
                  <div>
                    <Label>Income Type</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {incomeTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            setFormData({ 
                              ...formData, 
                              income_type: type.value as IncomeSource['income_type'],
                              is_commission_based: type.value === 'commission' ? true : formData.is_commission_based
                            })
                          }}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            formData.income_type === type.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-medium text-sm">{type.label}</div>
                          <div className="text-xs text-slate-500">{type.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pay Frequency */}
                  <div>
                    <Label htmlFor="pay_frequency">Pay Frequency</Label>
                    <select
                      id="pay_frequency"
                      value={formData.pay_frequency}
                      onChange={(e) => setFormData({ ...formData, pay_frequency: e.target.value as IncomeSource['pay_frequency'] })}
                      className="w-full p-3 border border-slate-200 rounded-lg bg-white"
                    >
                      {payFrequencies.map((freq) => (
                        <option key={freq.value} value={freq.value}>
                          {freq.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Base Amount - Hide for pure commission type */}
                  {formData.income_type !== 'commission' && (
                    <div>
                      <Label htmlFor="base_amount">
                        {formData.income_type === 'hourly' ? 'Hourly Rate' : 'Base Amount Per Pay Period'}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                        <Input
                          id="base_amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.base_amount}
                          onChange={(e) => setFormData({ ...formData, base_amount: e.target.value })}
                          className="pl-8 bg-white"
                        />
                      </div>
                      {formData.is_commission_based && (
                        <p className="text-xs text-slate-500 mt-1">
                          Fixed pay before commission (e.g., base salary)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Hours per week (for hourly) */}
                  {formData.income_type === 'hourly' && (
                    <div>
                      <Label htmlFor="hours_per_week">Hours Per Week</Label>
                      <Input
                        id="hours_per_week"
                        type="number"
                        placeholder="40"
                        value={formData.hours_per_week}
                        onChange={(e) => setFormData({ ...formData, hours_per_week: e.target.value })}
                        className="bg-white"
                      />
                    </div>
                  )}

                  {/* Commission Toggle */}
                  {formData.income_type !== 'commission' && (
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="is_commission_based"
                        checked={formData.is_commission_based}
                        onChange={(e) => setFormData({ ...formData, is_commission_based: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <Label htmlFor="is_commission_based" className="text-sm cursor-pointer">
                        This income includes variable commission
                      </Label>
                    </div>
                  )}

                  {/* Commission Fields */}
                  {(formData.is_commission_based || formData.income_type === 'commission') && (
                    <CommissionFields 
                      formData={formData} 
                      setFormData={setFormData}
                    />
                  )}

                  {/* Primary Source Toggle */}
                  <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="is_primary"
                      checked={formData.is_primary}
                      onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <Label htmlFor="is_primary" className="text-sm cursor-pointer">
                      <Star className="h-4 w-4 inline mr-1 text-amber-500" />
                      This is my primary income source
                    </Label>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingSource(null)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingSource ? handleUpdateSource : handleAddSource}
                    disabled={!formData.name || submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {submitting ? 'Saving...' : (editingSource ? 'Save Changes' : 'Add Income Source')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

