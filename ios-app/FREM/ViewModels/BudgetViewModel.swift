import Foundation

@Observable
class BudgetViewModel {
    var incomeSources: [IncomeSource] = []
    var recurringExpenses: [RecurringExpense] = []
    var sideProjects: [SideProject] = []
    var isLoading = true
    var error: String?

    var totalMonthlyIncome: Double {
        incomeSources.reduce(0) { $0 + $1.estimatedMonthlyMid }
    }

    var totalMonthlyExpenses: Double {
        recurringExpenses.filter { $0.status == .active }.reduce(0) { $0 + $1.amount }
    }

    var totalSideProjectIncome: Double {
        sideProjects.filter { $0.status == .active }.reduce(0) { $0 + $1.currentMonthlyEarnings }
    }

    var monthlySurplus: Double {
        totalMonthlyIncome + totalSideProjectIncome - totalMonthlyExpenses
    }

    func loadData() async {
        await MainActor.run { isLoading = true; error = nil }

        do {
            async let incomeTask = APIService.shared.fetchIncomeSources()
            async let recurringTask = APIService.shared.fetchRecurringExpenses()
            async let projectsTask = APIService.shared.fetchSideProjects()

            let (income, recurring, projects) = try await (incomeTask, recurringTask, projectsTask)

            await MainActor.run {
                self.incomeSources = income
                self.recurringExpenses = recurring
                self.sideProjects = projects
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                self.isLoading = false
            }
        }
    }
}
