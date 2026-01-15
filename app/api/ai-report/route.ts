import { auth } from '@/auth'
import { 
  getAIFinancialReport, 
  createOrUpdateAIFinancialReport, 
  buildAIContext,
  generateFinancialContextHash
} from '@/lib/database'
import OpenAI from 'openai'

const MODEL_NAME = 'gpt-5.2-2025-12-11'

const SYSTEM_PROMPT = `You are FREM's AI Financial Advisor - a friendly, encouraging, and practical financial coach.
Your role is to help users achieve their financial goals by providing actionable insights based on their real financial data.

Guidelines:
- Be encouraging but realistic about their financial situation
- Focus on actionable steps with specific dollar amounts and timelines
- Acknowledge variable income challenges for commission-based earners
- Prioritize emergency funds and debt payoff when relevant
- Consider the user's specific goals and their deadlines
- Use simple language, avoid financial jargon
- Structure your response clearly with sections
- Provide a financial health score (0-100) based on their situation

Your response MUST be in the following JSON format:
{
  "healthScore": <number 0-100>,
  "summary": "<brief 2-3 sentence overview of their financial health>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "concerns": ["<concern 1>", "<concern 2>"],
  "goalAnalysis": [
    {
      "goalName": "<name>",
      "status": "on_track" | "at_risk" | "needs_attention",
      "analysis": "<brief analysis>",
      "recommendation": "<specific actionable recommendation>"
    }
  ],
  "actionPlan": [
    {
      "priority": 1,
      "action": "<specific action to take>",
      "impact": "<expected financial impact>",
      "timeframe": "<when to do this>"
    }
  ],
  "growthOpportunities": [
    {
      "category": "investing" | "career" | "side_income" | "savings" | "expense_optimization",
      "title": "<opportunity title>",
      "description": "<detailed explanation of the opportunity>",
      "potentialReturn": "<realistic estimate, e.g. '7-10% annual return' or '+$500/month'>",
      "riskLevel": "low" | "medium" | "high",
      "effortLevel": "minimal" | "moderate" | "significant",
      "steps": ["<step 1>", "<step 2>", "<step 3>"],
      "relevanceToGoals": "<how this helps achieve their specific goals>"
    }
  ],
  "monthlyBudgetAdvice": "<advice on how to allocate monthly income>",
  "whatIfScenario": {
    "scenario": "<what if scenario description>",
    "impact": "<what would happen>",
    "recommendation": "<what to do about it>"
  }
}

IMPORTANT for growthOpportunities:
- Provide 3-5 realistic opportunities tailored to their specific situation
- For investing: mention specific options like index funds (S&P 500 ~7-10% historical avg), high-yield savings accounts, I-bonds, etc.
- For career/commission: analyze their income type and suggest concrete ways to increase earnings
- For side_income: suggest realistic side hustles based on their current work/skills
- For savings: suggest better allocation strategies or automation
- For expense_optimization: identify specific areas where they could reduce spending
- Include actual percentage returns or dollar amounts where possible
- Be realistic about risk and effort required`

