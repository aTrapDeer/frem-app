"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Bot, User, Loader2, Sparkles, AlertCircle, Plus, History, Trash2, X, Mic, PhoneOff } from "lucide-react"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

const SUGGESTED_QUESTIONS = [
  "How am I doing financially?",
  "What should I prioritize to reach my goals faster?",
  "How can I increase my savings rate?",
  "What's a realistic timeline for my goals?",
  "Where can I cut expenses?",
  "Should I focus on savings or paying debt first?",
]

function relativeTime(iso: string): string {
  const then = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`).getTime()
  const minutes = Math.round((Date.now() - then) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasReport, setHasReport] = useState<boolean | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [voiceState, setVoiceState] = useState<'off' | 'connecting' | 'live'>('off')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const micRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const endVoice = useCallback(() => {
    peerRef.current?.close()
    peerRef.current = null
    micRef.current?.getTracks().forEach(track => track.stop())
    micRef.current = null
    if (audioRef.current) audioRef.current.srcObject = null
    setVoiceState('off')
  }, [])

  // Never leave the mic open on unmount
  useEffect(() => endVoice, [endVoice])

  const appendVoiceMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    if (!content.trim()) return
    setMessages(prev => [
      ...prev,
      { id: `voice-${Date.now()}-${role}`, role, content, timestamp: new Date() },
    ])
  }, [])

  const startVoice = async () => {
    if (voiceState !== 'off') return
    setVoiceState('connecting')
    setError(null)
    try {
      const sessionResponse = await fetch('/api/realtime-session', { method: 'POST' })
      const sessionData = await sessionResponse.json()
      if (!sessionResponse.ok || !sessionData.clientSecret) {
        setError(sessionData.error ?? 'Could not start a voice session.')
        setVoiceState('off')
        return
      }

      const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
      micRef.current = mic

      const peer = new RTCPeerConnection()
      peerRef.current = peer
      mic.getTracks().forEach(track => peer.addTrack(track, mic))
      peer.ontrack = event => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0]
          void audioRef.current.play().catch(() => {})
        }
      }

      // Transcripts arrive on the event channel; they become chat messages so
      // the spoken conversation is readable afterward
      const channel = peer.createDataChannel('oai-events')
      channel.onmessage = event => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.type === 'conversation.item.input_audio_transcription.completed') {
            appendVoiceMessage('user', payload.transcript ?? '')
          }
          if (
            payload.type === 'response.output_audio_transcript.done' ||
            payload.type === 'response.audio_transcript.done'
          ) {
            appendVoiceMessage('assistant', payload.transcript ?? '')
          }
        } catch {
          // Non-JSON frames are fine to ignore
        }
      }

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)

      const answerResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionData.clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      })
      if (!answerResponse.ok) throw new Error(`SDP exchange failed (${answerResponse.status})`)
      await peer.setRemoteDescription({ type: 'answer', sdp: await answerResponse.text() })

      peer.onconnectionstatechange = () => {
        if (['failed', 'disconnected', 'closed'].includes(peer.connectionState)) endVoice()
      }
      setVoiceState('live')
    } catch (err) {
      console.error('Voice session error:', err)
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access was denied — allow it to talk to your coach.'
          : 'Could not start a voice session. Please try again.'
      )
      endVoice()
    }
  }

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/chat-conversations')
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations ?? [])
      }
    } catch {
      // History is an extra — chat works without it
    }
  }, [])

  // Check if user has a financial report + load history
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
    loadConversations()
  }, [loadConversations])

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

  // A goal card's "How do I reach this?" hands its brief through
  // sessionStorage; it is consumed exactly once and sent as the opening
  // message so the answer arrives grounded in the user's numbers.
  const briefConsumed = useRef(false)
  useEffect(() => {
    if (briefConsumed.current) return
    try {
      const brief = sessionStorage.getItem('frem-goal-brief')
      if (brief) {
        sessionStorage.removeItem('frem-goal-brief')
        briefConsumed.current = true
        void sendMessage(brief)
      }
    } catch {
      // Storage unavailable — the user simply starts the chat themselves
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
          conversationId: activeId ?? undefined,
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
      if (typeof data.conversationId === 'string') {
        setActiveId(data.conversationId)
      }
      void loadConversations()
    } catch (err) {
      console.error('Chat error:', err)
      setError('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const openConversation = async (id: string) => {
    if (id === activeId || isLoading) return
    try {
      const response = await fetch(`/api/chat-conversations/${id}`)
      if (!response.ok) return
      const data = await response.json()
      setMessages(
        (data.messages ?? []).map((m: { id: string; role: 'user' | 'assistant'; content: string; createdAt: string }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt.endsWith('Z') || m.createdAt.includes('+') ? m.createdAt : `${m.createdAt}Z`),
        }))
      )
      setActiveId(id)
      setError(null)
      setHistoryOpen(false)
    } catch {
      setError('Could not load that conversation.')
    }
  }

  const deleteConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/chat-conversations/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== id))
        if (id === activeId) startNewChat()
      }
    } catch {
      // List simply keeps the row
    }
  }

  const startNewChat = () => {
    setMessages([])
    setActiveId(null)
    setError(null)
    setHistoryOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <Button
        onClick={startNewChat}
        variant="outline"
        className="w-full justify-start gap-2 text-slate-700 mb-3 bg-white"
      >
        <Plus className="h-4 w-4" />
        New chat
      </Button>
      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
        {conversations.length === 0 ? (
          <p className="text-xs text-slate-400 px-2 pt-2">
            Past conversations will show up here.
          </p>
        ) : (
          conversations.map(conversation => (
            <div
              key={conversation.id}
              className={`group flex items-center gap-1 rounded-lg ${
                conversation.id === activeId ? 'bg-indigo-50' : 'hover:bg-slate-100'
              }`}
            >
              <button
                type="button"
                onClick={() => openConversation(conversation.id)}
                className="flex-1 min-w-0 text-left px-2.5 py-2"
              >
                <span className={`block text-sm truncate ${
                  conversation.id === activeId ? 'text-indigo-700 font-medium' : 'text-slate-700'
                }`}>
                  {conversation.title}
                </span>
                <span className="block text-[11px] text-slate-400">
                  {relativeTime(conversation.updatedAt)}
                </span>
              </button>
              <button
                type="button"
                aria-label="Delete conversation"
                onClick={() => deleteConversation(conversation.id)}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 mr-1 rounded text-slate-400 hover:text-red-600 shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <AuthGuard>
      <div className="app-surface">
        <Navbar />

        <main className="pt-16 h-screen flex overflow-hidden">

            {/* History sidebar — desktop */}
            <aside className="hidden md:flex flex-col w-72 shrink-0 bg-white border-r border-slate-200 p-4 pt-6">
              {sidebar}
            </aside>

            {/* History slide-over — mobile */}
            <AnimatePresence>
              {historyOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setHistoryOpen(false)}
                    className="md:hidden fixed inset-0 bg-slate-900/30 z-40"
                  />
                  <motion.div
                    initial={{ x: -280 }}
                    animate={{ x: 0 }}
                    exit={{ x: -280 }}
                    transition={{ type: 'tween', duration: 0.2 }}
                    className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-white z-50 p-4 pt-6 shadow-xl"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-slate-900">Chat history</span>
                      <button
                        type="button"
                        aria-label="Close history"
                        onClick={() => setHistoryOpen(false)}
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="h-[calc(100%-2.5rem)]">{sidebar}</div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Chat column */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">

              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 sm:px-8 py-3 flex items-center justify-between gap-3 border-b border-slate-200/70"
              >
                <div className="min-w-0">
                  <h1 className="page-title text-xl sm:text-2xl flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-500 shrink-0" />
                    <span className="truncate">
                      {activeId
                        ? conversations.find(c => c.id === activeId)?.title ?? 'Coach'
                        : 'Coach'}
                    </span>
                  </h1>
                  <p className="text-sm text-slate-500">Grounded in your real numbers.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryOpen(true)}
                  className="md:hidden text-slate-600 shrink-0 bg-white"
                >
                  <History className="h-4 w-4 mr-1" />
                  History
                </Button>
              </motion.div>

              {/* No Report Warning */}
              {hasReport === false && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-3xl mx-auto w-full px-4 sm:px-6 mt-4"
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
              <div className="flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center"
                    >
                      <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
                  <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
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
                              message.role === 'user' ? 'bg-indigo-600' : 'bg-slate-900'
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
                          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
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

              <div className="px-4 sm:px-6 pb-4 pt-2">
              <div className="max-w-3xl mx-auto w-full">

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
                {voiceState !== 'off' && (
                  <div className="flex items-center justify-between gap-3 px-3 py-2 mb-2 rounded-lg bg-indigo-50 border border-indigo-200">
                    <span className="flex items-center gap-2 text-sm text-indigo-700 font-medium">
                      <span className={`w-2 h-2 rounded-full ${voiceState === 'live' ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
                      {voiceState === 'live' ? 'Voice on — just talk. Transcripts land here.' : 'Connecting…'}
                    </span>
                    <button
                      type="button"
                      onClick={endVoice}
                      className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      <PhoneOff className="h-3.5 w-3.5" />
                      End
                    </button>
                  </div>
                )}
                <audio ref={audioRef} className="hidden" />
                <div className="flex gap-2 items-end">
                  <Button
                    onClick={voiceState === 'off' ? startVoice : endVoice}
                    variant="outline"
                    aria-label={voiceState === 'off' ? 'Start voice chat' : 'End voice chat'}
                    title={voiceState === 'off' ? 'Talk to your coach' : 'End voice chat'}
                    className={`rounded-lg px-3 bg-white ${
                      voiceState === 'live'
                        ? 'border-red-300 text-red-600 hover:bg-red-50'
                        : 'text-slate-600'
                    }`}
                  >
                    {voiceState === 'connecting' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
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
              </div>
            </div>
        </main>
      </div>
    </AuthGuard>
  )
}
