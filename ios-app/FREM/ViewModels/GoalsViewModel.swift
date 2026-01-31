import Foundation

@Observable
class GoalsViewModel {
    var goals: [FinancialGoal] = []
    var projections: ProjectionSummary?
    var isLoading = true
    var error: String?
    var showingCreateForm = false

    // Create form state
    var newTitle = ""
    var newDescription = ""
    var newTargetAmount = ""
    var newCurrentAmount = ""
    var newCategory: GoalCategory = .other
    var newDeadline = Calendar.current.date(byAdding: .month, value: 6, to: Date()) ?? Date()
    var newPriority: GoalPriority = .medium
    var newUrgencyScore = 3
    var newInterestRate = ""

    func loadData() async {
        await MainActor.run { isLoading = true; error = nil }

        do {
            async let goalsTask = APIService.shared.fetchGoals()
            async let projectionsTask = APIService.shared.fetchProjections()

            let (fetchedGoals, proj) = try await (goalsTask, projectionsTask)

            await MainActor.run {
                self.goals = fetchedGoals
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

    func createGoal() async {
        guard let target = Double(newTargetAmount), target > 0, !newTitle.isEmpty else { return }

        let request = CreateGoalRequest(
            title: newTitle,
            description: newDescription.isEmpty ? nil : newDescription,
            targetAmount: target,
            currentAmount: Double(newCurrentAmount) ?? 0,
            category: newCategory.rawValue,
            deadline: newDeadline.asDateString,
            priority: newPriority.rawValue,
            urgencyScore: newUrgencyScore,
            interestRate: Double(newInterestRate),
            startDate: Date().asDateString
        )

        do {
            let newGoal = try await APIService.shared.createGoal(request)
            await MainActor.run {
                goals.insert(newGoal, at: 0)
                resetForm()
                showingCreateForm = false
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
            }
        }
    }

    func resetForm() {
        newTitle = ""
        newDescription = ""
        newTargetAmount = ""
        newCurrentAmount = ""
        newCategory = .other
        newDeadline = Calendar.current.date(byAdding: .month, value: 6, to: Date()) ?? Date()
        newPriority = .medium
        newUrgencyScore = 3
        newInterestRate = ""
    }

    func projectionFor(goalId: String) -> GoalProjection? {
        projections?.goals.first { $0.goalId == goalId }
    }
}
