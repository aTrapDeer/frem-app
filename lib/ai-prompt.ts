import { buildAIContext } from '@/lib/database'
import { getFinancialOverview } from '@/lib/overview'

/**
 * The coach's voice — shared by the text chat and the realtime voice session
 * so the two can never drift apart.
 */
export const COACH_SYSTEM_PROMPT = `You are FREM's AI Financial Advisor - a friendly, encouraging, and practical financial coach.
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
- Explain financial vehicles and trade-offs; never recommend specific products. Decisions belong with a licensed professional.
- Use dollar amounts and specific numbers when discussing their finances
- Celebrate their wins and be supportive about challenges`

/**
 * Compact instruction block for the realtime voice session: the coach prompt,
 * spoken-conversation guidance, and the user's measured reality. Voice context
 * stays tight — long tables read badly aloud.
 */
export async function buildVoiceInstructions(userId: string): Promise<string> {
  const [context, overview] = await Promise.all([
    buildAIContext(userId).catch(() => null),
    getFinancialOverview(userId).catch(() => null),
  ])

  const lines: string[] = [
    COACH_SYSTEM_PROMPT,
    '',
    'VOICE MODE: You are speaking aloud. Keep answers short (2-4 sentences), warm, and concrete.',
    'Round dollar amounts when speaking. Offer to go deeper rather than monologuing.',
  ]

  if (overview) {
    const personal = overview.entities.personal
    lines.push('', "USER'S MEASURED REALITY:")
    lines.push(
      `Personal: income ${personal.income.measured !== null ? `$${Math.round(personal.income.measured)}` : `planned $${Math.round(personal.income.plan)}`}/mo, ` +
        `expenses ${personal.expenses.measured !== null ? `$${Math.round(personal.expenses.measured)}` : `planned $${Math.round(personal.expenses.plan)}`}/mo, ` +
        `surplus $${Math.round(personal.surplus.value)}/mo (${personal.surplus.basis})`
    )
    const business = overview.entities.business
    if (business) {
      lines.push(
        `Business: income $${Math.round(business.income.measured ?? business.income.plan)}/mo, ` +
          `expenses $${Math.round(business.expenses.measured ?? business.expenses.plan)}/mo, ` +
          `surplus $${Math.round(business.surplus.value)}/mo (${business.surplus.basis})`
      )
    }
  }

  if (context?.goals?.length) {
    lines.push('', 'GOALS:')
    for (const goal of context.goals.slice(0, 6)) {
      lines.push(
        `- ${goal.title}: $${Math.round(goal.currentAmount).toLocaleString()} of $${Math.round(goal.targetAmount).toLocaleString()}${goal.deadline ? ` by ${goal.deadline}` : ''}`
      )
    }
  }

  return lines.join('\n')
}
