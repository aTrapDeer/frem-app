import Foundation

@Observable
class DashboardViewModel {
    var dashboardData: DashboardData?
    var projections: ProjectionSummary?
    var isLoading = true
    var error: String?

    func loadData() async {
        await MainActor.run { isLoading = true; error = nil }

        do {
            async let dashboardTask = APIService.shared.fetchDashboard()
            async let projectionsTask = APIService.shared.fetchProjections()

            let (dashboard, proj) = try await (dashboardTask, projectionsTask)

            await MainActor.run {
                self.dashboardData = dashboard
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

    var monthlySurplus: Double {
        projections?.monthlySurplus ?? 0
    }

    var monthlyExpenses: Double {
        projections?.totalMonthlyExpenses ?? 0
    }

    var surplusStatus: (label: String, color: String) {
        let surplus = monthlySurplus
        let expenses = monthlyExpenses

        if surplus >= expenses * 0.3 { return ("Strong", "emerald") }
        if surplus >= expenses * 0.1 { return ("Healthy", "green") }
        if surplus > 0 { return ("Tight", "amber") }
        return ("Deficit", "red")
    }
}
