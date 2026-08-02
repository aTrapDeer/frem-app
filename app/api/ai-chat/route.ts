import { auth } from '@/auth'
import { getBusinessProfile } from '@/lib/business-profile'
import { 
  buildAIContext,
  getAIFinancialReport
} from '@/lib/database'
import { getFinancialOverview, type EntityView } from '@/lib/overview'
import OpenAI from 'openai'
import { chatRequestSchema, parseBody } from '@/lib/validation'
import { AI_CHAT_LIMIT, checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import {
  appendMessages,
  createConversation,
  titleFromMessage,
} from '@/lib/chat-history'
import { generateUUID } from '@/lib/turso'
import { CHAT_ACTION_TOOLS, describeChatAction, parseChatAction, type ChatAction } from '@/lib/chat-actions'

const MODEL_NAME = 'gpt-5.2-2025-12-11'

const SYSTEM_PROMPT = `You are FREM's AI Financial Advisor - a friendly, encouraging, and practical financial coach.
You're having a conversation with a user about their financial goals and helping them make better financial decisions.

Guidelines:
- Be conversational, friendly, and encouraging
- Give specific, actionable advice based on their actual financial data
- Reference their specific goals, income, and expenses when relevant
- Measured figures outrank planned figures when they disagree; explicitly tell the user about the discrepancy
- When a business exists and personal surplus is negative while business surplus is positive, address owner pay levels with concrete dollar amounts
- Never present planned income as fact when measured income differs
- Use simple language, avoid jargon
- If they ask about something you don't have data for, acknowledge that and give general advice
- Keep responses concise but helpful (2-4 paragraphs max unless they ask for detailed analysis)
- Use dollar amounts and specific numbers when discussing their finances
- Celebrate their wins and be supportive about challenges

You have access to their complete financial profile including:
- Income sources and amounts
- Monthly expenses
- Financial goals with progress and deadlines
- Bank account balances
- Any one-time income they've received

Help them understand their finances and make progress toward their goals!`

function formatEntityReality(label: string, entity: EntityView): string[] {
  const measuredIncome =
    entity.income.measured === null
      ? 'unavailable'
      : `$${entity.income.measured.toLocaleString()}`
  const measuredExpenses =
    entity.expenses.measured === null
      ? 'unavailable'
      : `$${entity.expenses.measured.toLocaleString()}`

  return [
    `${label}:`,
    `- Income: measured ${measuredIncome}; planned $${entity.income.plan.toLocaleString()}`,
    `- Expenses: measured ${measuredExpenses}; planned $${entity.expenses.plan.toLocaleString()}`,
    `- Surplus: $${entity.surplus.value.toLocaleString()} (${entity.surplus.basis} basis, ${entity.surplus.monthsOfData} months of data)`,
  ]
}

async function buildMeasuredReality(userId: string): Promise<string> {
  let overview: Awaited<ReturnType<typeof getFinancialOverview>> | null = null
  let profile: Awaited<ReturnType<typeof getBusinessProfile>> = null

  try {
    overview = await getFinancialOverview(userId)
  } catch (error) {
    console.error('Unable to add measured overview to AI chat:', error)
  }

  try {
    profile = await getBusinessProfile(userId)
  } catch (error) {
    console.error('Unable to add business profile to AI chat:', error)
  }

  if (!overview) return ''

  const lines = [
    '',
    '',
    'MEASURED REALITY:',
    ...formatEntityReality('Personal', overview.entities.personal),
  ]

  if (overview.entities.business) {
    lines.push(...formatEntityReality('Business', overview.entities.business))
  }

  lines.push(`Owner-pay transactions pending review: ${overview.ownerPay.pendingCount}`)

  if (profile) {
    lines.push(
      `Business profile: type ${profile.business_type}; payment forms ${profile.payment_forms.join(', ') || 'none'}; ownership ${profile.ownership_percentage}%`
    )
  }

  return lines.join('\n')
}

function buildContextSummary(context: Awaited<ReturnType<typeof buildAIContext>>): string {
  const { incomeSources, goals, expenses, sideProjects, accounts, oneTimeIncome, oneTimeTransactions, metrics } = context
  
  let summary = `USER'S FINANCIAL CONTEXT:\n\n`
  
  // Income
  summary += `INCOME: $${metrics.totalMonthlyIncome.toLocaleString()}/month`
  if (incomeSources.hasVariableIncome) {
    summary += ` (variable: $${incomeSources.totalMonthlyLow.toLocaleString()}-$${incomeSources.totalMonthlyHigh.toLocaleString()})`
  }
  summary += `\n`
  
  if (incomeSources.sources.length > 0) {
    incomeSources.sources.forEach(source => {
      const description = source.description ? ` (${source.description})` : ''
      summary += `- ${source.name}: $${source.monthlyEstimate.mid.toLocaleString()}/mo${description}\n`
    })
  }
  
  if (sideProjects.length > 0) {
    summary += `Side Projects:\n`
    sideProjects.forEach(p => {
      summary += `- ${p.name}: $${p.monthlyEarnings.toLocaleString()}/mo\n`
    })
  }
  
  // Expenses
  summary += `\nEXPENSES: $${metrics.totalMonthlyExpenses.toLocaleString()}/month\n`
  if (expenses.length > 0) {
    expenses.slice(0, 5).forEach(e => {
      const description = e.description ? ` (${e.description})` : ''
      summary += `- ${e.name}: $${e.amount.toLocaleString()}${description}\n`
    })
    if (expenses.length > 5) {
      summary += `- ...and ${expenses.length - 5} more\n`
    }
  }
  
  // Goals
  summary += `\nGOALS (${goals.length} active):\n`
  if (goals.length > 0) {
    goals.forEach(g => {
      const startInfo = g.startDate ? ` (starts ${g.startDate})` : ''
      const growthInfo = g.interestRate ? ` (${g.interestRate}% growth)` : ''
      summary += `- ${g.title}: $${g.currentAmount.toLocaleString()}/$${g.targetAmount.toLocaleString()} (${g.progressPercentage}%) - ${g.monthsRemaining} months to deadline${startInfo}${growthInfo}\n`
    })
  }
  
  // Accounts
  if (accounts.totalBalance > 0) {
    summary += `\nACCOUNTS: $${accounts.totalBalance.toLocaleString()} total\n`
    summary += `- Checking: $${accounts.checking.balance.toLocaleString()}\n`
    summary += `- Savings: $${accounts.savings.balance.toLocaleString()}\n`
  }
  
  // One-time income
  if (oneTimeIncome.unappliedTotal > 0) {
    summary += `\nUNAPPLIED ONE-TIME INCOME: $${oneTimeIncome.unappliedTotal.toLocaleString()}\n`
  }

  if (oneTimeTransactions.length > 0) {
    summary += `\nONE-TIME TRANSACTIONS (CURRENT MONTH): ${oneTimeTransactions.length}\n`
    const net = oneTimeTransactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0)
    summary += `- Net impact: ${net >= 0 ? '+' : ''}$${net.toLocaleString()}\n`
  }
  
  // Summary metrics
  summary += `\nSUMMARY:\n`
  summary += `- Monthly surplus: ${metrics.monthlySurplus >= 0 ? '+' : ''}$${metrics.monthlySurplus.toLocaleString()}\n`
  summary += `- One-time net this month: ${metrics.oneTimeTransactionNet >= 0 ? '+' : ''}$${metrics.oneTimeTransactionNet.toLocaleString()}\n`
  summary += `- Savings rate: ${metrics.savingsRate}%\n`
  if (metrics.financialCushion > 0) {
    const monthsCovered = metrics.totalMonthlyObligations > 0 
      ? (metrics.financialCushion / metrics.totalMonthlyObligations).toFixed(1)
      : 'N/A'
    summary += `- Emergency cushion: $${metrics.financialCushion.toLocaleString()} (${monthsCovered} months)\n`
  }
  
  return summary
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }
    
    const requestCopy = request.clone()
    const validated = await parseBody(request, chatRequestSchema)

    if (!validated.ok) {
      return Response.json({ error: validated.error, details: validated.details }, { status: 400 })
    }

    const { message, conversationHistory } = validated.data
    const rawBody: unknown = await requestCopy.json().catch(() => null)
    const rawConversationId =
      rawBody && typeof rawBody === 'object'
        ? (rawBody as Record<string, unknown>).conversationId
        : undefined
    const requestedConversationId =
      typeof rawConversationId === 'string' && rawConversationId.length > 0
        ? rawConversationId
        : undefined

    // Bound cost before doing any paid work
    const rateLimit = await checkRateLimit(session.user.id, AI_CHAT_LIMIT)

    if (!rateLimit.allowed) {
      return Response.json(
        {
          error: 'Rate limit exceeded',
          details: `Try again after ${rateLimit.resetAt.toISOString()}`,
        },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    // Build financial context
    const context = await buildAIContext(session.user.id)
    const contextSummary =
      buildContextSummary(context) +
      await buildMeasuredReality(session.user.id)
    
    // Get existing report for additional context if available
    const existingReport = await getAIFinancialReport(session.user.id)
    let reportContext = ''
    if (existingReport?.report_content && existingReport.report_content !== '{}') {
      try {
        const parsed = JSON.parse(existingReport.report_content)
        if (parsed.summary) {
          reportContext = `\n\nPREVIOUS AI ANALYSIS SUMMARY: ${parsed.summary}`
        }
      } catch {
        // Ignore parse errors
      }
    }
    
    // Build messages array
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT + '\n\n' + contextSummary + reportContext }
    ]
    
    // Add conversation history (limit to last 10 messages to stay within context limits)
    const recentHistory = conversationHistory.slice(-10)
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content })
    }
    
    // Add the new user message
    messages.push({ role: 'user', content: message })
    
    // Call OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages,
      temperature: 0.7,
      max_completion_tokens: 8000, // Shorter responses for chat
      tools: CHAT_ACTION_TOOLS,
      tool_choice: 'auto',
    })

    const choice = completion.choices[0]?.message

    // A tool call is a PROPOSAL — nothing executes until the user confirms
    let proposedAction: (ChatAction & { label: string }) | null = null
    const toolCall = choice?.tool_calls?.[0]
    if (toolCall && toolCall.type === 'function') {
      const parsed = parseChatAction(toolCall.function.name, toolCall.function.arguments)
      if (parsed) proposedAction = { ...parsed, label: describeChatAction(parsed) }
    }

    const responseContent =
      choice?.content ??
      (proposedAction ? `I can do that for you — confirm below and it's done.` : null)

    if (!responseContent) {
      console.error('OpenAI returned empty response in chat')
      return Response.json({ 
        error: 'Failed to generate response',
        details: 'Empty response from AI'
      }, { status: 500 })
    }
    
    let conversationId = generateUUID()
    const messagesToPersist = [
      { role: 'user' as const, content: message },
      { role: 'assistant' as const, content: responseContent },
    ]

    try {
      const appendedToExisting = requestedConversationId
        ? await appendMessages(
            session.user.id,
            requestedConversationId,
            messagesToPersist
          )
        : false

      if (appendedToExisting && requestedConversationId) {
        conversationId = requestedConversationId
      } else {
        const conversation = await createConversation(
          session.user.id,
          titleFromMessage(message)
        )
        conversationId = conversation.id
        await appendMessages(session.user.id, conversationId, messagesToPersist)
      }
    } catch (error) {
      console.error('Unable to persist AI chat conversation:', error)
    }

    return Response.json({
      message: responseContent,
      usage: completion.usage,
      conversationId,
      ...(proposedAction ? { proposedAction } : {}),
    })
  } catch (error) {
    console.error('Error in AI chat:', error)
    return Response.json({ 
      error: 'Failed to process chat',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

