import Foundation

struct GoalProjection: Codable, Identifiable {
    var id: String { goalId }
    let goalId: String
    let title: String
    let targetAmount: Double
    let currentAmount: Double
    let projectedAmount: Double?
    let totalProjectedProgress: Double
    let progressPercentage: Double
    let monthlyAllocation: Double
    let urgencyScore: Int?
    let originalDeadline: String
    let projectedCompletionDate: String
    let daysUntilProjectedCompletion: Int
    let isOnTrack: Bool
    let daysAheadOrBehind: Int
    let status: ProjectionStatus
    let category: String

    var statusConfig: (color: String, iconName: String) {
        switch status {
        case .completed: return ("green", "checkmark.circle.fill")
        case .ahead: return ("blue", "arrow.up.right")
        case .onTrack: return ("green", "checkmark.circle.fill")
        case .behind: return ("orange", "clock.fill")
        case .atRisk: return ("red", "exclamationmark.triangle.fill")
        }
    }
}

enum ProjectionStatus: String, Codable {
    case onTrack = "on_track"
    case ahead
    case behind
    case atRisk = "at_risk"
    case completed
}

struct ProjectionSummary: Codable {
    let goals: [GoalProjection]
    let totalMonthlyIncome: Double
    let totalMonthlyExpenses: Double
    let monthlySurplus: Double
    let surplusAllocatedToGoals: Double?
    let hasVariableIncome: Bool
}

struct MonthlyProjection: Codable, Identifiable {
    var id: String { month }
    let month: String
    let projectedIncome: Double
    let projectedExpenses: Double
    let projectedSurplus: Double
    let goalAllocations: [GoalAllocation]?

    enum CodingKeys: String, CodingKey {
        case month
        case projectedIncome = "projected_income"
        case projectedExpenses = "projected_expenses"
        case projectedSurplus = "projected_surplus"
        case goalAllocations = "goal_allocations"
    }
}

struct GoalAllocation: Codable {
    let goalId: String
    let title: String
    let amount: Double

    enum CodingKeys: String, CodingKey {
        case goalId = "goal_id"
        case title, amount
    }
}

struct SummaryData: Codable {
    let totalIncome: Double?
    let totalExpenses: Double?
    let netSavings: Double?
    let savingsRate: Double?
    let monthlyIncome: Double?
    let monthlyExpenses: Double?
    let monthlySurplus: Double?

    enum CodingKeys: String, CodingKey {
        case totalIncome = "total_income"
        case totalExpenses = "total_expenses"
        case netSavings = "net_savings"
        case savingsRate = "savings_rate"
        case monthlyIncome = "monthly_income"
        case monthlyExpenses = "monthly_expenses"
        case monthlySurplus = "monthly_surplus"
    }
}

struct AIChatMessage: Codable, Identifiable {
    let id: String
    let role: String
    let content: String

    init(id: String = UUID().uuidString, role: String, content: String) {
        self.id = id
        self.role = role
        self.content = content
    }
}

struct AIChatResponse: Codable {
    let message: String?
    let response: String?

    var text: String {
        message ?? response ?? ""
    }
}

struct AIReportResponse: Codable {
    let report: String?
    let content: String?

    var text: String {
        report ?? content ?? ""
    }
}
