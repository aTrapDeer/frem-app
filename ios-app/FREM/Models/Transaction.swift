import Foundation

struct Transaction: Codable, Identifiable {
    let id: String
    let userId: String?
    let type: TransactionType
    let amount: Double
    let description: String
    let category: String?
    let transactionDate: String
    let transactionTime: String?
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case type, amount, description, category
        case transactionDate = "transaction_date"
        case transactionTime = "transaction_time"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum TransactionType: String, Codable {
    case income
    case expense
}

struct TransactionCategory: Codable, Identifiable {
    let id: String
    let name: String
    let type: String
    let color: String?
    let icon: String?
    let isSystem: Bool?

    enum CodingKeys: String, CodingKey {
        case id, name, type, color, icon
        case isSystem = "is_system"
    }
}

struct CreateTransactionRequest: Codable {
    let type: String
    let amount: Double
    let description: String
    let category: String?
    let transactionDate: String
    let transactionTime: String?

    enum CodingKeys: String, CodingKey {
        case type, amount, description, category
        case transactionDate = "transaction_date"
        case transactionTime = "transaction_time"
    }
}
