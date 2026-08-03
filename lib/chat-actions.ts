import { z } from 'zod'
import { setCategoryCap } from '@/lib/budget'
import { createGoal, createRecurringExpense, getGoals, updateGoal } from '@/lib/database'

/**
 * Actions the coach may PROPOSE in chat. Nothing executes until the user
 * confirms in the UI — the model only ever fills in parameters. All actions
 * are app-data edits (plans, goals); money never moves, ever.
 */

const setCategoryCapSchema = z.object({
  category: z.string().min(1).max(40).transform(value => value.toLowerCase().replace(/[\s>]+/g, '_')),
  monthlyEstimate: z.number().finite().min(0).max(1_000_000),
  entity: z.enum(['personal', 'business']).default('personal'),
})

const updateGoalSchema = z.object({
  goalTitle: z.string().min(1).max(200),
  targetAmount: z.number().finite().min(1).max(100_000_000).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
})

const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  targetAmount: z.number().finite().min(1).max(100_000_000),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(['emergency', 'vacation', 'car', 'house', 'debt', 'investment', 'other']).default('other'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  entity: z.enum(['personal', 'business']).default('personal'),
})

const addRecurringExpenseSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().finite().min(0.01).max(1_000_000),
  category: z
    .enum(['housing', 'utilities', 'entertainment', 'health', 'transportation', 'food', 'subscriptions', 'insurance', 'other'])
    .default('other'),
  dueDay: z.number().int().min(1).max(31).default(1),
  entity: z.enum(['personal', 'business']).default('personal'),
})

export type ChatAction =
  | { type: 'set_category_cap'; params: z.infer<typeof setCategoryCapSchema> }
  | { type: 'update_goal'; params: z.infer<typeof updateGoalSchema> }
  | { type: 'create_goal'; params: z.infer<typeof createGoalSchema> }
  | { type: 'add_recurring_expense'; params: z.infer<typeof addRecurringExpenseSchema> }

