"use client"

import { useState, useRef, useEffect } from "react"
import { motion, useInView } from "framer-motion"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { FeatureCard } from "@/components/feature-card"
import { CTASection } from "@/components/cta-section"
import { AuthButton } from "@/components/auth-button"
import { useAuth } from "@/contexts/auth-context"
import { BarChart3, Target, Zap, Play, TrendingUp, TrendingDown, DollarSign, ArrowRight, Shield, PieChart } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamically import motion components to prevent SSR issues
const DynamicMotionDiv = dynamic(
  () => import("framer-motion").then((mod) => ({ default: mod.motion.div })),
  { ssr: false }
)

const DynamicMotionH1 = dynamic(
  () => import("framer-motion").then((mod) => ({ default: mod.motion.h1 })),
  { ssr: false }
)

const DynamicMotionP = dynamic(
  () => import("framer-motion").then((mod) => ({ default: mod.motion.p })),
  { ssr: false }
)

const DynamicMotionSpan = dynamic(
  () => import("framer-motion").then((mod) => ({ default: mod.motion.span })),
  { ssr: false }
)

const DynamicMotionSvg = dynamic(
  () => import("framer-motion").then((mod) => ({ default: mod.motion.svg })),
  { ssr: false }
)

const DynamicMotionLine = dynamic(
  () => import("framer-motion").then((mod) => ({ default: mod.motion.line })),
  { ssr: false }
)

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const heroRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted before using motion effects
  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  // Show loading or redirect for authenticated users
  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  // Don't render the page if user is authenticated (will redirect)
  if (user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section - Compact & Engaging */}
      <section id="hero" ref={heroRef} className="relative hero-pattern pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Hero Content */}
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            {/* Left side - Text */}
            <div className="flex-1 text-center lg:text-left pt-4">
              {mounted ? (
                <DynamicMotionDiv
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-blue-700">Smart Finance Tracking</span>
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-4">
                    Take control of
                    <span className="block gradient-text">your money</span>
                  </h1>

                  <p className="text-lg text-slate-600 mb-6 max-w-xl mx-auto lg:mx-0">
                    Track expenses, set goals, and optimize your finances with intelligent insights. See exactly what you need to earn daily to reach your dreams.
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6">
                    <AuthButton
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 btn-press"
                    />
                    <Button size="lg" variant="outline" className="btn-press border-slate-300 hover:bg-slate-50">
                      <Play className="mr-2 h-4 w-4" />
                      Watch Demo
                    </Button>
                  </div>

                  {/* Trust Indicators */}
                  <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span>Bank-level security</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span>Free to start</span>
                    </div>
                  </div>
                </DynamicMotionDiv>
              ) : (
                <div>
                  <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-700">Smart Finance Tracking</span>
                  </div>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-4">
                    Take control of
                    <span className="block gradient-text">your money</span>
                  </h1>
                  <p className="text-lg text-slate-600 mb-6 max-w-xl mx-auto lg:mx-0">
                    Track expenses, set goals, and optimize your finances with intelligent insights. See exactly what you need to earn daily to reach your dreams.
                  </p>
                </div>
              )}
            </div>

            {/* Right side - Dashboard Preview Card */}
            <div className="flex-1 w-full max-w-lg">
              {mounted ? (
                <DynamicMotionDiv
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                >
                  <DashboardCard />
                </DynamicMotionDiv>
              ) : (
                <DashboardCard />
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-12 pt-8 border-t border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: "$150", label: "Daily Target", icon: Target, color: "text-blue-600" },
                { value: "28%", label: "Goal Progress", icon: TrendingUp, color: "text-green-600" },
                { value: "$2.9k", label: "Monthly Savings", icon: DollarSign, color: "text-emerald-600" },
                { value: "12", label: "Active Goals", icon: PieChart, color: "text-cyan-600" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 mb-2 ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">
              Everything you need to succeed
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Three simple foundations to build your financial freedom
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={BarChart3}
              title="Track"
              description="Monitor every dollar with smart categorization and real-time insights."
              index={0}
            />
            <FeatureCard
              icon={Target}
              title="Plan"
              description="Set meaningful financial goals and track your progress with milestones."
              index={1}
            />
            <FeatureCard
              icon={Zap}
              title="Optimize"
              description="Get AI-powered recommendations to accelerate your financial goals."
              index={2}
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <HowItWorksSection />

      {/* Dashboard Preview */}
      <DashboardPreview />

      {/* CTA Section */}
      <CTASection />

      <Footer />
    </div>
  )
}

