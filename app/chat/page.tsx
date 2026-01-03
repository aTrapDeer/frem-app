"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Bot, User, Loader2, Sparkles, RefreshCw, AlertCircle } from "lucide-react"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTED_QUESTIONS = [
  "How am I doing financially?",
  "What should I prioritize to reach my goals faster?",
  "How can I increase my savings rate?",
  "What's a realistic timeline for my goals?",
  "Where can I cut expenses?",
  "Should I focus on savings or paying debt first?",
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasReport, setHasReport] = useState<boolean | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Check if user has a financial report
  useEffect(() => {
    async function checkReport() {
      try {
        const response = await fetch('/api/ai-report')
        const data = await response.json()
        setHasReport(data.report && data.report.report_content !== '{}')
      } catch {
        setHasReport(false)
      }
    }
    checkReport()
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px'
    }
  }, [input])

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
        })
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        return
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('Chat error:', err)
      setError('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navbar />
        
        <main className="pt-20 pb-4 h-screen flex flex-col">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col overflow-hidden">
            
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="py-4 flex items-center justify-between"
            >
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-indigo-500" />
                  Financial Advisor Chat
                </h1>
                <p className="text-sm text-slate-600">Ask me anything about your finances</p>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearChat}
                  className="text-slate-600"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  New Chat
                </Button>
              )}
            </motion.div>

            {/* No Report Warning */}
            {hasReport === false && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
              >
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-amber-800 font-medium">Generate a Financial Report First</p>
                      <p className="text-amber-700 text-sm">
                        For the best experience, generate a financial report on the Summary page. 
                        This helps the AI understand your complete financial picture.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto rounded-xl bg-white/50 backdrop-blur-sm border border-slate-200 shadow-sm mb-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Bot className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">
                      Hi! I&apos;m your Financial Advisor
                    </h2>
                    <p className="text-slate-600 mb-6 max-w-md">
                      I have access to your income, expenses, goals, and accounts. 
                      Ask me anything about your financial situation!
                    </p>
                    
                    {/* Suggested Questions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                      {SUGGESTED_QUESTIONS.map((question, index) => (
                        <motion.button
                          key={question}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => sendMessage(question)}
                          className="text-left p-3 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-sm text-slate-700"
                        >
                          {question}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            message.role === 'user' 
                              ? 'bg-indigo-600' 
                              : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                          }`}>
                            {message.role === 'user' 
                              ? <User className="h-4 w-4 text-white" />
                              : <Bot className="h-4 w-4 text-white" />
                            }
                          </div>
                          <div className={`rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-800'
                          }`}>
                            <div className={`prose-chat ${
                              message.role === 'user' ? 'prose-chat-user text-white' : 'text-slate-800'
                            }`}>
                              <ReactMarkdown>
                                {message.content}
                              </ReactMarkdown>
                            </div>
                            <div className={`text-xs mt-2 ${
                              message.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                            }`}>
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {/* Loading indicator */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Input Area */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-2"
            >
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your finances..."
                  rows={1}
                  className="flex-1 resize-none border-0 bg-transparent p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 text-sm"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-400 px-2 pt-1">
                Press Enter to send, Shift+Enter for new line
              </p>
            </motion.div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}

