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
                        goalsList
                    }
                }
                .padding()
            }
            .background(Color.fremSlate50)
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
                .foregroundColor(.fremSlate200)
            Text("No goals yet")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.fremSlate900)
            Text("Set financial goals and track your progress toward achieving them.")
                .font(.system(size: 14))
                .foregroundColor(.fremSlate500)
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
                            .foregroundColor(.fremSlate500)
                    }
                    .frame(maxWidth: .infinity)

                    VStack(spacing: 4) {
                        Text(projections.totalMonthlyExpenses.asCurrency)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.fremRed)
                        Text("Monthly Expenses")
                            .font(.system(size: 11))
                            .foregroundColor(.fremSlate500)
                    }
                    .frame(maxWidth: .infinity)

                    VStack(spacing: 4) {
                        Text(projections.monthlySurplus.asCurrency)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(projections.monthlySurplus >= 0 ? .fremBlue : .fremRed)
                        Text("Surplus")
                            .font(.system(size: 11))
                            .foregroundColor(.fremSlate500)
                    }
                    .frame(maxWidth: .infinity)
                }
                .padding()
                .fremCard()
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
                    .foregroundColor(.fremSlate900)

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
                        .foregroundColor(.fremSlate900)
                    Spacer()
                    Text(goal.targetAmount.asCurrency)
                        .font(.system(size: 13))
                        .foregroundColor(.fremSlate500)
                }

                ProgressView(value: min(goal.progressPercentage / 100, 1.0))
                    .tint(.fremBlue)

                HStack {
                    Text("\(Int(goal.progressPercentage))% complete")
                        .font(.system(size: 12))
                        .foregroundColor(.fremSlate500)
                    Spacer()
                    Text("Due: \(goal.deadline.asFormattedDate)")
                        .font(.system(size: 12))
                        .foregroundColor(.fremSlate500)
                }
            }

            // Projection info
            if let projection = projection {
                HStack {
                    HStack(spacing: 4) {
                        Image(systemName: projection.statusConfig.iconName)
                            .font(.system(size: 12))
                        Text(projection.status.rawValue.replacingOccurrences(of: "_", with: " ").capitalized)
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(statusColor(for: projection.status))

                    Spacer()

                    if projection.monthlyAllocation > 0 {
                        Text("\(projection.monthlyAllocation.asCurrency)/mo")
                            .font(.system(size: 12))
                            .foregroundColor(.fremBlue)
                    }

                    Text("Est. \(projection.projectedCompletionDate.asShortDate)")
                        .font(.system(size: 12))
                        .foregroundColor(.fremSlate500)
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

    private func statusColor(for status: ProjectionStatus) -> Color {
        switch status {
        case .completed, .onTrack: return .fremGreen
        case .ahead: return .fremBlue
        case .behind: return .fremAmber
        case .atRisk: return .fremRed
        }
    }
}
