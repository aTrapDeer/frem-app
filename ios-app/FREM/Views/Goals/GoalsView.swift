import SwiftUI

struct GoalsView: View {
    @State private var viewModel = GoalsViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else if viewModel.goals.isEmpty {
                        emptyState
                    } else {
                        projectionSummary
                        allocationBreakdown
                        goalsList
                    }
                }
                .padding()
            }
            .background(Color.fremBackground)
            .navigationTitle("Goals")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.showingCreateForm = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(.fremBlue)
                    }
                }
            }
            .sheet(isPresented: $viewModel.showingCreateForm) {
                GoalFormView(viewModel: viewModel)
            }
            .refreshable {
                await viewModel.loadData()
            }
            .task {
                await viewModel.loadData()
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "target")
                .font(.system(size: 48))
                .foregroundColor(.fremPlaceholder)
            Text("No goals yet")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.fremTextPrimary)
            Text("Set financial goals and track your progress toward achieving them.")
                .font(.system(size: 14))
                .foregroundColor(.fremTextTertiary)
                .multilineTextAlignment(.center)
            Button {
                viewModel.showingCreateForm = true
            } label: {
                HStack {
                    Image(systemName: "plus")
                    Text("Create First Goal")
                }
                .font(.system(size: 14, weight: .medium))
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color.fremBlue)
                .foregroundColor(.white)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }

    // MARK: - Projection Summary

    private var projectionSummary: some View {
        Group {
            if let projections = viewModel.projections {
                HStack(spacing: 12) {
                    VStack(spacing: 4) {
                        Text(projections.totalMonthlyIncome.asCurrency)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.fremGreen)
                        Text("Monthly Income")
                            .font(.system(size: 11))
                            .foregroundColor(.fremTextTertiary)
                    }
                    .frame(maxWidth: .infinity)

                    VStack(spacing: 4) {
                        Text(projections.totalMonthlyExpenses.asCurrency)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.fremRed)
                        Text("Monthly Expenses")
                            .font(.system(size: 11))
                            .foregroundColor(.fremTextTertiary)
                    }
                    .frame(maxWidth: .infinity)

                    VStack(spacing: 4) {
                        Text(projections.monthlySurplus.asCurrency)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(projections.monthlySurplus >= 0 ? .fremBlue : .fremRed)
                        Text("Surplus")
                            .font(.system(size: 11))
                            .foregroundColor(.fremTextTertiary)
                    }
                    .frame(maxWidth: .infinity)
                }
                .padding()
                .fremCard()
            }
        }
    }

    // MARK: - Allocation Breakdown

    private var allocationBreakdown: some View {
        Group {
            if let projections = viewModel.projections {
                let totalAllocated = projections.goals.reduce(0.0) { $0 + $1.monthlyAllocation }

                if totalAllocated > 0 || (projections.bankReserve ?? 0) > 0 {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("Surplus Allocation")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.fremTextPrimary)
                            Spacer()
                            if let reserve = projections.bankReserve, reserve > 0 {
                                HStack(spacing: 4) {
                                    Image(systemName: "banknote")
                                        .font(.system(size: 11))
                                    Text("Reserve: \(reserve.asCurrency)")
                                        .font(.system(size: 12))
                                }
                                .foregroundColor(.fremAmber)
                            }
                        }

                        ForEach(projections.goals) { goal in
                            if goal.monthlyAllocation > 0 {
                                HStack {
                                    Text(goal.title)
                                        .font(.system(size: 13))
                                        .foregroundColor(.fremTextPrimary)
                                        .lineLimit(1)
                                    Spacer()
                                    Text(goal.monthlyAllocation.asCurrency)
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundColor(.fremBlue)
                                    Text("(\(Int(totalAllocated > 0 ? (goal.monthlyAllocation / totalAllocated) * 100 : 0))%)")
                                        .font(.system(size: 11))
                                        .foregroundColor(.fremTextTertiary)
                                        .frame(width: 40, alignment: .trailing)
                                }
                            }
                        }
                    }
                    .padding()
                    .fremCard()
                }
            }
        }
    }

    // MARK: - Goals List

    private var goalsList: some View {
        VStack(spacing: 12) {
            ForEach(viewModel.goals) { goal in
                goalCard(goal)
            }
        }
    }

    private func goalCard(_ goal: FinancialGoal) -> some View {
        let projection = viewModel.projectionFor(goalId: goal.id)

        return VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Image(systemName: goal.category.iconName)
                    .font(.system(size: 16))
                    .foregroundColor(.fremBlue)

                Text(goal.title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.fremTextPrimary)

                Spacer()

                Text(goal.priority.displayName)
                    .font(.system(size: 11, weight: .medium))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(priorityColor(goal.priority).opacity(0.1))
                    .foregroundColor(priorityColor(goal.priority))
                    .clipShape(Capsule())
            }

            // Progress
            VStack(spacing: 4) {
                HStack {
                    Text(goal.currentAmount.asCurrency)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.fremTextPrimary)
                    Spacer()
                    Text(goal.targetAmount.asCurrency)
                        .font(.system(size: 13))
                        .foregroundColor(.fremTextTertiary)
                }

                ProgressView(value: min(goal.progressPercentage / 100, 1.0))
                    .tint(.fremBlue)

                HStack {
                    Text("\(Int(goal.progressPercentage))% complete")
                        .font(.system(size: 12))
                        .foregroundColor(.fremTextTertiary)
                    Spacer()
                    Text("Due: \(goal.deadline.asFormattedDate)")
                        .font(.system(size: 12))
                        .foregroundColor(.fremTextTertiary)
                }
            }

            // Projection info
            if let projection = projection {
                let display = goalDisplayStatus(
                    projectionStatus: projection.status,
                    actualProgress: goal.progressPercentage
                )

                HStack {
                    HStack(spacing: 4) {
                        Image(systemName: display.iconName)
                            .font(.system(size: 12))
                        Text(display.label)
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(display.color)

                    Spacer()

                    if projection.monthlyAllocation > 0 {
                        Text("\(projection.monthlyAllocation.asCurrency)/mo")
                            .font(.system(size: 12))
                            .foregroundColor(.fremBlue)
                    }

                    Text("Est. \(projection.projectedCompletionDate.asShortDate)")
                        .font(.system(size: 12))
                        .foregroundColor(.fremTextTertiary)
                }

                // Timeline suggestion for behind/at_risk goals
                if let suggested = projection.suggestedDeadline,
                   (projection.status == .behind || projection.status == .atRisk) {
                    HStack(spacing: 4) {
                        Image(systemName: "lightbulb.fill")
                            .font(.system(size: 11))
                        Text("Suggested deadline: \(suggested.asFormattedDate)")
                            .font(.system(size: 12))
                    }
                    .foregroundColor(.fremAmber)
                }
            }
        }
        .padding()
        .fremCard()
    }

    private func priorityColor(_ priority: GoalPriority) -> Color {
        switch priority {
        case .high: return .fremRed
        case .medium: return .fremAmber
        case .low: return .fremGreen
        }
    }

    private func goalDisplayStatus(
        projectionStatus: ProjectionStatus,
        actualProgress: Double
    ) -> (label: String, iconName: String, color: Color) {
        // Actually completed — current amount meets or exceeds target
        if actualProgress >= 100 {
            return ("Completed", "checkmark.circle.fill", .fremGreen)
        }

        switch projectionStatus {
        case .completed:
            // Projected to complete, but not there yet
            return ("On Pace", "arrow.up.forward", .fremEmerald)
        case .onTrack:
            return ("On Track", "checkmark.circle.fill", .fremGreen)
        case .ahead:
            return ("Ahead", "arrow.up.right", .fremBlue)
        case .behind:
            return ("Behind", "clock.fill", .fremAmber)
        case .atRisk:
            return ("At Risk", "exclamationmark.triangle.fill", .fremRed)
        }
    }
}
