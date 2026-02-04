import Foundation

@Observable
class SummaryViewModel {
    var summary: SummaryResponse?
    var milestones: [FinancialMilestone] = []
    var aiReport: String?
    var isLoading = true
    var isLoadingReport = false
    var error: String?

    func loadData() async {
        await MainActor.run { isLoading = true; error = nil }

        do {
            let response = try await APIService.shared.fetchSummary()

            await MainActor.run {
                self.summary = response
                self.milestones = response.milestones ?? []
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