function DashboardCard() {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Card Header */}
      <div className="bg-slate-900 px-5 py-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div className="flex-1 text-center">
          <div className="inline-block bg-slate-800 rounded px-3 py-0.5 text-xs text-slate-400">
            frem.app/dashboard
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5">
        {/* Daily Target */}
        <div className="bg-blue-50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Today's Progress</span>
            <span className="text-xs text-blue-600 font-medium">On Track</span>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-slate-900">$127</span>
            <span className="text-slate-500 mb-1">/ $150 target</span>
          </div>
          <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }}></div>
          </div>
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-slate-500">Income</span>
            </div>
            <span className="text-lg font-semibold text-slate-900">+$450</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <span className="text-xs text-slate-500">Expenses</span>
            </div>
            <span className="text-lg font-semibold text-slate-900">-$323</span>
          </div>
        </div>

        {/* Chart Preview */}
        <div className="flex items-end justify-between h-20 gap-1.5 mb-3">
          {[35, 55, 40, 70, 50, 85, 75].map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-blue-500 rounded-t transition-all duration-500"
              style={{ 
                height: `${height}%`,
                opacity: 0.4 + (i * 0.08)
              }}
            />
          ))}
        </div>
        <p className="text-xs text-slate-500 text-center">Weekly spending trend</p>
      </div>
    </div>
  )
}

