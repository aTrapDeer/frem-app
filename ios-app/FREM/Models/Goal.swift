import Foundation

struct FinancialGoal: Codable, Identifiable {
    let id: String
    let userId: String?
    var title: String
    var description: String?
    var targetAmount: Double
    var currentAmount: Double
    var category: GoalCategory
    var startDate: String?
    var deadline: String
    var interestRate: Double?
    var priority: GoalPriority
    var urgencyScore: Int?
    var status: GoalStatus
    let createdAt: String?
    let updatedAt: String?
    let completedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case title, description
        case targetAmount = "target_amount"
        case currentAmount = "current_amount"
        case category
        case startDate = "start_date"
        case deadline
        case interestRate = "interest_rate"
        case priority
        case urgencyScore = "urgency_score"
        case status
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case completedAt = "completed_at"
    }

    var progressPercentage: Double {
        guard targetAmount > 0 else { return 0 }
        return (currentAmount / targetAmount) * 100
    }

    var remainingAmount: Double {
        max(0, targetAmount - currentAmount)
    }
}

enum GoalCategory: String, Codable, CaseIterable {
    case emergency, vacation, car, house, debt, investment, other

    var displayName: String {
        switch self {
        case .emergency: return "Emergency Fund"
        case .vacation: return "Vacation"
        case .car: return "Car"
        case .house: return "House"
        case .debt: return "Debt Payoff"
        case .investment: return "Investment"
        case .other: return "Other"
        }
    }

    var iconName: String {
        switch self {
        case .emergency: return "shield.fill"
        case .vacation: return "airplane"
        case .car: return "car.fill"
        case .house: return "house.fill"
        case .debt: return "creditcard.fill"
        case .investment: return "chart.line.uptrend.xyaxis"
        case .other: return "star.fill"
        }
    }
}

enum GoalPriority: String, Codable, CaseIterable {
    case low, medium, high

    var displayName: String { rawValue.capitalized }
}

enum GoalStatus: String, Codable {
    case active, completed, paused, cancelled
}

struct GoalContribution: Codable, Identifiable {
    let id: String
    let goalId: String
    let userId: String?
    let amount: Double
    let contributionDate: String
    let description: String?
    let transactionId: String?

    enum CodingKeys: String, CodingKey {
        case id
        case goalId = "goal_id"
        case userId = "user_id"
        case amount
        case contributionDate = "contribution_date"
        case description
        case transactionId = "transaction_id"
    }
}

struct CreateGoalRequest: Codable {
    let title: String
    let description: String?
    let targetAmount: Double
    let currentAmount: Double
    let category: String
    let deadline: String
    let priority: String
    let urgencyScore: Int?
    let interestRate: Double?
    let startDate: String?

    enum CodingKeys: String, CodingKey {
        case title, description, category, deadline, priority
        case targetAmount = "target_amount"
        case currentAmount = "current_amount"
        case urgencyScore = "urgency_score"
        case interestRate = "interest_rate"
        case startDate = "start_date"
    }
}
