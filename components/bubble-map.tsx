"use client"

import { useState, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  ZoomIn, 
  ZoomOut, 
  DollarSign, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Home, 
  Car, 
  Plane,
  GraduationCap,
  Edit3,
  Move,
  RotateCcw
} from "lucide-react"

interface BubbleMapProps {
  isDemo?: boolean
  userData?: {
    income: number
    expenses: Array<{ name: string; amount: number }>
    goals: Array<{ title: string; current_amount: number; target_amount: number }>
    sideProjects: Array<{ name: string; current_monthly_earnings: number }>
  }
}

interface Node {
  id: string
  x: number
  y: number
  type: 'income' | 'expense' | 'goal' | 'project'
  title: string
  value: number
  category?: string
  progress?: number
}

// Demo nodes with default positions
const demoNodes: Node[] = [
  { id: 'income-1', x: 20, y: 30, type: 'income', title: 'Salary', value: 5000, category: 'job' },
  { id: 'income-2', x: 30, y: 60, type: 'income', title: 'Freelance', value: 1200, category: 'side' },
  { id: 'expense-1', x: 60, y: 25, type: 'expense', title: 'Rent', value: 1800, category: 'housing' },
  { id: 'expense-2', x: 70, y: 50, type: 'expense', title: 'Food', value: 600, category: 'food' },
  { id: 'goal-1', x: 45, y: 75, type: 'goal', title: 'Emergency Fund', value: 10000, progress: 35 },
  { id: 'goal-2', x: 80, y: 80, type: 'goal', title: 'Vacation', value: 3000, progress: 60 }
]