function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      title: "Sign up instantly",
      description: "Get started in seconds with secure Google authentication.",
    },
    {
      step: "02",
      title: "Set your goals",
      description: "Define what financial freedom looks like for you.",
    },
    {
      step: "03",
      title: "Track daily",
      description: "Log income and expenses to build awareness.",
    },
    {
      step: "04",
      title: "Achieve more",
      description: "Get insights to reach your goals faster.",
    },
  ]

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Get started in minutes
          </h2>
          <p className="text-slate-600">
            Four simple steps to financial clarity
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item, i) => (
            <div
              key={i}
              className="relative bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="text-4xl font-bold text-blue-100 mb-3">{item.step}</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-600">{item.description}</p>
              {i < steps.length - 1 && (
                <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300 z-10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function DashboardPreview() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [showDailyBreakdown, setShowDailyBreakdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const nodePositions = {
    income: { x: 50, y: 15 },
    housing: { x: 25, y: 45 },
    food: { x: 40, y: 55 },
    emergency: { x: 70, y: 40 },
    investment: { x: 60, y: 70 }
  }

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(selectedNode === nodeId ? null : nodeId)
  }

  const getNodeInfo = (nodeId: string) => {
    switch(nodeId) {
      case 'income':
        return { title: 'Monthly Income', amount: '$4,500', description: 'Your total monthly earnings', dailyEquivalent: '$150/day average' }
      case 'housing':
        return { title: 'Housing', amount: '$1,200', description: 'Rent and utilities', dailyEquivalent: '$40/day impact' }
      case 'food':
        return { title: 'Food & Dining', amount: '$400', description: 'Groceries and restaurants', dailyEquivalent: '$13/day impact' }
      case 'emergency':
        return { title: 'Emergency Fund', amount: '$2,800', description: '28% of $10k goal', dailyEquivalent: 'Save $24/day' }
      case 'investment':
        return { title: 'Investments', amount: '$800', description: 'Monthly contribution', dailyEquivalent: '$27/day to goal' }
      default:
        return null
    }
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Your financial command center
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Visualize your money flow and see exactly how much you need daily to reach your goals.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Browser Frame */}
          <div className="bg-slate-800 rounded-t-xl p-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <div className="flex-1 text-center">
                <div className="inline-block bg-slate-700 rounded px-3 py-1 text-xs text-slate-300">
                  frem.app/dashboard
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="bg-slate-50 rounded-b-xl shadow-2xl overflow-hidden border border-slate-200 border-t-0">
            <div ref={containerRef} className="w-full h-[450px] relative">
              {/* Connection Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line x1="50%" y1="15%" x2="25%" y2="45%" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.3" />
                <line x1="50%" y1="15%" x2="40%" y2="55%" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.3" />
                <line x1="50%" y1="15%" x2="70%" y2="40%" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.3" />
                <line x1="70%" y1="40%" x2="60%" y2="70%" stroke="#0ea5e9" strokeWidth="2" strokeOpacity="0.3" />
              </svg>

              {/* Income Node */}
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-105"
                style={{ left: `${nodePositions.income.x}%`, top: `${nodePositions.income.y}%` }}
                onClick={() => handleNodeClick('income')}
              >
                <div className={`bg-green-500 rounded-xl p-4 shadow-lg min-w-[130px] text-center ${selectedNode === 'income' ? 'ring-4 ring-green-200' : ''}`}>
                  <TrendingUp className="h-5 w-5 text-white mx-auto mb-2" />
                  <div className="text-white font-semibold text-sm">Monthly Income</div>
                  <div className="text-white/90 text-xs mt-1">$4,500</div>
                </div>
              </div>

              {/* Housing Node */}
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-105"
                style={{ left: `${nodePositions.housing.x}%`, top: `${nodePositions.housing.y}%` }}
                onClick={() => handleNodeClick('housing')}
              >
                <div className={`bg-red-400 rounded-lg p-3 shadow-lg min-w-[100px] text-center ${selectedNode === 'housing' ? 'ring-4 ring-red-200' : ''}`}>
                  <TrendingDown className="h-4 w-4 text-white mx-auto mb-1" />
                  <div className="text-white font-semibold text-xs">Housing</div>
                  <div className="text-white/90 text-xs mt-1">$1,200</div>
                </div>
              </div>

              {/* Food Node */}
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-105"
                style={{ left: `${nodePositions.food.x}%`, top: `${nodePositions.food.y}%` }}
                onClick={() => handleNodeClick('food')}
              >
                <div className={`bg-red-400 rounded-lg p-3 shadow-lg min-w-[100px] text-center ${selectedNode === 'food' ? 'ring-4 ring-red-200' : ''}`}>
                  <TrendingDown className="h-4 w-4 text-white mx-auto mb-1" />
                  <div className="text-white font-semibold text-xs">Food</div>
                  <div className="text-white/90 text-xs mt-1">$400</div>
                </div>
              </div>

              {/* Emergency Node */}
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-105"
                style={{ left: `${nodePositions.emergency.x}%`, top: `${nodePositions.emergency.y}%` }}
                onClick={() => handleNodeClick('emergency')}
              >
                <div className={`bg-blue-500 rounded-lg p-3 shadow-lg min-w-[100px] text-center ${selectedNode === 'emergency' ? 'ring-4 ring-blue-200' : ''}`}>
                  <Target className="h-4 w-4 text-white mx-auto mb-1" />
                  <div className="text-white font-semibold text-xs">Emergency</div>
                  <div className="text-white/90 text-xs mt-1">$2,800</div>
                </div>
              </div>

              {/* Investment Node */}
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-105"
                style={{ left: `${nodePositions.investment.x}%`, top: `${nodePositions.investment.y}%` }}
                onClick={() => handleNodeClick('investment')}
              >
                <div className={`bg-cyan-500 rounded-lg p-3 shadow-lg min-w-[100px] text-center ${selectedNode === 'investment' ? 'ring-4 ring-cyan-200' : ''}`}>
                  <DollarSign className="h-4 w-4 text-white mx-auto mb-1" />
                  <div className="text-white font-semibold text-xs">Investment</div>
                  <div className="text-white/90 text-xs mt-1">$800</div>
                </div>
              </div>

              {/* Interactive Label */}
              <div className="absolute top-4 left-4 bg-white rounded-lg px-3 py-2 shadow-sm border border-slate-200">
                <div className="text-xs text-slate-600 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Click any node to explore
                </div>
              </div>

              {/* Daily Breakdown Button */}
              <button
                onClick={() => setShowDailyBreakdown(!showDailyBreakdown)}
                className="absolute top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              >
                Daily Breakdown
              </button>

              {/* Node Details Panel */}
              {selectedNode && (
                <div className="absolute top-16 left-4 bg-white rounded-lg shadow-xl p-4 max-w-xs border border-slate-200 z-10">
                  {(() => {
                    const info = getNodeInfo(selectedNode)
                    return info ? (
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-1">{info.title}</h4>
                        <p className="text-xl font-bold text-blue-600 mb-2">{info.amount}</p>
                        <p className="text-xs text-slate-600 mb-2">{info.description}</p>
                        <div className="bg-slate-50 rounded p-2">
                          <p className="text-xs font-medium text-slate-700">{info.dailyEquivalent}</p>
                        </div>
                        <button onClick={() => setSelectedNode(null)} className="mt-2 text-xs text-slate-500 hover:text-slate-700">
                          Close
                        </button>
                      </div>
                    ) : null
                  })()}
                </div>
              )}

              {/* Daily Breakdown Panel */}
              {showDailyBreakdown && (
                <div className="absolute bottom-20 right-4 bg-white rounded-lg shadow-xl p-4 max-w-sm border border-slate-200 z-10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-900">Daily Target</h4>
                    <button onClick={() => setShowDailyBreakdown(false)} className="text-slate-400 hover:text-slate-600">×</button>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-red-50 rounded p-3">
                      <div className="text-sm font-medium text-red-700 mb-1">Expenses</div>
                      <div className="text-xs text-red-600">$53.30/day</div>
                    </div>
                    <div className="bg-blue-50 rounded p-3">
                      <div className="text-sm font-medium text-blue-700 mb-1">Goals</div>
                      <div className="text-xs text-blue-600">$50.70/day</div>
                    </div>
                    <div className="bg-green-50 rounded p-3 border border-green-200">
                      <div className="text-sm font-bold text-green-700 mb-1">You need:</div>
                      <div className="text-2xl font-bold text-green-600">$150/day</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Stats */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 border border-slate-200 shadow-lg">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-slate-900">$4,500</div>
                    <div className="text-xs text-slate-500">Income</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-red-500">$1,600</div>
                    <div className="text-xs text-slate-500">Expenses</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-500">$2,900</div>
                    <div className="text-xs text-slate-500">Available</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-600">$150</div>
                    <div className="text-xs text-slate-500">Daily Target</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
