import { getFinancialAccounts, getGoals, getIncomeSources } from '@/lib/database'
import { describeAge, findLapsedIncomeSources, freshnessOf, incomeEndsOn } from '@/lib/freshness'

/**
 * Things the app noticed that need a human decision.
 *
 * The app used to fail silently in one direction: an ended contract kept
 * counting as income, a balance from four months ago was presented as current,
 * and nothing ever said so. Rather than guessing on the user's behalf, this
 * surfaces what has drifted and lets them confirm.
 */

export type AttentionSeverity = 'info' | 'warning'

export type AttentionItem = {
  id: string
  kind: 'lapsed_income' | 'stale_account' | 'stale_goal'
  severity: AttentionSeverity
  title: string
  detail: string
  /** Where the UI should send the user to resolve it. */
  href: string
}

/** Balances older than this are unlikely to still be accurate. */
const STALE_ACCOUNT_DAYS = 45

export async function getAttentionItems(userId: string, asOf: Date = new Date()): Promise<AttentionItem[]> {
  const [incomeSources, accounts, goals] = await Promise.all([
    getIncomeSources(userId).catch(() => []),
    getFinancialAccounts(userId).catch(() => []),
    getGoals(userId).catch(() => []),
  ])

  const items: AttentionItem[] = []

  // Contracts that ended but are still marked active, so still counting as income
  for (const source of findLapsedIncomeSources(incomeSources, asOf)) {
    const endedOn = incomeEndsOn(source)
    items.push({
      id: `lapsed-income-${source.id}`,
      kind: 'lapsed_income',
      severity: 'warning',
      title: `${source.name} has ended`,
      detail: endedOn
        ? `This contract ended ${endedOn.toISOString().split('T')[0]} and no longer counts toward your income. Close it out or extend the dates.`
        : 'This contract has ended and no longer counts toward your income.',
      href: '/recurring',
    })
  }

  // Hand-entered balances that have gone unmaintained
  for (const account of accounts) {
    if (freshnessOf(account.updated_at, asOf) !== 'stale') continue

    items.push({
      id: `stale-account-${account.id}`,
      kind: 'stale_account',
      severity: 'info',
      title: `${account.name} balance may be out of date`,
      detail: `Last ${describeAge(account.updated_at, asOf)}. Connect this account or update the balance so projections stay accurate.`,
      href: '/accounts',
    })
  }

  // Goal progress only moves when logged, so an old timestamp means the
  // projection is running on a stale balance
  for (const goal of goals) {
    if (goal.status !== 'active') continue
    if (freshnessOf(goal.updated_at, asOf) !== 'stale') continue

    items.push({
      id: `stale-goal-${goal.id}`,
      kind: 'stale_goal',
      severity: 'info',
      title: `${goal.title} hasn't been updated recently`,
      detail: `Last ${describeAge(goal.updated_at, asOf)}. Its deadline keeps approaching, so the required monthly amount is rising while the balance sits still.`,
      href: '/goals',
    })
  }

  // Warnings first — those change the numbers, info items only reduce confidence
  return items.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'warning' ? -1 : 1))
}

export { STALE_ACCOUNT_DAYS }
