import SwiftUI

struct BudgetView: View {
    @State private var viewModel = BudgetViewModel()
    @State private var selectedTab = 0

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Summary bar
                HStack(spacing: 16) {
                    VStack(spacing: 2) {
                        Text(viewModel.totalMonthlyIncome.asCurrency)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.fremGreen)
                        Text("Income")
                            .font(.system(size: 11))
                            .foregroundColor(.fremTextTertiary)
                    }

                    VStack(spacing: 2) {
                        Text(viewModel.totalMonthlyExpenses.asCurrency)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.fremRed)
                        Text("Expenses")
                            .font(.system(size: 11))
                            .foregroundColor(.fremTextTertiary)
                    }

                    VStack(spacing: 2) {
                        Text(viewModel.monthlySurplus.asCurrency)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(viewModel.monthlySurplus >= 0 ? .fremBlue : .fremRed)
                        Text("Surplus")
                            .font(.system(size: 11))
                            .foregroundColor(.fremTextTertiary)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.fremCardBg)

                // Segment picker
                Picker("Section", selection: $selectedTab) {
                    Text("Income").tag(0)
                    Text("Expenses").tag(1)
                    Text("Side Projects").tag(2)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.vertical, 8)

                // Content
                ScrollView {
                    VStack(spacing: 12) {
                        if viewModel.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity, minHeight: 200)
                        } else {
                            switch selectedTab {
                            case 0: incomeSourcesList
                            case 1: recurringExpensesList
                            case 2: sideProjectsList
                            default: EmptyView()
                            }
                        }
                    }
                    .padding()
                }
            }
            .background(Color.fremBackground)
            .navigationTitle("Budget")
            .refreshable {
                await viewModel.loadData()
            }
            .task {
                await viewModel.loadData()
            }
        }
    }

    // MARK: - Income Sources

    private var incomeSourcesList: some View {
        VStack(spacing: 12) {
            if viewModel.incomeSources.isEmpty {
                emptySection(icon: "dollarsign.circle", message: "No income sources configured")
            } else {
                ForEach(viewModel.incomeSources) { source in
                    incomeSourceCard(source)
                }
            }
        }
    }

    private func incomeSourceCard(_ source: IncomeSource) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(source.name)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.fremTextPrimary)
                        if source.isPrimary {
                            Text("Primary")
                                .font(.system(size: 10, weight: .medium))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.fremBlue.opacity(0.1))
                                .foregroundColor(.fremBlue)
                                .clipShape(Capsule())
                        }
                    }
                    Text("\(source.incomeType.displayName) - \(source.payFrequency.displayName)")
                        .font(.system(size: 12))
                        .foregroundColor(.fremTextTertiary)
                }
                Spacer()
                Text(source.status.rawValue.capitalized)
                    .font(.system(size: 11, weight: .medium))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(source.status == .active ? Color.fremGreen.opacity(0.1) : Color.fremSurfaceAlt)
                    .foregroundColor(source.status == .active ? .fremGreen : .fremTextTertiary)
                    .clipShape(Capsule())
            }

            // Monthly estimates
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("Low")
                        .font(.system(size: 10))
                        .foregroundColor(.fremTextTertiary)
                    Text(source.estimatedMonthlyLow.asCurrency)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.fremTextSecondary)
                }
                VStack(alignment: .leading, spacing: 1) {
                    Text("Mid")
                        .font(.system(size: 10))
                        .foregroundColor(.fremTextTertiary)
                    Text(source.estimatedMonthlyMid.asCurrency)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.fremGreen)
                }
                VStack(alignment: .leading, spacing: 1) {
                    Text("High")
                        .font(.system(size: 10))
                        .foregroundColor(.fremTextTertiary)
                    Text(source.estimatedMonthlyHigh.asCurrency)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.fremTextSecondary)
                }
            }

            // Contract dates
            if let start = source.startDate, let end = source.endDate {
                HStack {
                    Label(start.asShortDate, systemImage: "calendar")
                    Text("\u{2192}")
                    Text(end.asShortDate)
                }
                .font(.system(size: 11))
                .foregroundColor(.fremTextTertiary)
            }
        }
        .padding()
        .fremCard()
    }

    // MARK: - Recurring Expenses

    private var recurringExpensesList: some View {
        VStack(spacing: 12) {
            if viewModel.recurringExpenses.isEmpty {
                emptySection(icon: "creditcard", message: "No recurring expenses")
            } else {
                ForEach(viewModel.recurringExpenses) { expense in
                    HStack(spacing: 12) {
                        Image(systemName: expense.category.iconName)
                            .font(.system(size: 16))
                            .foregroundColor(.white)
                            .frame(width: 36, height: 36)
                            .background(Color.fremRed.opacity(0.8))
                            .clipShape(RoundedRectangle(cornerRadius: 8))

                        VStack(alignment: .leading, spacing: 2) {
                            Text(expense.name)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.fremTextPrimary)
                            HStack(spacing: 8) {
                                Text("Due: \(ordinal(expense.dueDate))")
                                if expense.autoPay {
                                    Label("Auto-pay", systemImage: "arrow.triangle.2.circlepath")
                                }
                            }
                            .font(.system(size: 12))
                            .foregroundColor(.fremTextTertiary)
                        }

                        Spacer()

                        Text(expense.amount.asCurrency)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.fremRed)
                    }
                    .padding()
                    .fremCard()
                }

                // Total
                HStack {
                    Text("Total Monthly")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.fremTextPrimary)
                    Spacer()
                    Text(viewModel.totalMonthlyExpenses.asCurrency)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.fremRed)
                }
                .padding()
                .background(Color.fremSurfaceAlt)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    // MARK: - Side Projects

    private var sideProjectsList: some View {
        VStack(spacing: 12) {
            if viewModel.sideProjects.isEmpty {
                emptySection(icon: "briefcase", message: "No side projects")
            } else {
                ForEach(viewModel.sideProjects) { project in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(project.name)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.fremTextPrimary)
                            Spacer()
                            Text(project.status.displayName)
                                .font(.system(size: 11, weight: .medium))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(project.status == .active ? Color.fremGreen.opacity(0.1) : Color.fremSurfaceAlt)
                                .foregroundColor(project.status == .active ? .fremGreen : .fremTextTertiary)
                                .clipShape(Capsule())
                        }

                        HStack(spacing: 16) {
                            VStack(alignment: .leading) {
                                Text("Current")
                                    .font(.system(size: 11))
                                    .foregroundColor(.fremTextTertiary)
                                Text(project.currentMonthlyEarnings.asCurrency)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.fremGreen)
                            }
                            VStack(alignment: .leading) {
                                Text("Projected")
                                    .font(.system(size: 11))
                                    .foregroundColor(.fremTextTertiary)
                                Text(project.projectedMonthlyEarnings.asCurrency)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.fremBlue)
                            }
                            VStack(alignment: .leading) {
                                Text("Hours/wk")
                                    .font(.system(size: 11))
                                    .foregroundColor(.fremTextTertiary)
                                Text("\(String(format: "%.0f", project.timeInvestedWeekly))h")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.fremTextPrimary)
                            }
                        }
                    }
                    .padding()
                    .fremCard()
                }
            }
        }
    }

    // MARK: - Helpers

    private func emptySection(icon: String, message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 36))
                .foregroundColor(.fremPlaceholder)
            Text(message)
                .font(.system(size: 14))
                .foregroundColor(.fremTextTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private func ordinal(_ day: Int) -> String {
        let suffix: String
        switch day {
        case 1, 21, 31: suffix = "st"
        case 2, 22: suffix = "nd"
        case 3, 23: suffix = "rd"
        default: suffix = "th"
        }
        return "\(day)\(suffix)"
    }
}
