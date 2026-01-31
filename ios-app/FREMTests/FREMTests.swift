import XCTest
@testable import FREM

final class FREMTests: XCTestCase {
    func testCurrencyFormatting() {
        XCTAssertEqual(1234.0.asCurrency, "$1,234")
        XCTAssertEqual(0.0.asCurrency, "$0")
        XCTAssertEqual(99999.0.asCurrency, "$99,999")
    }

    func testCurrencyWithCentsFormatting() {
        XCTAssertEqual(1234.56.asCurrencyWithCents, "$1,234.56")
        XCTAssertEqual(0.0.asCurrencyWithCents, "$0.00")
    }

    func testDateStringParsing() {
        let dateStr = "2025-06-15"
        XCTAssertNotNil(dateStr.toDate)
        XCTAssertEqual(dateStr.asFormattedDate, "Jun 15, 2025")
    }

    func testGoalProgressPercentage() {
        let goal = FinancialGoal(
            id: "test",
            userId: nil,
            title: "Test Goal",
            description: nil,
            targetAmount: 1000,
            currentAmount: 250,
            category: .emergency,
            startDate: nil,
            deadline: "2025-12-31",
            interestRate: nil,
            priority: .medium,
            urgencyScore: 3,
            status: .active,
            createdAt: nil,
            updatedAt: nil,
            completedAt: nil
        )

        XCTAssertEqual(goal.progressPercentage, 25.0)
        XCTAssertEqual(goal.remainingAmount, 750.0)
    }
}
