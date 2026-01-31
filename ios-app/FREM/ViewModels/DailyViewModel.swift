import Foundation

@Observable
class DailyViewModel {
    var transactions: [Transaction] = []
    var targetData: DailyTargetData?
    var projections: ProjectionSummary?
    var isLoading = true
    var isSubmitting = false
    var error: String?

    // Form state
    var incomeAmount = ""
    var incomeDescription = ""
    var expenseAmount = ""
    var expenseDescription = ""

    var dailyTotal: Double {
        transactions.reduce(0) { sum, t in
            sum + (t.type == .income ? t.amount : -t.amount)
        }
    }

    var dailyTarget: Double {
        targetData?.dailyTarget ?? AuthService.shared.userSettings.dailyBudgetTarget
    }

    var surplus: Double {
        dailyTotal - dailyTarget
    }

    var isOnTrack: Bool {
        surplus >= 0
    }

    var progressPercentage: Double {
        guard dailyTarget > 0 else { return 0 }
        return max(0, min((dailyTotal / dailyTarget) * 100, 100))
    }

    func loadData() async {
        await MainActor.run { isLoading = true; error = nil }

        let today = Date().asDateString

        do {
            async let transactionsTask = APIService.shared.fetchTransactions(date: today)
            async let targetTask = APIService.shared.fetchDailyTarget()
            async let projectionsTask = APIService.shared.fetchProjections()

            let (trans, target, proj) = try await (transactionsTask, targetTask, projectionsTask)

            await MainActor.run {
                self.transactions = trans
                self.targetData = target
                self.projections = proj
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                self.isLoading = false
            }
        }
    }

    func addTransaction(type: TransactionType) async {
        let amountStr = type == .income ? incomeAmount : expenseAmount
        let desc = type == .income ? incomeDescription : expenseDescription

        guard let amount = Double(amountStr), amount > 0, !desc.isEmpty else { return }

        await MainActor.run { isSubmitting = true }

        let request = CreateTransactionRequest(
            type: type.rawValue,
            amount: amount,
            description: desc,
            category: nil,
            transactionDate: Date().asDateString,
            transactionTime: Date().asTimeString
        )

        do {
            let newTransaction = try await APIService.shared.createTransaction(request)

            await MainActor.run {
                transactions.insert(newTransaction, at: 0)
                if type == .income {
                    incomeAmount = ""
                    incomeDescription = ""
                } else {
                    expenseAmount = ""
                    expenseDescription = ""
                }
                isSubmitting = false
            }

            // Refresh target data after adding income
            if type == .income {
                if let updatedTarget = try? await APIService.shared.fetchDailyTarget() {
                    await MainActor.run { targetData = updatedTarget }
                }
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                isSubmitting = false
            }
        }
    }
}
