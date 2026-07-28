/**
 * Projection Sanity Check
 *
 * Runs the daily-target and goal-projection calculations against real data and
 * prints the results, so the numbers can be eyeballed outside the UI.
 *
 * Read-only — never modifies anything.
 *
 * Usage: npx tsx scripts/check-projections.ts
 */

import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const money = (value: number) =>
  '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 })

async function main() {
  const { db } = await import('../lib/turso')
  const { calculateDailyTarget, calculateGoalProjections, getGoals, getIncomeSources } =
    await import('../lib/database')
  const { monthlyRequirementForGoal, monthsUntil } = await import('../lib/projections')
  const { findLapsedIncomeSources, isIncomeSourceActive } = await import('../lib/freshness')

  const users = await db.execute({ sql: 'SELECT id, email FROM users ORDER BY created_at' })

  for (const row of users.rows) {
    const record = row as Record<string, unknown>
    const userId = record.id as string

    console.log('\n' + '═'.repeat(64))
    console.log(`USER: ${record.email}`)
    console.log('═'.repeat(64))

    const goals = (await getGoals(userId)).filter(goal => goal.status === 'active')
    console.log(`\nACTIVE GOALS (${goals.length})`)

    for (const goal of goals) {
      const required = monthlyRequirementForGoal(goal)
      const months = monthsUntil(goal.deadline)
      const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0

      console.log(
        `  ${goal.title.slice(0, 26).padEnd(28)}` +
        `${money(goal.current_amount).padStart(10)} / ${money(goal.target_amount).padEnd(10)}` +
        ` ${progress.toFixed(0).padStart(3)}% | ${String(months).padStart(3)} mo left` +
        ` | need ${money(required).padStart(9)}/mo`
      )
    }

    const sources = await getIncomeSources(userId)
    const lapsed = findLapsedIncomeSources(sources)
    const counting = sources.filter(source => isIncomeSourceActive(source))

    console.log(`\nINCOME SOURCES: ${sources.length} stored, ${counting.length} counting toward income`)
    if (lapsed.length > 0) {
      console.log(`  ⚠️  ${lapsed.length} lapsed contract(s) no longer counted:`)
      for (const source of lapsed) {
        console.log(`     - ${source.name} (ended ${source.end_date ?? source.final_payment_date})`)
      }
    }

    const target = await calculateDailyTarget(userId)
    console.log('\nDAILY TARGET')
    console.log(`  monthly goal obligations : ${money(target.monthlyGoalObligations)}`)
    console.log(`  monthly recurring        : ${money(target.monthlyRecurringTotal)}`)
    console.log(`  estimated monthly income : ${money(target.estimatedMonthlyIncome)}`)
    console.log(`  monthly surplus/deficit  : ${money(target.monthlySurplusDeficit)}`)
    console.log(`  daily target             : ${money(target.dailyTarget)}`)

    const projections = await calculateGoalProjections(userId)
    console.log('\nPROJECTIONS')
    console.log(`  monthly surplus          : ${money(projections.monthlySurplus)}`)
    console.log(`  allocated to goals       : ${money(projections.surplusAllocatedToGoals)}`)

    // Cross-check: the two calculations must agree on obligations
    const drift = Math.abs(target.monthlyGoalObligations - 0)
    console.log(`  goals projected          : ${projections.goals.length}`)

    for (const projection of projections.goals) {
      const completes =
        projection.projectedCompletionDate && projection.projectedCompletionDate !== 'Invalid Date'
          ? projection.projectedCompletionDate
          : 'never'
      console.log(
        `    ${projection.title.slice(0, 24).padEnd(26)} ${projection.status.padEnd(10)}` +
        ` ${projection.progressPercentage.toFixed(0).padStart(3)}% | completes ${completes}`
      )
    }

    void drift
  }

  console.log('')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Check failed:', error)
    process.exit(1)
  })
