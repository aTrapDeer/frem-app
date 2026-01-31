import Foundation

struct SideProject: Codable, Identifiable {
    let id: String
    let userId: String?
    var name: String
    var description: String?
    var category: String?
    var status: ProjectStatus
    var currentMonthlyEarnings: Double
    var projectedMonthlyEarnings: Double
    var timeInvestedWeekly: Double
    var startDate: String?
    var endDate: String?
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name, description, category, status
        case currentMonthlyEarnings = "current_monthly_earnings"
        case projectedMonthlyEarnings = "projected_monthly_earnings"
        case timeInvestedWeekly = "time_invested_weekly"
        case startDate = "start_date"
        case endDate = "end_date"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum ProjectStatus: String, Codable, CaseIterable {
    case planning, active, paused, completed, cancelled

    var displayName: String { rawValue.capitalized }
}
