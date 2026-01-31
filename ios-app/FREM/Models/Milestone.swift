import Foundation

struct FinancialMilestone: Codable, Identifiable {
    let id: String
    let userId: String?
    var title: String
    var description: String?
    var targetAmount: Double?
    var currentAmount: Double
    var category: MilestoneCategory
    var priority: GoalPriority
    var status: MilestoneStatus
    var impactLevel: String?
    var deadline: String?
    var completedAt: String?
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case title, description, category, priority, status, deadline
        case targetAmount = "target_amount"
        case currentAmount = "current_amount"
        case impactLevel = "impact_level"
        case completedAt = "completed_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum MilestoneCategory: String, Codable, CaseIterable {
    case security, debt, lifestyle, transportation, growth, investment, other

    var displayName: String { rawValue.capitalized }

    var iconName: String {
        switch self {
        case .security: return "shield.fill"
        case .debt: return "creditcard.fill"
        case .lifestyle: return "sparkles"
        case .transportation: return "car.fill"
        case .growth: return "chart.line.uptrend.xyaxis"
        case .investment: return "banknote.fill"
        case .other: return "star.fill"
        }
    }
}

enum MilestoneStatus: String, Codable {
    case planned
    case inProgress = "in-progress"
    case completed
    case cancelled
}
