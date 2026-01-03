import { auth } from '@/auth'
import { 
  buildAIContext,
  getAIFinancialReport
} from '@/lib/database'
import OpenAI from 'openai'

const MODEL_NAME = 'gpt-5.2-2025-12-11'

const SYSTEM_PROMPT = `You are FREM's AI Financial Advisor - a friendly, encouraging, and practical financial coach.
You're having a conversation with a user about their financial goals and helping them make better financial decisions.

Guidelines:
- Be conversational, friendly, and encouraging
- Give specific, actionable advice based on their actual financial data
- Reference their specific goals, income, and expenses when relevant
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

function buildContextSummary(context: Awaited<ReturnType<typeof buildAIContext>>): string {
  const { incomeSources, goals, expenses, sideProjects, accounts, oneTimeIncome, metrics } = context
  
  let summary = `USER'S FINANCIAL CONTEXT:\n\n`
  
  // Income
  summary += `INCOME: $${metrics.totalMonthlyIncome.toLocaleString()}/month`
  if (incomeSources.hasVariableIncome) {
    summary += ` (variable: $${incomeSources.totalMonthlyLow.toLocaleString()}-$${incomeSources.totalMonthlyHigh.toLocaleString()})`
  }
  summary += `\n`
  
  if (incomeSources.sources.length > 0) {
    incomeSources.sources.forEach(source => {
      summary += `- ${source.name}: $${source.monthlyEstimate.mid.toLocaleString()}/mo\n`
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
      summary += `- ${e.name}: $${e.amount.toLocaleString()}\n`
    })
    if (expenses.length > 5) {
      summary += `- ...and ${expenses.length - 5} more\n`
    }
  }
  
  // Goals
  summary += `\nGOALS (${goals.length} active):\n`
  if (goals.length > 0) {
    goals.forEach(g => {
      summary += `- ${g.title}: $${g.currentAmount.toLocaleString()}/$${g.targetAmount.toLocaleString()} (${g.progressPercentage}%) - ${g.monthsRemaining} months to deadline\n`
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
  
  // Summary metrics
  summary += `\nSUMMARY:\n`
  summary += `- Monthly surplus: ${metrics.monthlySurplus >= 0 ? '+' : ''}$${metrics.monthlySurplus.toLocaleString()}\n`
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
    
    const body = await request.json()
    const { message, conversationHistory = [] } = body
    
    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 })
    }
    
    // Build financial context
    const context = await buildAIContext(session.user.id)
    const contextSummary = buildContextSummary(context)
    
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
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })
    }
    
    // Add the new user message
    messages.push({ role: 'user', content: message })
    
    // Call OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages,
      temperature: 0.7,
      max_completion_tokens: 8000 // Shorter responses for chat
    })
    
    const responseContent = completion.choices[0]?.message?.content
    
    if (!responseContent) {
      console.error('OpenAI returned empty response in chat')
      return Response.json({ 
        error: 'Failed to generate response',
        details: 'Empty response from AI'
      }, { status: 500 })
    }
    
    return Response.json({
      message: responseContent,
      usage: completion.usage
    })
  } catch (error) {
    console.error('Error in AI chat:', error)
    return Response.json({ 
      error: 'Failed to process chat',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

