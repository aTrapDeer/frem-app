import Foundation

struct IncomeSource: Codable, Identifiable {
    let id: String
    let userId: String?
    var name: String
    var description: String?
    var incomeType: IncomeType
    var payFrequency: PayFrequency
    var baseAmount: Double
    var hoursPerWeek: Double
    var isCommissionBased: Bool
    var commissionHigh: Double
    var commissionLow: Double
    var commissionFrequencyPerPeriod: Double
    var estimatedMonthlyLow: Double
    var estimatedMonthlyMid: Double
    var estimatedMonthlyHigh: Double
    var status: IncomeStatus
    var startDate: String?
    var endDate: String?
    var initialPayment: Double
    var finalPayment: Double
    var finalPaymentDate: String?
    var isPrimary: Bool
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name, description, status
        case incomeType = "income_type"
        case payFrequency = "pay_frequency"
        case baseAmount = "base_amount"
        case hoursPerWeek = "hours_per_week"
        case isCommissionBased = "is_commission_based"
        case commissionHigh = "commission_high"
        case commissionLow = "commission_low"
        case commissionFrequencyPerPeriod = "commission_frequency_per_period"
        case estimatedMonthlyLow = "estimated_monthly_low"
        case estimatedMonthlyMid = "estimated_monthly_mid"
        case estimatedMonthlyHigh = "estimated_monthly_high"
        case startDate = "start_date"
        case endDate = "end_date"
        case initialPayment = "initial_payment"
        case finalPayment = "final_payment"
        case finalPaymentDate = "final_payment_date"
        case isPrimary = "is_primary"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        userId = try container.decodeIfPresent(String.self, forKey: .userId)
        name = try container.decode(String.self, forKey: .name)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        incomeType = try container.decode(IncomeType.self, forKey: .incomeType)
        payFrequency = try container.decode(PayFrequency.self, forKey: .payFrequency)
        baseAmount = try container.decodeIfPresent(Double.self, forKey: .baseAmount) ?? 0
        hoursPerWeek = try container.decodeIfPresent(Double.self, forKey: .hoursPerWeek) ?? 0
        // Handle Int-as-Bool from SQLite
        if let intVal = try? container.decode(Int.self, forKey: .isCommissionBased) {
            isCommissionBased = intVal != 0
        } else {
            isCommissionBased = try container.decodeIfPresent(Bool.self, forKey: .isCommissionBased) ?? false
        }
        commissionHigh = try container.decodeIfPresent(Double.self, forKey: .commissionHigh) ?? 0
        commissionLow = try container.decodeIfPresent(Double.self, forKey: .commissionLow) ?? 0
        commissionFrequencyPerPeriod = try container.decodeIfPresent(Double.self, forKey: .commissionFrequencyPerPeriod) ?? 0
        estimatedMonthlyLow = try container.decodeIfPresent(Double.self, forKey: .estimatedMonthlyLow) ?? 0
        estimatedMonthlyMid = try container.decodeIfPresent(Double.self, forKey: .estimatedMonthlyMid) ?? 0
        estimatedMonthlyHigh = try container.decodeIfPresent(Double.self, forKey: .estimatedMonthlyHigh) ?? 0
        status = try container.decodeIfPresent(IncomeStatus.self, forKey: .status) ?? .active
        startDate = try container.decodeIfPresent(String.self, forKey: .startDate)
        endDate = try container.decodeIfPresent(String.self, forKey: .endDate)
        initialPayment = try container.decodeIfPresent(Double.self, forKey: .initialPayment) ?? 0
        finalPayment = try container.decodeIfPresent(Double.self, forKey: .finalPayment) ?? 0
        finalPaymentDate = try container.decodeIfPresent(String.self, forKey: .finalPaymentDate)
        if let intVal = try? container.decode(Int.self, forKey: .isPrimary) {
            isPrimary = intVal != 0
        } else {
            isPrimary = try container.decodeIfPresent(Bool.self, forKey: .isPrimary) ?? false
        }
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
        updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
    }
}

enum IncomeType: String, Codable, CaseIterable {
    case salary, hourly, commission, freelance, other

    var displayName: String { rawValue.capitalized }
}

enum PayFrequency: String, Codable, CaseIterable {
    case weekly, biweekly, semimonthly, monthly, variable

    var displayName: String {
        switch self {
        case .weekly: return "Weekly"
        case .biweekly: return "Bi-Weekly"
        case .semimonthly: return "Semi-Monthly"
        case .monthly: return "Monthly"
        case .variable: return "Variable"
        }
    }
}

enum IncomeStatus: String, Codable {
    case active, paused, ended
}
