import Foundation

struct RecurringExpense: Codable, Identifiable {
    let id: String
    let userId: String?
    var name: String
    var description: String?
    var amount: Double
    var category: ExpenseCategory
    var dueDate: Int
    var status: ExpenseStatus
    var autoPay: Bool
    var reminderEnabled: Bool
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name, description, amount, category
        case dueDate = "due_date"
        case status
        case autoPay = "auto_pay"
        case reminderEnabled = "reminder_enabled"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        userId = try container.decodeIfPresent(String.self, forKey: .userId)
        name = try container.decode(String.self, forKey: .name)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        amount = try container.decode(Double.self, forKey: .amount)
        category = try container.decode(ExpenseCategory.self, forKey: .category)
        dueDate = try container.decode(Int.self, forKey: .dueDate)
        status = try container.decodeIfPresent(ExpenseStatus.self, forKey: .status) ?? .active
        // Handle both Int and Bool for auto_pay
        if let intVal = try? container.decode(Int.self, forKey: .autoPay) {
            autoPay = intVal != 0
        } else {
            autoPay = try container.decodeIfPresent(Bool.self, forKey: .autoPay) ?? false
        }
        if let intVal = try? container.decode(Int.self, forKey: .reminderEnabled) {
            reminderEnabled = intVal != 0
        } else {
            reminderEnabled = try container.decodeIfPresent(Bool.self, forKey: .reminderEnabled) ?? true
        }
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
        updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
    }
}

enum ExpenseCategory: String, Codable, CaseIterable {
    case housing, utilities, entertainment, health, transportation, food, subscriptions, insurance, other

    var displayName: String { rawValue.capitalized }

    var iconName: String {
        switch self {
        case .housing: return "house.fill"
        case .utilities: return "bolt.fill"
        case .entertainment: return "tv.fill"
        case .health: return "heart.fill"
        case .transportation: return "car.fill"
        case .food: return "fork.knife"
        case .subscriptions: return "repeat"
        case .insurance: return "shield.fill"
        case .other: return "ellipsis.circle.fill"
        }
    }
}

enum ExpenseStatus: String, Codable {
    case active, paused, cancelled
}
