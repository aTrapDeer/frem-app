import SwiftUI

struct SummaryView: View {
    @State private var viewModel = SummaryViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else {
                        financialOverview
                        aiReportSection
                        milestonesSection
                    }
                }
                .padding()
            }
            .background(Color.fremSlate50)
            .navigationTitle("Summary")
            .refreshable {
                await viewModel.loadData()
            }
            .task {
                await viewModel.loadData()
            }
        }
    }

    // MARK: - Financial Overview

    private var financialOverview: some View {
        VStack(alignment: .leading, spacing: 12) {
            FREMSectionHeader(title: "Financial Overview", icon: "chart.bar.fill")

            if let summary = viewModel.summary {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    overviewCard(
                        title: "Monthly Income",
                        value: (summary.monthlyIncome ?? 0).asCurrency,
                        color: .fremGreen,
                        icon: "arrow.up.circle.fill"
                    )
                    overviewCard(
                        title: "Monthly Expenses",
                        value: (summary.monthlyExpenses ?? 0).asCurrency,
                        color: .fremRed,
                        icon: "arrow.down.circle.fill"
                    )
                    overviewCard(
                        title: "Net Savings",
                        value: (summary.netSavings ?? 0).asCurrency,
                        color: (summary.netSavings ?? 0) >= 0 ? .fremBlue : .fremRed,
                        icon: "banknote.fill"
                    )
                    overviewCard(
                        title: "Savings Rate",
                        value: "\(Int(summary.savingsRate ?? 0))%",
                        color: .fremEmerald,
                        icon: "percent"
                    )
                }
            } else {
                Text("No summary data available")
                    .font(.system(size: 14))
                    .foregroundColor(.fremSlate500)
                    .frame(maxWidth: .infinity)
                    .padding()
            }
        }
        .padding()
        .fremCard()
    }

    private func overviewCard(title: String, value: String, color: Color, icon: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(color)
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.fremSlate900)
            Text(title)
                .font(.system(size: 11))
                .foregroundColor(.fremSlate500)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(color.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - AI Report

    private var aiReportSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                FREMSectionHeader(title: "AI Financial Advisor", icon: "sparkles", iconColor: .purple)
                Spacer()
                if viewModel.aiReport == nil {
                    Button {
                        Task { await viewModel.loadAIReport() }
                    } label: {
                        Text("Generate Report")
                            .font(.system(size: 13, weight: .medium))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.purple.opacity(0.1))
                            .foregroundColor(.purple)
                            .clipShape(Capsule())
                    }
                }
            }

            if viewModel.isLoadingReport {
                HStack(spacing: 8) {
                    ProgressView()
                    Text("Analyzing your finances...")
                        .font(.system(size: 13))
                        .foregroundColor(.fremSlate500)
                }
                .frame(maxWidth: .infinity)
                .padding()
            } else if let report = viewModel.aiReport {
                Text(report)
                    .font(.system(size: 14))
                    .foregroundColor(.fremSlate900)
                    .lineSpacing(4)
            } else {
                Text("Tap 'Generate Report' for AI-powered financial insights and recommendations.")
                    .font(.system(size: 13))
                    .foregroundColor(.fremSlate500)
            }
        }
        .padding()
        .fremCard()
    }

    // MARK: - Milestones

    private var milestonesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            FREMSectionHeader(title: "Financial Milestones", icon: "flag.fill", iconColor: .fremEmerald)

            if viewModel.milestones.isEmpty {
                Text("No milestones yet. Add milestones from the web app to track major financial achievements.")
                    .font(.system(size: 13))
                    .foregroundColor(.fremSlate500)
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                ForEach(viewModel.milestones) { milestone in
                    HStack(spacing: 12) {
                        Image(systemName: milestone.category.iconName)
                            .font(.system(size: 14))
                            .foregroundColor(.white)
                            .frame(width: 32, height: 32)
                            .background(milestoneStatusColor(milestone.status))
                            .clipShape(Circle())

                        VStack(alignment: .leading, spacing: 2) {
                            Text(milestone.title)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.fremSlate900)

                            if let target = milestone.targetAmount {
                                Text("\(milestone.currentAmount.asCurrency) / \(target.asCurrency)")
                                    .font(.system(size: 12))
                                    .foregroundColor(.fremSlate500)
                            }
                        }

                        Spacer()

                        Text(milestone.status.rawValue.capitalized)
                            .font(.system(size: 11, weight: .medium))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(milestoneStatusColor(milestone.status).opacity(0.1))
                            .foregroundColor(milestoneStatusColor(milestone.status))
                            .clipShape(Capsule())
                    }
                    .padding(10)
                    .background(Color.fremSlate50)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
        }
        .padding()
        .fremCard()
    }

    private func milestoneStatusColor(_ status: MilestoneStatus) -> Color {
        switch status {
        case .planned: return .fremSlate500
        case .inProgress: return .fremBlue
        case .completed: return .fremGreen
        case .cancelled: return .fremSlate200
        }
    }
}
