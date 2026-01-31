import Foundation

@Observable
class SummaryViewModel {
    var summary: SummaryData?
    var milestones: [FinancialMilestone] = []
    var aiReport: String?
    var isLoading = true
    var isLoadingReport = false
    var error: String?

    func loadData() async {
        await MainActor.run { isLoading = true; error = nil }

        do {
            async let summaryTask = APIService.shared.fetchSummary()
            async let milestonesTask = APIService.shared.fetchMilestones()

            let (sum, miles) = try await (summaryTask, milestonesTask)

            await MainActor.run {
                self.summary = sum
                self.milestones = miles
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                self.isLoading = false
            }
        }
    }

    func loadAIReport() async {
        await MainActor.run { isLoadingReport = true }

        do {
            let report = try await APIService.shared.fetchAIReport()
            await MainActor.run {
                self.aiReport = report.text
                self.isLoadingReport = false
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                self.isLoadingReport = false
            }
        }
    }
}
