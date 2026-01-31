import SwiftUI

struct DailyView: View {
    @State private var viewModel = DailyViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else {
                        dailySummaryCard
                        targetBreakdown
                        goalProgressSection
                        inputSection
                        transactionsList
                    }
                }
                .padding()
            }
            .background(Color.fremSlate50)
            .navigationTitle("Today")
            .refreshable {
                await viewModel.loadData()
            }
            .task {
                await viewModel.loadData()
            }
        }
    }

    // MARK: - Daily Summary

    private var dailySummaryCard: some View {
        VStack(spacing: 20) {
            HStack(spacing: 0) {
                // Today's Total
                VStack(spacing: 8) {
                    Image(systemName: "dollarsign.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(.fremBlue)
                    Text(viewModel.dailyTotal.asCurrencyWithCents)
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.fremSlate900)
                    Text("Today's Total")
                        .font(.system(size: 13))
                        .foregroundColor(.fremSlate600)
                }
                .frame(maxWidth: .infinity)

                // Daily Target
                VStack(spacing: 8) {
                    Image(systemName: "target")
                        .font(.system(size: 28))
                        .foregroundColor(viewModel.isOnTrack ? .fremGreen : .orange)
                    Text(viewModel.dailyTarget.asCurrencyWithCents)
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.fremSlate900)
                    Text("Daily Target")
                        .font(.system(size: 13))
                        .foregroundColor(.fremSlate600)
                }
                .frame(maxWidth: .infinity)

                // Surplus/Deficit
                VStack(spacing: 8) {
                    Image(systemName: viewModel.surplus >= 0 ? "arrow.up.right" : "arrow.down.right")
                        .font(.system(size: 28))
                        .foregroundColor(viewModel.surplus >= 0 ? .fremGreen : .fremRed)
                    Text("\(viewModel.surplus >= 0 ? "+" : "")\(viewModel.surplus.asCurrencyWithCents)")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(viewModel.surplus >= 0 ? .fremGreen : .fremRed)
                    Text(viewModel.surplus >= 0 ? "Surplus" : "Deficit")
                        .font(.system(size: 13))
                        .foregroundColor(.fremSlate600)
                }
                .frame(maxWidth: .infinity)
            }

            // Progress bar
            VStack(spacing: 4) {
                HStack {
                    Text("Progress to Goal")
                        .font(.system(size: 13))
                        .foregroundColor(.fremSlate600)
                    Spacer()
                    Text("\(Int(viewModel.progressPercentage))%")
                        .font(.system(size: 13))
                        .foregroundColor(.fremSlate600)
                }
                ProgressView(value: viewModel.progressPercentage / 100)
                    .tint(.fremBlue)
                    .scaleEffect(y: 2)
            }
        }
        .padding()
        .fremCard()
    }

    // MARK: - Target Breakdown

    private var targetBreakdown: some View {
        Group {
            if let target = viewModel.targetData {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Daily Target Breakdown")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.fremSlate900)

                    HStack {
                        HStack {
                            Text("Goals (\(target.activeGoalsCount)):")
                                .font(.system(size: 13))
                                .foregroundColor(.fremSlate600)
                            Spacer()
                            Text("$\(String(format: "%.2f", target.monthlyGoalObligations / 30.44))/day")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.fremBlue)
                        }
                        .frame(maxWidth: .infinity)

                        HStack {
                            Text("Expenses (\(target.recurringExpensesCount)):")
                                .font(.system(size: 13))
                                .foregroundColor(.fremSlate600)
                            Spacer()
                            Text("$\(String(format: "%.2f", target.monthlyRecurringTotal / 30.44))/day")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.fremRed)
                        }
                        .frame(maxWidth: .infinity)
                    }

                    Divider()

                    HStack {
                        Text("Total Daily Need:")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.fremSlate900)
                        Spacer()
                        Text("$\(String(format: "%.2f", target.dailyTarget))")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.fremSlate900)
                    }

                    if target.dailySurplusDeficit != 0 {
                        Text(target.dailySurplusDeficit >= 0
                             ? "On track! \(String(format: "%.2f", target.dailySurplusDeficit))/day surplus expected"
                             : "Need \(String(format: "%.2f", abs(target.dailySurplusDeficit)))/day more income to meet goals"
                        )
                        .font(.system(size: 12))
                        .foregroundColor(target.dailySurplusDeficit >= 0 ? .fremGreen : .fremRed)
                    }
                }
                .padding()
                .background(Color.fremSlate50)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    // MARK: - Goal Progress

    private var goalProgressSection: some View {
        Group {
            if let projections = viewModel.projections, !projections.goals.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Label("Goal Progress", systemImage: "target")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.fremSlate900)

                        if projections.hasVariableIncome {
                            Text("Variable")
                                .font(.system(size: 11, weight: .medium))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.fremAmber.opacity(0.15))
                                .foregroundColor(.fremAmber)
                                .clipShape(Capsule())
                        }
                    }

                    ForEach(projections.goals.prefix(3)) { goal in
                        HStack(spacing: 8) {
                            Image(systemName: goal.statusConfig.iconName)
                                .font(.system(size: 12))
                                .foregroundColor(statusColor(for: goal.status))

                            Text(goal.title)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.fremSlate900)
                                .lineLimit(1)

                            Spacer()

                            ProgressView(value: min(goal.progressPercentage / 100, 1.0))
                                .tint(.fremBlue)
                                .frame(width: 60)

                            Text("\(Int(goal.progressPercentage))%")
                                .font(.system(size: 12))
                                .foregroundColor(.fremSlate600)
                                .frame(width: 40, alignment: .trailing)
                        }
                        .padding(8)
                        .background(Color.fremSlate50)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }

                    if projections.monthlySurplus > 0 {
                        Text("\(projections.monthlySurplus.asCurrency)/mo allocated to goals")
                            .font(.system(size: 12))
                            .foregroundColor(.fremSlate500)
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding()
                .fremCard()
            }
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

    // MARK: - Input Section

    private var inputSection: some View {
        HStack(alignment: .top, spacing: 12) {
            // Income
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 24, height: 24)
                        .background(Color.fremGreen)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                    Text("Add Income")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.fremSlate900)
                }

                TextField("Amount", text: $viewModel.incomeAmount)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.roundedBorder)

                TextField("e.g., Freelance work", text: $viewModel.incomeDescription)
                    .textFieldStyle(.roundedBorder)

                Button {
                    Task { await viewModel.addTransaction(type: .income) }
                } label: {
                    HStack {
                        Image(systemName: "plus")
                        Text(viewModel.isSubmitting ? "Adding..." : "Add Income")
                    }
                    .font(.system(size: 14, weight: .medium))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.fremBlue)
                    .foregroundColor(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(viewModel.incomeAmount.isEmpty || viewModel.incomeDescription.isEmpty || viewModel.isSubmitting)
                .opacity(viewModel.incomeAmount.isEmpty || viewModel.incomeDescription.isEmpty ? 0.5 : 1)
            }
            .padding()
            .fremCard()

            // Expense
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "minus")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 24, height: 24)
                        .background(Color.fremRed)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                    Text("Add Expense")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.fremSlate900)
                }

                TextField("Amount", text: $viewModel.expenseAmount)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.roundedBorder)

                TextField("e.g., Lunch", text: $viewModel.expenseDescription)
                    .textFieldStyle(.roundedBorder)

                Button {
                    Task { await viewModel.addTransaction(type: .expense) }
                } label: {
                    HStack {
                        Image(systemName: "minus")
                        Text(viewModel.isSubmitting ? "Adding..." : "Add Expense")
                    }
                    .font(.system(size: 14, weight: .medium))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.fremGreen)
                    .foregroundColor(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(viewModel.expenseAmount.isEmpty || viewModel.expenseDescription.isEmpty || viewModel.isSubmitting)
                .opacity(viewModel.expenseAmount.isEmpty || viewModel.expenseDescription.isEmpty ? 0.5 : 1)
            }
            .padding()
            .fremCard()
        }
    }

    // MARK: - Transactions List

    private var transactionsList: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Today's Entries")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.fremSlate900)

            if viewModel.transactions.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "dollarsign.circle")
                        .font(.system(size: 40))
                        .foregroundColor(.fremSlate200)
                    Text("No transactions today.\nAdd your first transaction above!")
                        .font(.system(size: 14))
                        .foregroundColor(.fremSlate500)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 32)
            } else {
                ForEach(viewModel.transactions) { transaction in
                    TransactionRow(transaction: transaction)
                }
            }
        }
        .padding()
        .fremCard()
    }
}
