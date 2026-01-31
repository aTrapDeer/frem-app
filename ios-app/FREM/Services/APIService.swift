import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case unauthorized
    case serverError(Int)
    case decodingError(Error)
    case networkError(Error)
    case noData

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .unauthorized: return "Please sign in again"
        case .serverError(let code): return "Server error (\(code))"
        case .decodingError(let error): return "Data error: \(error.localizedDescription)"
        case .networkError(let error): return "Network error: \(error.localizedDescription)"
        case .noData: return "No data received"
        }
    }
}

@Observable
class APIService {
    static let shared = APIService()

    private let baseURL: String
    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        self.baseURL = Config.apiBaseURL
        self.session = URLSession.shared
        self.decoder = JSONDecoder()
    }

    // MARK: - Core Request

    private func request<T: Decodable>(
        _ endpoint: String,
        method: String = "GET",
        body: Encodable? = nil
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Attach session token for authentication
        if let token = KeychainHelper.read(.sessionToken) {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            // Also send as cookie for NextAuth compatibility
            request.setValue("next-auth.session-token=\(token)", forHTTPHeaderField: "Cookie")
        }

        if let body = body {
            let encoder = JSONEncoder()
            request.httpBody = try encoder.encode(body)
        }

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.noData
        }

        switch httpResponse.statusCode {
        case 200...299:
            break
        case 401:
            throw APIError.unauthorized
        default:
            throw APIError.serverError(httpResponse.statusCode)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    // MARK: - Dashboard

    func fetchDashboard() async throws -> DashboardData {
        try await request("/api/dashboard")
    }

    func fetchDailyTarget() async throws -> DailyTargetData {
        try await request("/api/daily-target")
    }

    // MARK: - Projections

    func fetchProjections() async throws -> ProjectionSummary {
        try await request("/api/projections")
    }

    func fetchMonthlyProjections() async throws -> [MonthlyProjection] {
        try await request("/api/projections/monthly")
    }

    // MARK: - Transactions

    func fetchTransactions(date: String? = nil) async throws -> [Transaction] {
        var endpoint = "/api/transactions"
        if let date = date {
            endpoint += "?date=\(date)"
        }
        return try await request(endpoint)
    }

    func createTransaction(_ transaction: CreateTransactionRequest) async throws -> Transaction {
        try await request("/api/transactions", method: "POST", body: transaction)
    }

    // MARK: - Goals

    func fetchGoals() async throws -> [FinancialGoal] {
        try await request("/api/goals")
    }

    func createGoal(_ goal: CreateGoalRequest) async throws -> FinancialGoal {
        try await request("/api/goals", method: "POST", body: goal)
    }

    func updateGoal(id: String, _ goal: CreateGoalRequest) async throws -> FinancialGoal {
        try await request("/api/goals?id=\(id)", method: "PUT", body: goal)
    }

    // MARK: - Recurring Expenses

    func fetchRecurringExpenses() async throws -> [RecurringExpense] {
        try await request("/api/recurring")
    }

    func createRecurringExpense(_ expense: RecurringExpense) async throws -> RecurringExpense {
        try await request("/api/recurring", method: "POST", body: expense)
    }

    // MARK: - Income Sources

    func fetchIncomeSources() async throws -> [IncomeSource] {
        try await request("/api/income-sources")
    }

    func createIncomeSource(_ source: IncomeSource) async throws -> IncomeSource {
        try await request("/api/income-sources", method: "POST", body: source)
    }

    // MARK: - Side Projects

    func fetchSideProjects() async throws -> [SideProject] {
        try await request("/api/side-projects")
    }

    // MARK: - Milestones

    func fetchMilestones() async throws -> [FinancialMilestone] {
        try await request("/api/milestones")
    }

    // MARK: - Summary

    func fetchSummary() async throws -> SummaryData {
        try await request("/api/summary")
    }

    // MARK: - AI

    func fetchAIReport() async throws -> AIReportResponse {
        try await request("/api/ai-report")
    }

    func sendAIChatMessage(messages: [AIChatMessage]) async throws -> AIChatResponse {
        let body = ChatRequest(messages: messages)
        return try await request("/api/ai-chat", method: "POST", body: body)
    }

    // MARK: - User Settings

    func fetchUserSettings() async throws -> UserSettings {
        try await request("/api/user/settings")
    }

    func updateUserSettings(_ settings: UserSettings) async throws -> UserSettings {
        try await request("/api/user/settings", method: "PUT", body: settings)
    }
}

// Wrapper to encode messages array
private struct ChatRequest: Encodable {
    let messages: [AIChatMessage]
}