function generateUserPrompt(context: Awaited<ReturnType<typeof buildAIContext>>): string {
  const { incomeSources, goals, expenses, sideProjects, accounts, oneTimeIncome, oneTimeTransactions, metrics } = context
  
  let prompt = `Here's my current financial situation:\n\n`
  
  // Income section
  prompt += `**INCOME**\n`
  if (incomeSources.hasVariableIncome) {
    prompt += `- Total Monthly Income: $${metrics.totalMonthlyIncome.toLocaleString()} (variable - ranges from $${incomeSources.totalMonthlyLow.toLocaleString()} to $${incomeSources.totalMonthlyHigh.toLocaleString()})\n`
  } else {
    prompt += `- Total Monthly Income: $${metrics.totalMonthlyIncome.toLocaleString()} (fixed)\n`
  }
  
  if (incomeSources.sources.length > 0) {
    prompt += `- Income Sources:\n`
    incomeSources.sources.forEach(source => {
      const description = source.description ? ` - ${source.description}` : ''
      prompt += `  * ${source.name} (${source.type}${source.isCommissionBased ? ', commission-based' : ''}): $${source.monthlyEstimate.mid.toLocaleString()}/month${description}\n`
    })
  }
  
  if (sideProjects.length > 0) {
    prompt += `- Side Projects:\n`
    sideProjects.forEach(project => {
      prompt += `  * ${project.name}: $${project.monthlyEarnings.toLocaleString()}/month\n`
    })
  }
  
  // Bank Accounts section
  if (accounts.totalBalance > 0) {
    prompt += `\n**BANK ACCOUNTS**:\n`
    prompt += `- Checking Balance: $${accounts.checking.balance.toLocaleString()} (${accounts.checking.count} account${accounts.checking.count !== 1 ? 's' : ''})\n`
    prompt += `- Savings Balance: $${accounts.savings.balance.toLocaleString()} (${accounts.savings.count} account${accounts.savings.count !== 1 ? 's' : ''})\n`
    prompt += `- Total Available Cash: $${accounts.totalBalance.toLocaleString()}\n`
  }
  
  // One-Time Income section
  if (oneTimeIncome.totalReceived > 0) {
    prompt += `\n**ONE-TIME INCOME**:\n`
    if (oneTimeIncome.unapplied.length > 0) {
      prompt += `- Available to Apply: $${oneTimeIncome.unappliedTotal.toLocaleString()} (not yet allocated to goals)\n`
      oneTimeIncome.unapplied.forEach(income => {
        prompt += `  * ${income.description} (${income.source}): $${income.amount.toLocaleString()}\n`
      })
    }
    if (oneTimeIncome.appliedTotal > 0) {
      prompt += `- Already Applied to Goals: $${oneTimeIncome.appliedTotal.toLocaleString()}\n`
    }
  }

  if (oneTimeTransactions.length > 0) {
    const oneTimeNet = oneTimeTransactions.reduce((sum, t) => {
      return sum + (t.type === 'income' ? t.amount : -t.amount)
    }, 0)
    prompt += `\n**ONE-TIME TRANSACTIONS (CURRENT MONTH)**:\n`
    prompt += `- Net Impact: ${oneTimeNet >= 0 ? '+' : ''}$${oneTimeNet.toLocaleString()}\n`
    oneTimeTransactions.slice(0, 10).forEach(transaction => {
      const description = transaction.description ? ` - ${transaction.description}` : ''
      prompt += `  * ${transaction.type === 'income' ? 'Income' : 'Expense'}: $${transaction.amount.toLocaleString()} (${transaction.date})${description}\n`
    })
    if (oneTimeTransactions.length > 10) {
      prompt += `  * ...and ${oneTimeTransactions.length - 10} more this month\n`
    }
  }
  
  // Expenses section
  prompt += `\n**MONTHLY EXPENSES**: $${metrics.totalMonthlyExpenses.toLocaleString()}\n`
  if (expenses.length > 0) {
    expenses.forEach(expense => {
      const description = expense.description ? ` - ${expense.description}` : ''
      prompt += `- ${expense.name} (${expense.category}): $${expense.amount.toLocaleString()}${description}\n`
    })
  }
  
  // Goals section
  prompt += `\n**FINANCIAL GOALS** (${goals.length} active):\n`
  if (goals.length > 0) {
    goals.forEach(goal => {
      prompt += `- ${goal.title} (${goal.category}, ${goal.priority} priority)\n`
      prompt += `  Target: $${goal.targetAmount.toLocaleString()} | Current: $${goal.currentAmount.toLocaleString()} (${goal.progressPercentage}%)\n`
      if (goal.startDate) {
        prompt += `  Start Date: ${goal.startDate}\n`
      }
      if (goal.interestRate) {
        prompt += `  Estimated Growth: ${goal.interestRate}% annual\n`
      }
      prompt += `  Deadline: ${goal.deadline} (${goal.monthsRemaining} months remaining)\n`
      prompt += `  Monthly needed: $${goal.monthlyRequired.toLocaleString()}\n`
    })
  } else {
    prompt += `- No active goals set\n`
  }
  
  // Financial summary
  prompt += `\n**FINANCIAL SUMMARY**:\n`
  prompt += `- Monthly Income: $${metrics.totalMonthlyIncome.toLocaleString()}\n`
  prompt += `- Monthly Expenses: $${metrics.totalMonthlyExpenses.toLocaleString()}\n`
  prompt += `- Monthly Goal Requirements: $${(metrics.totalMonthlyObligations - metrics.totalMonthlyExpenses).toLocaleString()}\n`
  prompt += `- Total Monthly Obligations: $${metrics.totalMonthlyObligations.toLocaleString()}\n`
  prompt += `- Monthly Surplus/Deficit: ${metrics.monthlySurplus >= 0 ? '+' : ''}$${metrics.monthlySurplus.toLocaleString()}\n`
  prompt += `- Current Savings Rate: ${metrics.savingsRate}%\n`
  
  // Financial cushion
  if (metrics.financialCushion > 0) {
    prompt += `\n**FINANCIAL CUSHION**:\n`
    prompt += `- Savings Account Balance: $${metrics.savingsBalance.toLocaleString()}\n`
    prompt += `- Unapplied One-Time Income: $${metrics.unappliedOneTimeIncome.toLocaleString()}\n`
    prompt += `- Total Safety Net: $${metrics.financialCushion.toLocaleString()}\n`
    const monthsCovered = metrics.totalMonthlyObligations > 0 
      ? (metrics.financialCushion / metrics.totalMonthlyObligations).toFixed(1)
      : 'N/A'
    prompt += `- Months of Expenses Covered: ${monthsCovered}\n`
  }
  
  prompt += `\nPlease analyze my financial situation and provide a comprehensive report with actionable recommendations to help me achieve all my goals. Consider my savings as a safety net, and suggest how I might use my unapplied one-time income to accelerate specific goals. Provide realistic timelines and what adjustments I might need to make.`
  
  return prompt
}