export default function BubbleMap({ isDemo = false, userData }: BubbleMapProps) {
  const [nodes, setNodes] = useState<Node[]>(() => {
    if (isDemo) return demoNodes
    if (userData) return generateNodesFromUserData(userData)
    return demoNodes // Fallback, though empty state handles this
  })
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [scale, setScale] = useState(1)
  const [editMode, setEditMode] = useState(!isDemo) // Edit mode enabled by default for non-demo
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number, y: number }>>({})
  const containerRef = useRef<HTMLDivElement>(null)

  // Generate nodes from user data
  function generateNodesFromUserData(data: typeof userData): Node[] {
    const nodes: Node[] = []

    // Add income as a single node
    if (data && data.income > 0) {
      nodes.push({
        id: 'income-main',
        x: 20 + Math.random() * 20,
        y: 20 + Math.random() * 20,
        type: 'income',
        title: 'Monthly Income',
        value: data.income,
        category: 'main'
      })
    }

    // Add expense nodes
    data?.expenses.forEach((expense, index) => {
      nodes.push({
        id: `expense-${index}`,
        x: 50 + (index * 15) + Math.random() * 10,
        y: 25 + (index * 10) + Math.random() * 15,
        type: 'expense',
        title: expense.name,
        value: expense.amount,
        category: 'expense'
      })
    })

    // Add goal nodes
    data?.goals.forEach((goal, index) => {
      const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0
      nodes.push({
        id: `goal-${index}`,
        x: 30 + (index * 20) + Math.random() * 20,
        y: 60 + (index * 15) + Math.random() * 20,
        type: 'goal',
        title: goal.title,
        value: goal.target_amount,
        progress: Math.min(progress, 100),
        category: 'goal'
      })
    })

    // Add side project nodes
    data?.sideProjects.forEach((project, index) => {
      if (project.current_monthly_earnings > 0) {
        nodes.push({
          id: `project-${index}`,
          x: 15 + (index * 25) + Math.random() * 15,
          y: 45 + (index * 10) + Math.random() * 20,
          type: 'project',
          title: project.name,
          value: project.current_monthly_earnings,
          category: 'side'
        })
      }
    })

    return nodes
  }

  const handleNodeClick = (node: Node) => {
    if (!isDemo && !editMode) { // Only allow selection for non-demo when not in edit mode
      setSelectedNode(node)
    }
  }

  const handleDragStart = (nodeId: string) => {
    setDraggedNode(nodeId)
  }

  const handleDrag = (nodeId: string, _event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number; y: number } }) => {
    if (!containerRef.current) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    
    // Calculate current position based on drag offset
    const currentNode = nodes.find(node => node.id === nodeId)
    if (!currentNode) return
    
    const currentX = (currentNode.x / 100) * containerRect.width
    const currentY = (currentNode.y / 100) * containerRect.height
    
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

  const handleDragEnd = useCallback((nodeId: string, _event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number; y: number } }) => {
    if (!containerRef.current) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    
    // Use offset instead of point for better relative positioning
    // Get current position and add the drag offset
    const currentNode = nodes.find(node => node.id === nodeId)
    if (!currentNode) return
    
    const currentX = (currentNode.x / 100) * containerRect.width
    const currentY = (currentNode.y / 100) * containerRect.height
    
    // Add the drag offset to current position
    const newX = currentX + info.offset.x
    const newY = currentY + info.offset.y
    
    // Convert back to percentages with bounds checking
    const newXPercent = Math.max(5, Math.min(95, (newX / containerRect.width) * 100))
    const newYPercent = Math.max(5, Math.min(95, (newY / containerRect.height) * 100))
    
    setNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? { ...node, x: newXPercent, y: newYPercent }
        : node
    ))
    
    // Clean up drag state
    setDraggedNode(null)
    setDragPositions(prev => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [nodeId]: _removed, ...rest } = prev
      return rest
    })
  }, [nodes])

  // Remove the handleDrag function since it causes rubberbanding

  const resetNodePositions = () => {
    if (isDemo) {
      setNodes(demoNodes)
    } else if (userData) {
      setNodes(generateNodesFromUserData(userData))
    }
  }

  const getNodeIcon = (node: Node) => {
    switch (node.type) {
      case 'income':
        return TrendingUp
      case 'expense':
        if (node.title.toLowerCase().includes('rent') || node.title.toLowerCase().includes('housing')) return Home
        if (node.title.toLowerCase().includes('food') || node.title.toLowerCase().includes('dining')) return ShoppingCart
        if (node.title.toLowerCase().includes('car') || node.title.toLowerCase().includes('transport')) return Car
        return TrendingDown
      case 'goal':
        if (node.title.toLowerCase().includes('vacation') || node.title.toLowerCase().includes('travel')) return Plane
        if (node.title.toLowerCase().includes('education') || node.title.toLowerCase().includes('course')) return GraduationCap
        return Target
      case 'project':
        return DollarSign
      default:
        return DollarSign
    }
  }

  const getNodeColor = (node: Node) => {
    switch (node.type) {
      case 'income':
        return 'from-green-500 to-emerald-600'
      case 'expense':
        return 'from-red-500 to-pink-600'
      case 'goal':
        return 'from-indigo-500 to-purple-600'
      case 'project':
        return 'from-blue-500 to-cyan-600'
      default:
        return 'from-gray-500 to-slate-600'
    }
  }

  // Helper function to get current effective position of a node
  const getEffectiveNodePosition = (node: Node) => {
    // Use drag position if node is being dragged, otherwise use stored position
    return dragPositions[node.id] || { x: node.x, y: node.y }
  }

  // Generate connection lines based on financial flow logic
  const generateConnections = () => {
    const connections: Array<{from: Node, to: Node, type: 'flow' | 'allocation'}> = []
    
    const incomeNodes = nodes.filter(n => n.type === 'income')
    const expenseNodes = nodes.filter(n => n.type === 'expense')
    const goalNodes = nodes.filter(n => n.type === 'goal')
    
    // Connect income to expenses (money flow out)
    incomeNodes.forEach(income => {
      expenseNodes.forEach(expense => {
        connections.push({ from: income, to: expense, type: 'flow' })
      })
    })
    
    // Connect income to goals (money allocation)
    incomeNodes.forEach(income => {
      goalNodes.forEach(goal => {
        connections.push({ from: income, to: goal, type: 'allocation' })
      })
    })
    
    return connections
  }

  const isEmpty = !isDemo && (!userData || (userData.expenses.length === 0 && userData.goals.length === 0 && userData.income === 0))

  if (isEmpty) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 rounded-lg">
        <div className="text-center p-8">
          <Target className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Financial Data Yet</h3>
          <p className="text-slate-600 mb-6 max-w-md">
            Start by adding your income, expenses, and goals to see your personalized financial journey map.
          </p>
          <div className="space-y-2">
            <Button onClick={() => window.location.href = '/recurring'} className="w-full">
              Add One-Time Transactions
            </Button>
            <Button onClick={() => window.location.href = '/goals'} variant="outline" className="w-full">
              Set Financial Goals
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      <div className="flex-1 relative overflow-hidden bg-slate-50 rounded-lg" ref={containerRef}>
        {/* Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScale(Math.min(scale + 0.2, 2))}
            className="bg-white"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScale(Math.max(scale - 0.2, 0.5))}
            className="bg-white"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          {!isDemo && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditMode(!editMode)}
                className={`bg-white ${editMode ? 'ring-2 ring-indigo-500' : ''}`}
              >
                {editMode ? <Move className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={resetNodePositions}
                className="bg-white"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {editMode && !isDemo && (
          <div className="absolute top-4 left-4 z-10 bg-white rounded-lg px-3 py-2 shadow-sm text-xs text-slate-600">
            <Move className="h-3 w-3 inline mr-1" />
            Edit mode: Drag nodes to reorganize your financial flow
          </div>
        )}

        {/* Canvas */}
        <div className="w-full h-full relative" style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}>
          {/* Dynamic Connection Lines */}
          <motion.svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {generateConnections().map((connection, index) => {
              const fromPos = getEffectiveNodePosition(connection.from)
              const toPos = getEffectiveNodePosition(connection.to)
              return (
                <motion.line
                  key={`${connection.from.id}-${connection.to.id}`}
                  x1={`${fromPos.x}%`}
                  y1={`${fromPos.y}%`}
                  x2={`${toPos.x}%`}
                  y2={`${toPos.y}%`}
                  stroke={connection.type === 'flow' ? '#10b981' : '#6366f1'}
                  strokeWidth="2"
                  strokeDasharray={connection.type === 'allocation' ? '5,5' : ''}
                  opacity={draggedNode && (connection.from.id === draggedNode || connection.to.id === draggedNode) ? 0.8 : 0.4}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ 
                  duration: 0.8, 
                  delay: index * 0.1,
                  type: "spring", 
                  stiffness: 100,
                  damping: 15
                }}
              />
              )
            })}
          </motion.svg>

          {/* Nodes */}
          {nodes.map((node, index) => {
            const IconComponent = getNodeIcon(node)
            return (
              <motion.div
                key={node.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                  editMode && !isDemo ? 'cursor-move' : 'cursor-pointer'
                } transition-all duration-200`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                drag={editMode && !isDemo}
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={containerRef}
                dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                onDragStart={() => handleDragStart(node.id)}
                onDrag={(event, info) => handleDrag(node.id, event, info)}
                onDragEnd={(event, info) => handleDragEnd(node.id, event, info)}
                whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing' }}
                dragSnapToOrigin={false}
                whileHover={{ scale: editMode && !isDemo ? 1.05 : 1.02 }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: 1,
                  scale: selectedNode?.id === node.id ? 1.05 : 1,
                  rotateZ: draggedNode === node.id ? 5 : 0
                }}
                transition={{ 
                  delay: index * 0.1,
                  type: "spring", 
                  stiffness: 300, 
                  damping: 25 
                }}
                onClick={() => handleNodeClick(node)}
                data-node-id={node.id}
              >
                <div className={`bg-gradient-to-r ${getNodeColor(node)} rounded-xl p-4 shadow-lg min-w-[100px] text-center ${
                  selectedNode?.id === node.id ? 'ring-4 ring-white/50 shadow-xl' : ''
                } ${draggedNode === node.id ? 'shadow-2xl' : ''}`}>
                  <IconComponent className="h-5 w-5 text-white mx-auto mb-2" />
                  <div className="text-white font-medium text-sm truncate max-w-[80px]">
                    {node.title}
                  </div>
                  <div className="text-white/90 text-xs mt-1">
                    ${node.value.toLocaleString()}
                    {node.type === 'goal' && node.progress !== undefined && (
                      <div className="text-white/80 text-xs">{node.progress.toFixed(0)}%</div>
                    )}
                  </div>
                  {editMode && !isDemo && draggedNode === node.id && (
                    <div className="text-white/80 text-xs mt-1 font-medium animate-pulse">
                      Dragging...
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 bg-white border-l border-slate-200 p-6 overflow-y-auto">
        <div className="mb-6">
          <h3 className="font-semibold text-slate-900 mb-2">
            {isDemo ? "Financial Flow Demo" : "Financial Flow Analysis"}
          </h3>
          <p className="text-sm text-slate-600">
            {isDemo 
              ? "Explore how your money flows from income to expenses and goals." 
              : editMode
                ? "Drag nodes to reorganize your financial visualization."
                : "Click on any node to see detailed information."
            }
          </p>
        </div>

        {selectedNode && !editMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="mb-6 p-4 bg-slate-50 rounded-lg"
          >
            <h4 className="font-medium text-slate-900 mb-2">{selectedNode.title}</h4>
            <p className="text-lg font-bold text-indigo-600 mb-2">
              ${selectedNode.value.toLocaleString()}
            </p>
            {selectedNode.progress !== undefined && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Progress</span>
                  <span className="font-medium">{selectedNode.progress.toFixed(1)}%</span>
                </div>
                <Progress value={selectedNode.progress} className="h-2" />
              </div>
            )}
            <div className="mt-3">
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                selectedNode.type === 'income' ? 'bg-green-100 text-green-800' :
                selectedNode.type === 'expense' ? 'bg-red-100 text-red-800' :
                selectedNode.type === 'goal' ? 'bg-indigo-100 text-indigo-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
              </span>
            </div>
          </motion.div>
        )}

        {/* Financial Summary */}
        <div className="space-y-4">
          <div className="border border-slate-200 rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-3">Financial Overview</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total Income</span>
                <span className="font-medium text-green-600">
                  ${nodes.filter(n => n.type === 'income').reduce((sum, n) => sum + n.value, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total Expenses</span>
                <span className="font-medium text-red-600">
                  ${nodes.filter(n => n.type === 'expense').reduce((sum, n) => sum + n.value, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Available for Goals</span>
                <span className="font-medium text-indigo-600">
                  ${Math.max(0, 
                    nodes.filter(n => n.type === 'income').reduce((sum, n) => sum + n.value, 0) -
                    nodes.filter(n => n.type === 'expense').reduce((sum, n) => sum + n.value, 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Only show for demo */}
        {isDemo && (
          <div className="mt-6">
            <h4 className="font-medium text-slate-900 mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Target className="h-4 w-4 mr-2" />
                What-If Simulation
              </Button>
              <Button size="sm" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                Get Started
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
