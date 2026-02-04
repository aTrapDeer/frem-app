import SwiftUI

struct SettingsView: View {
    @State private var viewModel = SettingsViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else {
                        bankReserveSection
                        generalSection
                        accountSection
                    }
                }
                .padding()
            }
            .background(Color.fremBackground)
            .navigationTitle("Settings")
            .task {
                await viewModel.loadSettings()
            }
        }
    }

    // MARK: - Bank Reserve

    private var bankReserveSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "banknote")
                    .font(.system(size: 16))
                    .foregroundColor(.fremBlue)
                Text("Bank Reserve")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.fremTextPrimary)
            }

            Text("Set aside money from your surplus that won't be allocated to goals.")
                .font(.system(size: 13))
                .foregroundColor(.fremTextTertiary)

            Picker("Reserve Type", selection: $viewModel.reserveType) {
                Text("Fixed Amount").tag("amount")
                Text("% of Surplus").tag("percentage")
            }
            .pickerStyle(.segmented)

            HStack {
                if viewModel.reserveType == "amount" {
                    Text("$")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.fremTextSecondary)
                }

                TextField(
                    viewModel.reserveType == "amount" ? "0" : "0",
                    text: $viewModel.reserveAmountText
                )
                .keyboardType(.decimalPad)
                .font(.system(size: 16))
                .foregroundColor(.fremTextPrimary)
                .padding(10)
                .background(Color.fremSurface)
                .clipShape(RoundedRectangle(cornerRadius: 8))

                if viewModel.reserveType == "percentage" {
                    Text("%")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.fremTextSecondary)
                }
            }

            Button {
                Task { await viewModel.saveReserve() }
            } label: {
                HStack {
                    if viewModel.isSaving {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Save Reserve")
                    }
                }
                .font(.system(size: 14, weight: .medium))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(Color.fremBlue)
                .foregroundColor(.white)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            .disabled(viewModel.isSaving)

            if viewModel.saveSuccess {
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.circle.fill")
                    Text("Saved")
                }
                .font(.system(size: 12))
                .foregroundColor(.fremGreen)
            }

            if let error = viewModel.error {
                Text(error)
                    .font(.system(size: 12))
                    .foregroundColor(.fremRed)
            }
        }
        .padding()
        .fremCard()
    }

    // MARK: - General

    private var generalSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "gearshape")
                    .font(.system(size: 16))
                    .foregroundColor(.fremBlue)
                Text("General")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.fremTextPrimary)
            }

            HStack {
                Text("Currency")
                    .font(.system(size: 14))
                    .foregroundColor(.fremTextPrimary)
                Spacer()
                Text(viewModel.settings.currency)
                    .font(.system(size: 14))
                    .foregroundColor(.fremTextTertiary)
            }

            Divider()

            HStack {
                Text("Daily Budget Target")
                    .font(.system(size: 14))
                    .foregroundColor(.fremTextPrimary)
                Spacer()
                Text(String(format: "$%.0f", viewModel.settings.dailyBudgetTarget))
                    .font(.system(size: 14))
                    .foregroundColor(.fremTextTertiary)
            }
        }
        .padding()
        .fremCard()
    }

    // MARK: - Account

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "person.circle")
                    .font(.system(size: 16))
                    .foregroundColor(.fremBlue)
                Text("Account")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.fremTextPrimary)
            }

            Button {
                viewModel.signOut()
            } label: {
                HStack {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                    Text("Sign Out")
                }
                .font(.system(size: 14, weight: .medium))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(Color.fremRed.opacity(0.1))
                .foregroundColor(.fremRed)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .padding()
        .fremCard()
    }
}
