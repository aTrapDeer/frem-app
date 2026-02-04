import SwiftUI

struct DashboardView: View {
    @State private var viewModel = DashboardViewModel()
    @State private var showingChat = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if viewModel.isLoading {
                        loadingView
                    } else {
                        kpiSection
                        goalProjectionsSection
                        quickStatsSection
                        quickActionsSection
                    }
                }
                .padding()
            }
            .background(Color.fremBackground)
            .navigationTitle("Dashboard")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingChat = true
                    } label: {
                        Image(systemName: "bubble.left.and.text.bubble.right")
                            .foregroundColor(.fremBlue)
                    }
                }
            }
            .sheet(isPresented: $showingChat) {
                AIChatView()
            }
            .refreshable {
                await viewModel.loadData()
            }
            .task {
                await viewModel.loadData()
            }
        }
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(spacing: 16) {
            ForEach(0..<3) { _ in
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.fremSurfaceAlt)
                    .frame(height: 120)
                    .shimmering()
            }
        }
    }

    // MARK: - KPI Cards

    private var kpiSection: some View {
        VStack(spacing: 12) {
            // Goal Likelihood + Monthly Surplus
            HStack(spacing: 12) {
                // Goal Success Likelihood
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Label("Goal Likelihood", systemImage: "gauge.medium")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.fremTextSecondary)
                        Spacer()
                    }
                    GoalLikelihoodRing(projections: viewModel.projections)
                }
                .padding()
                .fremCard()

                // Monthly Surplus
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Label("Monthly Surplus", systemImage: "dollarsign.circle")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.fremTextSecondary)
                        Spacer()
                    }

                    let surplus = viewModel.monthlySurplus
                    let isPositive = surplus >= 0

                    Text("\(isPositive ? "+" : "")\(surplus.asCurrency)")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(isPositive ? .fremGreen : .fremRed)

                    Text(viewModel.surplusStatus.label)
                        .font(.system(size: 12, weight: .medium))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(isPositive ? Color.fremGreen.opacity(0.1) : Color.fremRed.opacity(0.1))
                        .foregroundColor(isPositive ? .fremGreen : .fremRed)
                        .clipShape(Capsule())

                    ProgressView(value: min(abs(surplus) / max(viewModel.monthlyExpenses, 1), 1.0))
                        .tint(isPositive ? .fremGreen : .fremRed)
                }
                .padding()
                .fremCard()
            }

            // Monthly Expenses
            KPICard(
                title: "Monthly Expenses",
                icon: "creditcard",
                value: (viewModel.dashboardData?.monthlyRecurringTotal ?? 0).asCurrency,
                iconColor: .fremTextSecondary
            )
        }
    }

    // MARK: - Goal Projections

    private var goalProjectionsSection: some View {
        Group {
            if let projections = viewModel.projections, !projections.goals.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        FREMSectionHeader(title: "Goal Projections", icon: "chart.line.uptrend.xyaxis")

                        if projections.hasVariableIncome {
                            Text("Variable Income")
                                .font(.system(size: 11, weight: .medium))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.fremAmber.opacity(0.15))
                                .foregroundColor(.fremAmber)
                                .clipShape(Capsule())
                        }

                        Spacer()

                        VStack(alignment: .trailing) {
                            Text("Monthly Surplus")
                                .font(.system(size: 11))
                                .foregroundColor(.fremTextTertiary)
                            Text("+\(projections.monthlySurplus.asCurrency)")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.fremGreen)
                        }
                    }

                    ForEach(projections.goals.prefix(3)) { goal in
                        GoalProjectionCard(projection: goal)
                    }

                    if projections.goals.count > 3 {
                        NavigationLink {
                            GoalsView()
                        } label: {
                            Text("View all \(projections.goals.count) goals \u{2192}")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.fremBlue)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                        }
                    }
                }
                .padding()
                .background(
                    LinearGradient(
                        colors: [.fremSurface, Color.fremBlue.opacity(0.05)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.fremBorder, lineWidth: 1)
                )
            }
        }
    }

    // MARK: - Quick Stats

    private var quickStatsSection: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 12) {
            quickStat(title: "Today's Transactions", value: "\(viewModel.dashboardData?.transactionCount ?? 0)")
            quickStat(title: "Active Goals", value: "\(viewModel.dashboardData?.activeGoalsCount ?? 0)")
            quickStat(title: "Monthly Income", value: (viewModel.projections?.totalMonthlyIncome ?? 0).asCurrency)
            quickStat(title: "Monthly Expenses", value: (viewModel.projections?.totalMonthlyExpenses ?? 0).asCurrency)
        }
    }

    private func quickStat(title: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.fremTextPrimary)
            Text(title)
                .font(.system(size: 12))
                .foregroundColor(.fremTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .fremCard()
    }

    // MARK: - Quick Actions

    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            FREMSectionHeader(title: "Quick Actions", icon: "bolt.fill")

            HStack(spacing: 12) {
                NavigationLink {
                    BudgetView()
                } label: {
                    quickActionButton(icon: "dollarsign", title: "Add Transaction", subtitle: "One-time income or expense", color: .fremGreen)
                }

                NavigationLink {
                    GoalsView()
                } label: {
                    quickActionButton(icon: "target", title: "Update Goals", subtitle: "Track your progress", color: .fremBlue)
                }
            }
        }
        .padding()
        .fremCard()
    }

    private func quickActionButton(icon: String, title: String, subtitle: String, color: Color) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(color)
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.fremTextPrimary)
            Text(subtitle)
                .font(.system(size: 11))
                .foregroundColor(.fremTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.fremSurface)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Shimmer modifier for loading states

struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay(
                LinearGradient(
                    colors: [.clear, .fremCardBg.opacity(0.4), .clear],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .offset(x: phase)
                .animation(.linear(duration: 1.5).repeatForever(autoreverses: false), value: phase)
            )
            .onAppear { phase = 300 }
            .clipped()
    }
}

extension View {
    func shimmering() -> some View {
        modifier(ShimmerModifier())
    }
}
