# AI Financial Advisor Feature - Design Document

> **Status**: ✅ Implemented (Phase 1 MVP)  
> **Priority**: High  
> **Target**: Summary Page

---

## Overview

Integrate an AI-powered financial advisor (via ChatGPT API) that provides personalized insights, recommendations, and strategies based on the user's complete financial picture including income sources, goals, expenses, and historical patterns.

---

## Core Concept

The AI advisor will analyze the user's financial data holistically and provide:

1. **Goal Achievability Analysis** - Is this goal realistic given current income?
2. **Timeline Optimization** - Can goals be achieved faster? Should deadlines be extended?
3. **Budget Reallocation Suggestions** - Which expenses could be reduced to accelerate goals?
4. **Income Strategy Recommendations** - How to leverage variable income (commission) more effectively
5. **Risk Assessment** - What happens if income drops to the "conservative" estimate?

---

## Data Context to Feed the AI

```typescript
interface AIContext {
  // Income Sources
  incomeSources: {
    totalMonthlyLow: number;
    totalMonthlyMid: number; 
    totalMonthlyHigh: number;
    hasVariableIncome: boolean;
    sources: Array<{
      name: string;
      type: 'salary' | 'hourly' | 'commission' | 'freelance';
      isCommissionBased: boolean;
      monthlyEstimate: { low: number; mid: number; high: number };
    }>;
  };

  // Goals
  goals: Array<{
    title: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string;
    monthsRemaining: number;
    monthlyRequired: number;
    category: string;
  }>;

  // Recurring Expenses
  expenses: Array<{
    name: string;
    amount: number;
    frequency: string;
    category: string;
    isEssential: boolean; // User-tagged or AI-inferred
  }>;

  // Side Projects
  sideProjects: Array<{
    name: string;
    monthlyEarnings: number;
    status: 'active' | 'paused';
  }>;

  // Financial Health Metrics
  metrics: {
    totalMonthlyObligations: number;
    monthlySurplusDeficit: number;
    dailyTarget: number;
    savingsRate: number; // percentage of income going to goals
    expenseToIncomeRatio: number;
  };

  // Historical Data (if available)
  history?: {
    averageMonthlyIncome: number;
    incomeVariability: number; // standard deviation
    averageMonthlySpending: number;
    goalCompletionRate: number;
  };
}
```

---

## AI Prompt Engineering Strategy

### System Prompt
```
You are FREM's AI Financial Advisor - a friendly, encouraging, and practical financial coach. 
Your role is to help users achieve their financial goals by providing actionable insights based on their real data.

Guidelines:
- Be encouraging but realistic
- Focus on actionable steps, not generic advice
- Acknowledge variable income challenges for commission-based earners
- Prioritize emergency funds and debt payoff when relevant
- Consider the user's specific goals and timeline
- Suggest concrete dollar amounts and timelines
- Use simple language, avoid jargon
```

### User Prompt Template
```
Here's my current financial situation:

**Income**: $X/month (${hasVariableIncome ? 'variable - ranges from $LOW to $HIGH' : 'fixed'})
**Monthly Obligations**: $X (goals) + $X (expenses) = $X total
**Monthly Surplus/Deficit**: $X
**Current Goals**: [List with deadlines and progress]
**Expenses**: [Categorized list]

Based on this, please provide:
1. A brief assessment of my financial health
2. Which goal should I prioritize and why?
3. One specific way I could reach my goals faster
4. A "what if" scenario - what if my income dropped to the conservative estimate?
```

---

## UI/UX Design

### Dashboard Integration

```
┌─────────────────────────────────────────────────────────┐
│  🤖 AI Financial Insights                        [Ask] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  "Based on your $651/month commission income and your  │
│   $500 emergency fund goal, you're on track to reach   │
│   it by March 15th - 2 weeks ahead of schedule!        │
│                                                         │
│   💡 Quick Win: If you make just 1 extra sale this     │
│   month, you could finish your emergency fund by       │
│   February 28th."                                       │
│                                                         │
│  ───────────────────────────────────────────────────   │
│  [See detailed analysis] [Ask a question]              │
└─────────────────────────────────────────────────────────┘
```

### Summary Page Integration

A dedicated "AI Coach" section that provides:

1. **Financial Health Score** (1-100) with explanation
2. **Top 3 Recommendations** with specific actions
3. **Goal Timeline Visualization** with AI-suggested optimizations
4. **"What If" Scenarios** - interactive sliders to see impact of changes

### Chat Interface (Optional Future Feature)

Allow users to ask specific questions:
- "Can I afford a $200/month car payment?"
- "How long until I can take a $2,000 vacation?"
- "Should I pause my investment goal to pay off debt faster?"

---

## Implementation Phases

### Phase 1: Basic Insights (MVP)
- Generate a single summary insight on dashboard load
- No chat interface, just a refreshable card
- Cache results for 24 hours or until data changes
- Simple prompt with core metrics only

### Phase 2: Detailed Analysis
- Add full analysis on Summary page
- Include "What If" scenarios
- Add goal prioritization recommendations
- Track if advice was helpful (thumbs up/down)

### Phase 3: Interactive Chat
- Add conversational interface
- Allow follow-up questions
- Save conversation history
- Context-aware responses based on recent transactions

### Phase 4: Proactive Notifications
- Alert when goals are at risk
- Celebrate milestones and achievements
- Warn when spending patterns change
- Suggest adjustments based on income changes

---

## Technical Implementation

### API Route: `/api/ai-insights`

