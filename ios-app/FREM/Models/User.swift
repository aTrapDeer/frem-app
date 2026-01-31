import Foundation

struct User: Codable, Identifiable {
    let id: String
    let name: String?
    let email: String?
    let image: String?
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, name, email, image
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct UserSettings: Codable {
    let id: String?
    let userId: String?
    var dailyBudgetTarget: Double
    var currency: String
    var preferredLanguage: String
    var notificationsEnabled: Bool
    var darkMode: Bool
    var weeklySummaryEmail: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case dailyBudgetTarget = "daily_budget_target"
        case currency
        case preferredLanguage = "preferred_language"
        case notificationsEnabled = "notifications_enabled"
        case darkMode = "dark_mode"
        case weeklySummaryEmail = "weekly_summary_email"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(String.self, forKey: .id)
        userId = try container.decodeIfPresent(String.self, forKey: .userId)
        dailyBudgetTarget = try container.decodeIfPresent(Double.self, forKey: .dailyBudgetTarget) ?? 150.0
        currency = try container.decodeIfPresent(String.self, forKey: .currency) ?? "USD"
        preferredLanguage = try container.decodeIfPresent(String.self, forKey: .preferredLanguage) ?? "en"
        notificationsEnabled = try container.decodeIfPresent(Bool.self, forKey: .notificationsEnabled) ?? true
        darkMode = try container.decodeIfPresent(Bool.self, forKey: .darkMode) ?? false
        weeklySummaryEmail = try container.decodeIfPresent(Bool.self, forKey: .weeklySummaryEmail) ?? true
    }

    static let `default` = UserSettings(
        dailyBudgetTarget: 150.0,
        currency: "USD",
        preferredLanguage: "en",
        notificationsEnabled: true,
        darkMode: false,
        weeklySummaryEmail: true
    )

    init(
        dailyBudgetTarget: Double = 150.0,
        currency: String = "USD",
        preferredLanguage: String = "en",
        notificationsEnabled: Bool = true,
        darkMode: Bool = false,
        weeklySummaryEmail: Bool = true
    ) {
        self.id = nil
        self.userId = nil
        self.dailyBudgetTarget = dailyBudgetTarget
        self.currency = currency
        self.preferredLanguage = preferredLanguage
        self.notificationsEnabled = notificationsEnabled
        self.darkMode = darkMode
        self.weeklySummaryEmail = weeklySummaryEmail
    }
}
