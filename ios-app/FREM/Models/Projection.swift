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
    let suggestedDeadline: String?

    enum CodingKeys: String, CodingKey {
        case goalId, title, targetAmount, currentAmount, projectedAmount
        case totalProjectedProgress, progressPercentage, monthlyAllocation
        case urgencyScore, originalDeadline, projectedCompletionDate
        case daysUntilProjectedCompletion, isOnTrack, daysAheadOrBehind
        case status, category, suggestedDeadline
    }

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
    let bankReserve: Double?
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

struct SummaryResponse: Codable {
    let milestones: [FinancialMilestone]?
    let goals: [FinancialGoal]?
    let recurringExpenses: [RecurringExpense]?
    let transactions: [Transaction]?
    let targetCalculation: DailyTargetData?
    let incomeSummary: IncomeSummaryData?
    let financialData: FinancialDataSummary?
    let oneTimeNet: Double?

    var monthlyIncome: Double {
        incomeSummary?.totalMonthlyMid ?? financialData?.income ?? 0
    }

    var monthlyExpenses: Double {
        targetCalculation?.monthlyRecurringTotal ?? recurringExpenses?.reduce(0) { $0 + $1.amount } ?? 0
    }

    var netSavings: Double {
        monthlyIncome - monthlyExpenses
    }

    var savingsRate: Double {
        monthlyIncome > 0 ? (netSavings / monthlyIncome) * 100 : 0
    }
}

struct FinancialDataSummary: Codable {
    let income: Double?
}

struct IncomeSummaryData: Codable {
    let totalMonthlyLow: Double?
    let totalMonthlyMid: Double?
    let totalMonthlyHigh: Double?
    let sourceCount: Int?
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

    enum CodingKeys: String, CodingKey {
        case role, content
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = UUID().uuidString
        self.role = try container.decode(String.self, forKey: .role)
        self.content = try container.decode(String.self, forKey: .content)
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