/** Tool definitions handed to the model. Descriptions stress propose-only. */
export const CHAT_ACTION_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'set_category_cap',
      description:
        'Propose setting a monthly spending cap (budget) for a category. The user must confirm before anything is saved.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: "App category, e.g. 'food', 'groceries', 'entertainment'" },
          monthlyEstimate: { type: 'number', description: 'Monthly cap in dollars' },
          entity: { type: 'string', enum: ['personal', 'business'] },
        },
        required: ['category', 'monthlyEstimate'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_goal',
      description:
        "Propose changing one of the user's existing goals: new target amount, new deadline (YYYY-MM-DD), or priority. Match by the goal's title. The user must confirm before anything is saved.",
      parameters: {
        type: 'object',
        properties: {
          goalTitle: { type: 'string', description: 'Title of the existing goal, as close as known' },
          targetAmount: { type: 'number' },
          deadline: { type: 'string', description: 'YYYY-MM-DD' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['goalTitle'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_goal',
      description:
        'Propose creating a NEW financial goal with a target amount and deadline (YYYY-MM-DD). The user must confirm before anything is saved.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          targetAmount: { type: 'number', description: 'Target in dollars' },
          deadline: { type: 'string', description: 'YYYY-MM-DD' },
          category: { type: 'string', enum: ['emergency', 'vacation', 'car', 'house', 'debt', 'investment', 'other'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          entity: { type: 'string', enum: ['personal', 'business'] },
        },
        required: ['title', 'targetAmount', 'deadline'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_recurring_expense',
      description:
        'Propose adding a NEW recurring monthly bill/expense to the plan (rent, subscription, insurance...). The user must confirm before anything is saved.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          amount: { type: 'number', description: 'Monthly amount in dollars' },
          category: {
            type: 'string',
            enum: ['housing', 'utilities', 'entertainment', 'health', 'transportation', 'food', 'subscriptions', 'insurance', 'other'],
          },
          dueDay: { type: 'number', description: 'Day of month it is due (1-31)' },
          entity: { type: 'string', enum: ['personal', 'business'] },
        },
        required: ['name', 'amount'],
      },
    },
  },
]

export function parseChatAction(name: string, argsJson: string): ChatAction | null {
  let raw: unknown
  try {
    raw = JSON.parse(argsJson)
  } catch {
    return null
  }
  if (name === 'set_category_cap') {
    const parsed = setCategoryCapSchema.safeParse(raw)
    return parsed.success ? { type: 'set_category_cap', params: parsed.data } : null
  }
  if (name === 'create_goal') {
    const parsed = createGoalSchema.safeParse(raw)
    return parsed.success ? { type: 'create_goal', params: parsed.data } : null
  }
  if (name === 'add_recurring_expense') {
    const parsed = addRecurringExpenseSchema.safeParse(raw)
    return parsed.success ? { type: 'add_recurring_expense', params: parsed.data } : null
  }
  if (name === 'update_goal') {
    const parsed = updateGoalSchema.safeParse(raw)
    if (!parsed.success) return null
    const { targetAmount, deadline, priority } = parsed.data
    if (targetAmount === undefined && deadline === undefined && priority === undefined) return null
    return { type: 'update_goal', params: parsed.data }
  }
  return null
}

/** Human-readable label for the confirmation card. */
export function describeChatAction(action: ChatAction): string {
  if (action.type === 'set_category_cap') {
    const { category, monthlyEstimate, entity } = action.params
    return `Set ${entity} "${category.replace(/_/g, ' ')}" cap to $${monthlyEstimate.toLocaleString()}/mo`
  }
  if (action.type === 'create_goal') {
    const { title, targetAmount, deadline } = action.params
    return `Create goal "${title}": $${targetAmount.toLocaleString()} by ${deadline}`
  }
  if (action.type === 'add_recurring_expense') {
    const { name, amount, entity } = action.params
    return `Add ${entity} monthly bill "${name}" at $${amount.toLocaleString()}/mo`
  }
  const changes: string[] = []
  if (action.params.targetAmount !== undefined) changes.push(`target $${action.params.targetAmount.toLocaleString()}`)
  if (action.params.deadline !== undefined) changes.push(`deadline ${action.params.deadline}`)
  if (action.params.priority !== undefined) changes.push(`priority ${action.params.priority}`)
  return `Update goal "${action.params.goalTitle}": ${changes.join(', ')}`
}

/** Executes a CONFIRMED action, user-scoped. Returns a spoken-back summary. */
export async function executeChatAction(userId: string, action: ChatAction): Promise<string> {
  if (action.type === 'set_category_cap') {
    const { category, monthlyEstimate, entity } = action.params
    await setCategoryCap(userId, category, monthlyEstimate, entity)
    return `Done — ${entity} ${category.replace(/_/g, ' ')} cap is now $${monthlyEstimate.toLocaleString()}/mo. You'll see it on the Money page.`
  }

  if (action.type === 'create_goal') {
    const { title, targetAmount, deadline, category, priority, entity } = action.params
    await createGoal({
      user_id: userId,
      title,
      description: null,
      target_amount: targetAmount,
      current_amount: 0,
      category,
      start_date: null,
      deadline,
      interest_rate: null,
      linked_account_id: null,
      linked_account_kind: null,
      allocation_percent: null,
      priority,
      urgency_score: 3,
      status: 'active',
      entity,
      entity_label: null,
    })
    return `Done — goal "${title}" created: $${targetAmount.toLocaleString()} by ${deadline}. The projection engine is already allocating toward it.`
  }

  if (action.type === 'add_recurring_expense') {
    const { name, amount, category, dueDay, entity } = action.params
    await createRecurringExpense({
      user_id: userId,
      name,
      description: null,
      amount,
      category,
      due_date: dueDay,
      status: 'active',
      auto_pay: false,
      reminder_enabled: false,
      entity,
      entity_label: null,
    })
    return `Done — "${name}" added as a ${entity} monthly bill at $${amount.toLocaleString()}/mo. It's in your plan on the Money page.`
  }

  const goals = await getGoals(userId)
  const wanted = action.params.goalTitle.toLowerCase()
  const goal =
    goals.find(candidate => candidate.title.toLowerCase() === wanted) ??
    goals.find(candidate => candidate.title.toLowerCase().includes(wanted) || wanted.includes(candidate.title.toLowerCase()))
  if (!goal) {
    throw new Error(`No goal found matching "${action.params.goalTitle}"`)
  }

  const updates: Record<string, unknown> = {}
  if (action.params.targetAmount !== undefined) updates.target_amount = action.params.targetAmount
  if (action.params.deadline !== undefined) updates.deadline = action.params.deadline
  if (action.params.priority !== undefined) updates.priority = action.params.priority
  await updateGoal(userId, goal.id, updates)

  return `Done — "${goal.title}" updated (${describeChatAction(action).split(': ')[1]}). Projections will reflect it immediately.`
}
