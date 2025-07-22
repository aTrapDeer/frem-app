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
import { BarChart3, Target, Zap, Play, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
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
  const { user, loading } = useAuth()
  const router = useRouter()
  const heroRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted before using motion effects
  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Show loading or redirect for authenticated users
  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
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

      {/* Hero Section */}
      <section id="hero" ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            {mounted ? (
              <DynamicMotionH1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-6xl md:text-7xl font-bold text-slate-900"
              >
                <HeroTitle />
                <br />
                <span className="gradient-text">your finances</span>
              </DynamicMotionH1>
            ) : (
              <h1 className="text-6xl md:text-7xl font-bold text-slate-900">
                Frem
                <br />
                <span className="gradient-text">your finances</span>
              </h1>
            )}

            {mounted ? (
              <DynamicMotionP
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-xl text-slate-600 max-w-2xl mx-auto"
              >
                Track daily expenses, set financial goals, and optimize your money with intelligent insights. Start your journey to financial freedom today.
              </DynamicMotionP>
            ) : (
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Track daily expenses, set financial goals, and optimize your money with intelligent insights. Start your journey to financial freedom today.
              </p>
            )}

            {mounted ? (
              <DynamicMotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <AuthButton
                  isAuthenticated={false}
                  size="lg"
                  className="bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white btn-press"
                />
                <Button size="lg" variant="outline" className="btn-press bg-transparent">
                  <Play className="mr-2 h-4 w-4" />
                  Watch Demo
                </Button>
              </DynamicMotionDiv>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <AuthButton
                  isAuthenticated={false}
                  size="lg"
                  className="bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white btn-press"
                />
                <Button size="lg" variant="outline" className="btn-press bg-transparent">
                  <Play className="mr-2 h-4 w-4" />
                  Watch Demo
                </Button>
              </div>
            )}
          </div>

          {/* Animated Chart */}
          {mounted ? (
            <DynamicMotionDiv
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="mt-16"
            >
              <AnimatedChart />
            </DynamicMotionDiv>
          ) : (
            <div className="mt-16">
              <AnimatedChart />
            </div>
          )}
        </div>
      </section>

      {/* Foundations Strip */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-slate-900 mb-16">
            Three foundations of financial freedom
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

function HeroTitle() {
  const [isHovered, setIsHovered] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <span>Frem</span>
  }

  return (
    <DynamicMotionSpan
      className="inline-block cursor-pointer"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3 }}
    >
      <DynamicMotionSpan
        animate={{
          rotateY: isHovered ? 90 : 0,
          opacity: isHovered ? 0 : 1,
        }}
        transition={{ duration: 0.3 }}
        className="inline-block"
        style={{ transformOrigin: "center" }}
      >
        Frem
      </DynamicMotionSpan>
      <DynamicMotionSpan
        animate={{
          rotateY: isHovered ? 0 : -90,
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 inline-block"
        style={{ transformOrigin: "center" }}
      >
        Forward
      </DynamicMotionSpan>
    </DynamicMotionSpan>
  )
}

function AnimatedChart() {
  const chartRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const isInView = useInView(chartRef, { once: true })

  const chartData = [20, 45, 30, 80, 60, 90, 85]

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div ref={chartRef} className="glass-card rounded-2xl p-8 max-w-2xl mx-auto">
      <div className="flex items-end justify-between h-48 space-x-2">
        {chartData.map((height, i) => (
          mounted ? (
            <DynamicMotionDiv
              key={i}
              initial={{ height: 0 }}
              animate={isInView ? { height: `${height}%` } : { height: 0 }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              className="bg-gradient-to-t from-indigo-500 to-fuchsia-600 rounded-t flex-1"
            />
          ) : (
            <div
              key={i}
              className="bg-gradient-to-t from-indigo-500 to-fuchsia-600 rounded-t flex-1"
              style={{ height: 0 }}
            />
          )
        ))}
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-slate-600">Your financial progress over time</p>
      </div>
    </div>
  )
}

function HowItWorksSection() {
  const steps = [
    {
      title: "Sign in with Google",
      description: "Get started instantly with secure Google authentication.",
    },
    {
      title: "Set your goals",
      description: "Define what financial freedom looks like for you.",
    },
    {
      title: "Track daily spending",
      description: "Log income and expenses to build financial awareness.",
    },
    {
      title: "Optimize and achieve",
      description: "Get personalized insights to reach goals faster.",
    },
  ]

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-slate-900 mb-16">
          How it works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div
              key={i}
              className="text-center"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-fuchsia-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                {i + 1}
              </div>
                              <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-600">{step.description}</p>
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
  const [dragMode, setDragMode] = useState(false)
  
  // Node positions (as percentages for responsiveness)
  const [nodePositions, setNodePositions] = useState({
    income: { x: 50, y: 15 },
    housing: { x: 25, y: 40 },
    food: { x: 40, y: 50 },
    emergency: { x: 70, y: 35 },
    investment: { x: 60, y: 65 }
  })

  // Track real-time drag positions for dynamic line updates
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number, y: number }>>({})
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  // Demo financial data
  const demoData = {
    monthlyIncome: 4500,
    monthlyExpenses: 1600,
    emergencyFundGoal: 10000,
    emergencyFundCurrent: 2800,
    investmentGoal: 800,
    dailyTarget: 150 // $150/day to stay on track
  }

  const handleNodeClick = (nodeId: string) => {
    if (!dragMode) {
      setSelectedNode(selectedNode === nodeId ? null : nodeId)
    }
  }

  const handleDragStart = (nodeId: string) => {
    setDraggedNodeId(nodeId)
  }

  const handleDrag = (nodeId: string, event: any, info: any) => {
    if (!containerRef.current) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    
    // Calculate current position based on drag offset
    const currentNodePos = nodePositions[nodeId as keyof typeof nodePositions]
    const currentX = (currentNodePos.x / 100) * containerRect.width
    const currentY = (currentNodePos.y / 100) * containerRect.height
    
    // Add the drag offset to current position
    const newX = currentX + info.offset.x
    const newY = currentY + info.offset.y
    
    // Convert to percentages for line positioning
    const newXPercent = Math.max(5, Math.min(95, (newX / containerRect.width) * 100))
    const newYPercent = Math.max(5, Math.min(95, (newY / containerRect.height) * 100))
    
    // Update drag positions for real-time line updates
    setDragPositions(prev => ({
      ...prev,
      [nodeId]: { x: newXPercent, y: newYPercent }
    }))
  }

  const handleDragEnd = (nodeId: string, event: any, info: any) => {
    if (!containerRef.current) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    
    // Use offset instead of point for better relative positioning
    // Get current position and add the drag offset
    const currentNode = Object.entries(nodePositions).find(([id]) => id === nodeId)
    if (!currentNode) return
    
    const [, currentPos] = currentNode
    const currentX = (currentPos.x / 100) * containerRect.width
    const currentY = (currentPos.y / 100) * containerRect.height
    
    // Add the drag offset to current position
    const newX = currentX + info.offset.x
    const newY = currentY + info.offset.y
    
    // Convert back to percentages with bounds checking
    const newXPercent = Math.max(5, Math.min(95, (newX / containerRect.width) * 100))
    const newYPercent = Math.max(5, Math.min(95, (newY / containerRect.height) * 100))
    
    setNodePositions(prev => ({
      ...prev,
      [nodeId]: { x: newXPercent, y: newYPercent }
    }))

    // Clean up drag state
    setDraggedNodeId(null)
    setDragPositions(prev => {
      const { [nodeId]: removed, ...rest } = prev
      return rest
    })
  }

  // Helper function to get current effective position of a node
  const getEffectiveNodePosition = (nodeId: keyof typeof nodePositions) => {
    // Use drag position if node is being dragged, otherwise use stored position
    return dragPositions[nodeId] || nodePositions[nodeId]
  }

  const getNodeInfo = (nodeId: string) => {
    switch(nodeId) {
      case 'income':
        return {
          title: 'Monthly Income',
          amount: '$4,500',
          description: 'Your total monthly earnings from all sources',
          dailyEquivalent: '$150/day average'
        }
      case 'housing':
        return {
          title: 'Housing Costs',
          amount: '$1,200',
          description: 'Rent, utilities, and housing-related expenses',
          dailyEquivalent: '$40/day impact'
        }
      case 'food':
        return {
          title: 'Food & Dining',
          amount: '$400',
          description: 'Groceries, restaurants, and meal expenses',
          dailyEquivalent: '$13.30/day impact'
        }
      case 'emergency':
        return {
          title: 'Emergency Fund',
          amount: '$2,800 / $10,000',
          description: '28% complete - building financial security',
          dailyEquivalent: 'Save $24/day to complete in 1 year'
        }
      case 'investment':
        return {
          title: 'Investment Savings',
          amount: '$800/month',
          description: 'Building wealth for the future',
          dailyEquivalent: '$26.70/day to reach goal'
        }
      default:
        return null
    }
  }

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-slate-900 mb-8">
          Your financial command center
        </h2>
        <p className="text-xl text-slate-600 text-center mb-16 max-w-3xl mx-auto">
          See exactly how much you need to earn each day to stay on track with your goals. 
          {dragMode ? 'Drag nodes to reorganize your financial flow!' : 'Click any node to explore your financial journey.'}
        </p>

        <div className="relative max-w-6xl mx-auto">
          {/* Browser Frame */}
          <div className="bg-slate-800 rounded-t-xl p-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>
            <div className="flex items-center justify-center mt-2">
              <div className="bg-slate-700 rounded px-3 py-1 text-slate-300 text-xs">
                frem.app/dashboard
              </div>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="bg-white rounded-b-xl shadow-2xl overflow-hidden">
            <div 
              ref={containerRef}
              className="w-full h-[600px] relative bg-slate-50"
            >
              {/* Dynamic Connection Lines with Spring Animation */}
              <DynamicMotionSvg
                className="absolute inset-0 w-full h-full pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* Income to Housing */}
                <DynamicMotionLine
                  x1={`${getEffectiveNodePosition('income').x}%`}
                  y1={`${getEffectiveNodePosition('income').y}%`}
                  x2={`${getEffectiveNodePosition('housing').x}%`}
                  y2={`${getEffectiveNodePosition('housing').y}%`}
                  stroke="#10b981"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ 
                    duration: 0.8, 
                    type: "spring", 
                    stiffness: 100,
                    damping: 15
                  }}
                />
                {/* Income to Food */}
                <DynamicMotionLine
                  x1={`${getEffectiveNodePosition('income').x}%`}
                  y1={`${getEffectiveNodePosition('income').y}%`}
                  x2={`${getEffectiveNodePosition('food').x}%`}
                  y2={`${getEffectiveNodePosition('food').y}%`}
                  stroke="#10b981"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ 
                    duration: 0.8, 
                    delay: 0.1,
                    type: "spring", 
                    stiffness: 100,
                    damping: 15
                  }}
                />
                {/* Income to Emergency Fund */}
                <DynamicMotionLine
                  x1={`${getEffectiveNodePosition('income').x}%`}
                  y1={`${getEffectiveNodePosition('income').y}%`}
                  x2={`${getEffectiveNodePosition('emergency').x}%`}
                  y2={`${getEffectiveNodePosition('emergency').y}%`}
                  stroke="#10b981"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ 
                    duration: 0.8, 
                    delay: 0.2,
                    type: "spring", 
                    stiffness: 100,
                    damping: 15
                  }}
                />
                {/* Emergency Fund to Investment */}
                <DynamicMotionLine
                  x1={`${getEffectiveNodePosition('emergency').x}%`}
                  y1={`${getEffectiveNodePosition('emergency').y}%`}
                  x2={`${getEffectiveNodePosition('investment').x}%`}
                  y2={`${getEffectiveNodePosition('investment').y}%`}
                  stroke="#6366f1"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ 
                    duration: 0.8, 
                    delay: 0.3,
                    type: "spring", 
                    stiffness: 100,
                    damping: 15
                  }}
                />
              </DynamicMotionSvg>

              {/* Income Node */}
              <DynamicMotionDiv
                data-node-id="income"
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${dragMode ? 'cursor-move' : 'cursor-pointer'} transition-all duration-200 hover:scale-105`}
                style={{ 
                  left: `${nodePositions.income.x}%`, 
                  top: `${nodePositions.income.y}%` 
                }}
                drag={dragMode}
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={containerRef}
                dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                onDragStart={() => handleDragStart('income')}
                onDrag={(event, info) => handleDrag('income', event, info)}
                onDragEnd={(event, info) => handleDragEnd('income', event, info)}
                whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing' }}
                dragSnapToOrigin={false}
                animate={{ 
                  scale: selectedNode === 'income' ? 1.05 : 1
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 25 
                }}
                onClick={() => handleNodeClick('income')}
              >
                <div className={`bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 shadow-lg min-w-[120px] text-center transition-all duration-200 ${selectedNode === 'income' ? 'ring-4 ring-green-300 shadow-xl' : ''}`}>
                  <TrendingUp className="h-5 w-5 text-white mx-auto mb-2" />
                  <div className="text-white font-semibold text-sm">Monthly Income</div>
                  <div className="text-white/90 text-xs mt-1">$4,500</div>
                  {dragMode && (
                    <div className="text-white/80 text-xs mt-1 font-medium">Drag me!</div>
                  )}
                </div>
              </DynamicMotionDiv>

              {/* Housing Expense */}
              <DynamicMotionDiv
                data-node-id="housing"
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${dragMode ? 'cursor-move' : 'cursor-pointer'} transition-all duration-200 hover:scale-105`}
                style={{ 
                  left: `${nodePositions.housing.x}%`, 
                  top: `${nodePositions.housing.y}%` 
                }}
                drag={dragMode}
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={containerRef}
                dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                onDragStart={() => handleDragStart('housing')}
                onDrag={(event, info) => handleDrag('housing', event, info)}
                onDragEnd={(event, info) => handleDragEnd('housing', event, info)}
                whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing' }}
                dragSnapToOrigin={false}
                animate={{ 
                  scale: selectedNode === 'housing' ? 1.05 : 1
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 25 
                }}
                onClick={() => handleNodeClick('housing')}
              >
                <div className={`bg-gradient-to-r from-red-500 to-pink-600 rounded-lg p-3 shadow-lg min-w-[100px] text-center transition-all duration-200 ${selectedNode === 'housing' ? 'ring-4 ring-red-300 shadow-xl' : ''}`}>
                  <TrendingDown className="h-4 w-4 text-white mx-auto mb-1" />
                  <div className="text-white font-semibold text-xs">Housing</div>
                  <div className="text-white/90 text-xs mt-1">$1,200</div>
                </div>
              </DynamicMotionDiv>

              {/* Food Expense */}
              <DynamicMotionDiv
                data-node-id="food"
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${dragMode ? 'cursor-move' : 'cursor-pointer'} transition-all duration-200 hover:scale-105`}
                style={{ 
                  left: `${nodePositions.food.x}%`, 
                  top: `${nodePositions.food.y}%` 
                }}
                drag={dragMode}
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={containerRef}
                dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                onDragStart={() => handleDragStart('food')}
                onDrag={(event, info) => handleDrag('food', event, info)}
                onDragEnd={(event, info) => handleDragEnd('food', event, info)}
                whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing' }}
                dragSnapToOrigin={false}
                animate={{ 
                  scale: selectedNode === 'food' ? 1.05 : 1
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 25 
                }}
                onClick={() => handleNodeClick('food')}
              >
                <div className={`bg-gradient-to-r from-red-500 to-pink-600 rounded-lg p-3 shadow-lg min-w-[100px] text-center transition-all duration-200 ${selectedNode === 'food' ? 'ring-4 ring-red-300 shadow-xl' : ''}`}>
                  <TrendingDown className="h-4 w-4 text-white mx-auto mb-1" />
                  <div className="text-white font-semibold text-xs">Food & Dining</div>
                  <div className="text-white/90 text-xs mt-1">$400</div>
                </div>
              </DynamicMotionDiv>

              {/* Emergency Fund Goal */}
              <DynamicMotionDiv
                data-node-id="emergency"
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${dragMode ? 'cursor-move' : 'cursor-pointer'} transition-all duration-200 hover:scale-105`}
                style={{ 
                  left: `${nodePositions.emergency.x}%`, 
                  top: `${nodePositions.emergency.y}%` 
                }}
                drag={dragMode}
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={containerRef}
                dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                onDragStart={() => handleDragStart('emergency')}
                onDrag={(event, info) => handleDrag('emergency', event, info)}
                onDragEnd={(event, info) => handleDragEnd('emergency', event, info)}
                whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing' }}
                dragSnapToOrigin={false}
                animate={{ 
                  scale: selectedNode === 'emergency' ? 1.05 : 1
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 25 
                }}
                onClick={() => handleNodeClick('emergency')}
              >
                <div className={`bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-3 shadow-lg min-w-[100px] text-center transition-all duration-200 ${selectedNode === 'emergency' ? 'ring-4 ring-indigo-300 shadow-xl' : ''}`}>
                  <Target className="h-4 w-4 text-white mx-auto mb-1" />
                  <div className="text-white font-semibold text-xs">Emergency Fund</div>
                  <div className="text-white/90 text-xs mt-1">$2,800</div>
                </div>
              </DynamicMotionDiv>

              {/* Investment Savings */}
              <DynamicMotionDiv
                data-node-id="investment"
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${dragMode ? 'cursor-move' : 'cursor-pointer'} transition-all duration-200 hover:scale-105`}
                style={{ 
                  left: `${nodePositions.investment.x}%`, 
                  top: `${nodePositions.investment.y}%` 
                }}
                drag={dragMode}
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={containerRef}
                dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                onDragStart={() => handleDragStart('investment')}
                onDrag={(event, info) => handleDrag('investment', event, info)}
                onDragEnd={(event, info) => handleDragEnd('investment', event, info)}
                whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing' }}
                dragSnapToOrigin={false}
                animate={{ 
                  scale: selectedNode === 'investment' ? 1.05 : 1
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 25 
                }}
                onClick={() => handleNodeClick('investment')}
              >
                <div className={`bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg p-3 shadow-lg min-w-[100px] text-center transition-all duration-200 ${selectedNode === 'investment' ? 'ring-4 ring-blue-300 shadow-xl' : ''}`}>
                  <DollarSign className="h-4 w-4 text-white mx-auto mb-1" />
                  <div className="text-white font-semibold text-xs">Investment</div>
                  <div className="text-white/90 text-xs mt-1">$800</div>
                </div>
              </DynamicMotionDiv>

              {/* Interactive Demo Label */}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
                <div className="text-xs text-slate-600 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  {dragMode ? 'Drag Mode Active - Move nodes around!' : 'Interactive Demo - Click any node'}
                </div>
              </div>

              {/* Drag Mode Toggle */}
              <div className="absolute top-4 right-16">
                <button
                  onClick={() => {
                    setDragMode(!dragMode)
                    setSelectedNode(null) // Clear selection when switching modes
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${
                    dragMode 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  {dragMode ? '🎯 Click Mode' : '✋ Drag Mode'}
                </button>
              </div>

              {/* Daily Breakdown Toggle */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setShowDailyBreakdown(!showDailyBreakdown)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200"
                >
                  Daily Breakdown
                </button>
              </div>

              {/* Node Details Panel */}
              {selectedNode && !dragMode && (
                <DynamicMotionDiv
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="absolute top-16 left-4 bg-white rounded-lg shadow-xl p-4 max-w-xs border border-slate-200 z-10"
                >
                  {(() => {
                    const nodeInfo = getNodeInfo(selectedNode)
                    return nodeInfo ? (
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2">{nodeInfo.title}</h4>
                        <p className="text-lg font-bold text-indigo-600 mb-2">{nodeInfo.amount}</p>
                        <p className="text-xs text-slate-600 mb-2">{nodeInfo.description}</p>
                        <div className="bg-slate-50 rounded p-2">
                          <p className="text-xs font-medium text-slate-700">{nodeInfo.dailyEquivalent}</p>
                        </div>
                        <button
                          onClick={() => setSelectedNode(null)}
                          className="mt-2 text-xs text-slate-500 hover:text-slate-700"
                        >
                          Close
                        </button>
                      </div>
                    ) : null
                  })()}
                </DynamicMotionDiv>
              )}

              {/* Daily Breakdown Panel */}
              {showDailyBreakdown && (
                <DynamicMotionDiv
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="absolute bottom-20 right-4 bg-white rounded-lg shadow-xl p-4 max-w-sm border border-slate-200 z-10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-900">Daily Earning Target</h4>
                    <button
                      onClick={() => setShowDailyBreakdown(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-red-50 rounded p-3">
                      <div className="text-sm font-medium text-red-700 mb-1">Daily Expenses</div>
                      <div className="text-xs text-red-600">
                        Housing: $40.00/day<br/>
                        Food: $13.30/day<br/>
                        <strong>Total: $53.30/day</strong>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded p-3">
                      <div className="text-sm font-medium text-blue-700 mb-1">Daily Goals</div>
                      <div className="text-xs text-blue-600">
                        Emergency Fund: $24.00/day<br/>
                        Investment: $26.70/day<br/>
                        <strong>Total: $50.70/day</strong>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 rounded p-3 border border-green-200">
                      <div className="text-sm font-bold text-green-700 mb-1">You need to earn:</div>
                      <div className="text-2xl font-bold text-green-600">$150/day</div>
                      <div className="text-xs text-green-600 mt-1">
                        To cover expenses ($53.30) + reach goals ($50.70) + buffer ($46)
                      </div>
                    </div>
                  </div>
                </DynamicMotionDiv>
              )}

              {/* Bottom Stats Overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 border border-slate-200 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-indigo-600">$4,500</div>
                    <div className="text-xs text-slate-600">Monthly Income</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-red-600">$1,600</div>
                    <div className="text-xs text-slate-600">Monthly Expenses</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-green-600">$2,900</div>
                    <div className="text-xs text-slate-600">Available for Goals</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-orange-600">$150</div>
                    <div className="text-xs text-slate-600">Daily Target</div>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <div className="text-xs text-slate-500">
                    ✨ {dragMode ? 'Drag nodes to reorganize' : 'Click nodes to explore'} • Physics-based financial flow
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">
              Take Control of Your Financial Journey
            </h3>
            <p className="text-slate-600 mb-6">
              Know exactly how much you need to earn each day to reach your goals. 
              Track expenses, set targets, and visualize your progress with interactive, physics-based financial flows.
            </p>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200">
              Start Your Journey
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
