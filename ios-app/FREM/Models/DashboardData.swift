import Foundation

struct DashboardData: Codable {
    let dailyTotal: Double
    let goalProgress: Double
    let monthlyRecurringTotal: Double
    let monthlyProjectIncome: Double
    let transactionCount: Int
    let activeGoalsCount: Int
    let activeSideProjectsCount: Int
}

struct DailyTargetData: Codable {
    let dailyTarget: Double
    let activeGoalsCount: Int
    let recurringExpensesCount: Int
    let monthlyGoalObligations: Double
    let monthlyRecurringTotal: Double
    let dailySurplusDeficit: Double
}