// GET - Fetch existing report
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const report = await getAIFinancialReport(session.user.id)
    
    if (!report) {
      return Response.json({ report: null, message: 'No report found' }, { status: 200 })
    }
    
    // Parse the report content back to JSON
    let parsedContent
    try {
      parsedContent = JSON.parse(report.report_content)
    } catch {
      parsedContent = { summary: report.report_content }
    }
    
    return Response.json({
      report: {
        ...report,
        parsedContent
      }
    })
  } catch (error) {
    console.error('Error fetching AI report:', error)
    return Response.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}

// POST - Generate new report
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }
    
    // Build financial context
    const context = await buildAIContext(session.user.id)
    
    // Generate context hash to detect changes
    const contextHash = generateFinancialContextHash(context._rawData)
    
    // Generate the prompt
    const userPrompt = generateUserPrompt(context)
    
    // Call OpenAI API
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    console.log('Calling OpenAI with model:', MODEL_NAME)
    
    let completion
    try {
      completion = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_completion_tokens: 20000, // Reasoning models need more tokens for thinking + output (increased 25%)
        response_format: { type: 'json_object' }
      })
    } catch (apiError) {
      console.error('OpenAI API error:', apiError)
      return Response.json({ 
        error: 'OpenAI API call failed',
        details: apiError instanceof Error ? apiError.message : 'Unknown API error'
      }, { status: 500 })
    }
    
    // Log the full completion object for debugging
    console.log('OpenAI completion:', JSON.stringify(completion, null, 2))
    
    const choice = completion.choices[0]
    const responseContent = choice?.message?.content
    
    if (!responseContent) {
      console.error('OpenAI returned empty response')
      console.error('Finish reason:', choice?.finish_reason)
      console.error('Message:', JSON.stringify(choice?.message))
      return Response.json({ 
        error: 'OpenAI returned empty response',
        details: `Finish reason: ${choice?.finish_reason || 'unknown'}, Message: ${JSON.stringify(choice?.message)}`
      }, { status: 500 })
    }
    
    console.log('OpenAI response received, length:', responseContent.length)
    
    // Parse to extract health score
    let parsedResponse
    let healthScore: number | undefined
    try {
      parsedResponse = JSON.parse(responseContent)
      healthScore = parsedResponse.healthScore
    } catch {
      parsedResponse = { summary: responseContent }
    }
    
    // Save to database
    const report = await createOrUpdateAIFinancialReport(
      session.user.id,
      responseContent,
      contextHash,
      MODEL_NAME,
      {
        financialHealthScore: healthScore,
        totalMonthlyIncome: context.metrics.totalMonthlyIncome,
        totalMonthlyExpenses: context.metrics.totalMonthlyExpenses,
        totalGoalsAmount: context.metrics.totalGoalsAmount,
        activeGoalsCount: context.metrics.activeGoalsCount
      }
    )
    
    return Response.json({
      report: {
        ...report,
        parsedContent: parsedResponse
      },
      message: 'Report generated successfully'
    })
  } catch (error) {
    console.error('Error generating AI report:', error)
    return Response.json({ 
      error: 'Failed to generate report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