```typescript
// app/api/ai-insights/route.ts
import { OpenAI } from 'openai';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Gather all user financial data
  const context = await buildAIContext(session.user.id);
  
  // Generate prompt
  const prompt = generatePrompt(context);
  
  // Call OpenAI API
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 500
  });

  return Response.json({
    insight: completion.choices[0].message.content,
    generatedAt: new Date().toISOString(),
    contextSummary: {
      monthlyIncome: context.incomeSources.totalMonthlyMid,
      monthlyObligations: context.metrics.totalMonthlyObligations,
      activeGoals: context.goals.length
    }
  });
}
```

### Caching Strategy

```typescript
// Cache insights in database with timestamp
interface CachedInsight {
  userId: string;
  insight: string;
  contextHash: string; // Hash of financial data to detect changes
  generatedAt: Date;
  expiresAt: Date; // 24 hours from generation
}

// Regenerate if:
// 1. No cached insight exists
// 2. Cache has expired (>24 hours old)
// 3. Financial data has changed (contextHash mismatch)
```

---

## Cost Considerations

### OpenAI API Costs (Estimated)

| Model | Input Cost | Output Cost | Est. per User/Day |
|-------|------------|-------------|-------------------|
| GPT-4 Turbo | $0.01/1K tokens | $0.03/1K tokens | ~$0.02 |
| GPT-3.5 Turbo | $0.0005/1K tokens | $0.0015/1K tokens | ~$0.001 |

**Recommendation**: Use GPT-4 for quality, with 24-hour caching to control costs.

### Rate Limiting

- Free tier: 1 insight refresh per 24 hours
- Premium tier: 5 insights per day + chat functionality
- All users: 1 concurrent request max

---

## Privacy & Security

1. **No PII in prompts** - Only aggregate financial numbers, no names/descriptions
2. **User consent** - Opt-in feature with clear data usage explanation
3. **Data retention** - AI responses cached locally, not sent back to OpenAI
4. **Encryption** - All API calls over HTTPS, sensitive data never logged

---

## Success Metrics

- **Engagement**: % of users viewing AI insights
- **Helpfulness**: Thumbs up/down ratio on recommendations
- **Goal Achievement**: Did users following AI advice reach goals faster?
- **Retention**: Do users with AI insights have higher app retention?

---

## Example AI Responses

### Scenario 1: Commission-Based Income with Emergency Fund Goal

> **Your Financial Snapshot** 📊
> 
> With your commission income ranging from $488-$814/month, I'm using your safe average of $651 for planning. Smart choice!
>
> **The Good News** ✨
> Your $1,000 emergency fund goal is achievable by March 15th - you're already 23% there!
>
> **My Top Suggestion** 💡
> Your current daily target is $21.37. If you can close 1 extra sale this pay period (pushing closer to your $75/sale high end), you could finish your emergency fund 2 weeks early and start on your vacation goal.
>
> **Watch Out** ⚠️
> If sales slow down to your conservative estimate ($488/month), you'd need to extend your deadline by about 3 weeks. Consider keeping a small buffer.

### Scenario 2: Multiple Goals, Tight Budget

> **Honest Assessment** 🎯
> 
> You have 3 active goals totaling $15,000, but your current monthly surplus is only $127. Let's strategize!
>
> **Priority Order I'd Suggest**:
> 1. **Emergency Fund** ($1,000) - Finish this first. 8 months at current pace.
> 2. **Credit Card Payoff** - The 19% interest is costing you $23/month. Tackle this next.
> 3. **Vacation** - Nice to have, but consider pausing until #1 and #2 are done.
>
> **Quick Win** 💡
> Your streaming subscriptions total $45/month. Pausing 2 of them would cut 1 month off your emergency fund timeline.

---

## Open Questions

1. **Should we offer a "financial personality" quiz** to customize AI tone?
2. **Should insights be shareable** (for accountability partners)?
3. **How do we handle users with no income sources** entered?
4. **Should we integrate with goal creation** to suggest realistic targets?

---

## Next Steps

1. [x] Review and approve this design document
2. [ ] Set up OpenAI API key in environment (`OPENAI_API_KEY`)
3. [x] Build `/api/ai-report` endpoint with comprehensive prompt
4. [x] Create `AIFinancialReport` component for Summary page
5. [x] Add database storage for reports (`ai_financial_reports` table)
6. [ ] Run database migration: `npm run db:setup`
7. [ ] Test with various financial scenarios
8. [ ] Gather user feedback on MVP
9. [ ] Iterate on prompt engineering based on feedback

---

## Implementation Notes (Phase 1 MVP)

### Files Created/Modified

1. **Database Schema** (`scripts/setup-database.ts`)
   - Added `ai_financial_reports` table for storing reports

2. **Database Functions** (`lib/database.ts`)
   - `getAIFinancialReport()` - Fetch existing report for user
   - `createOrUpdateAIFinancialReport()` - Save/update report
   - `buildAIContext()` - Build comprehensive financial context for AI
   - `generateFinancialContextHash()` - Detect data changes

3. **API Route** (`app/api/ai-report/route.ts`)
   - `GET` - Fetch existing report
   - `POST` - Generate new report using OpenAI API
   - Uses model: `gpt-4.1-2025-04-14`

4. **UI Component** (`components/ai-financial-report.tsx`)
   - Beautiful dark-themed header with health score
   - Strengths and concerns analysis
   - Goal-by-goal analysis with status indicators
   - Prioritized action plan
   - Monthly budget advice
   - "What If" scenario analysis
   - "Generate New Report" button

5. **Summary Page** (`app/summary/page.tsx`)
   - Integrated AI Financial Report component

### Environment Variables Required

```env
OPENAI_API_KEY=sk-your-openai-api-key
```

---

*Document created: December 31, 2024*  
*Last updated: December 31, 2024*

