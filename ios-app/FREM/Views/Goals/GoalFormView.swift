import SwiftUI

struct GoalFormView: View {
    @Bindable var viewModel: GoalsViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Goal Details") {
                    TextField("Title", text: $viewModel.newTitle)
                    TextField("Description (optional)", text: $viewModel.newDescription)

                    Picker("Category", selection: $viewModel.newCategory) {
                        ForEach(GoalCategory.allCases, id: \.self) { category in
                            Label(category.displayName, systemImage: category.iconName)
                                .tag(category)
                        }
                    }
                }

                Section("Amount") {
                    HStack {
                        Text("$")
                        TextField("Target Amount", text: $viewModel.newTargetAmount)
                            .keyboardType(.decimalPad)
                    }
                    HStack {
                        Text("$")
                        TextField("Current Amount (optional)", text: $viewModel.newCurrentAmount)
                            .keyboardType(.decimalPad)
                    }
                    HStack {
                        Text("%")
                        TextField("Interest Rate (optional)", text: $viewModel.newInterestRate)
                            .keyboardType(.decimalPad)
                    }
                }

                Section("Timeline") {
                    DatePicker("Deadline", selection: $viewModel.newDeadline, displayedComponents: .date)
                }

                Section("Priority") {
                    Picker("Priority", selection: $viewModel.newPriority) {
                        ForEach(GoalPriority.allCases, id: \.self) { priority in
                            Text(priority.displayName).tag(priority)
                        }
                    }
                    .pickerStyle(.segmented)

                    VStack(alignment: .leading) {
                        Text("Urgency Score: \(viewModel.newUrgencyScore)")
                            .font(.system(size: 14))
                        Slider(value: Binding(
                            get: { Double(viewModel.newUrgencyScore) },
                            set: { viewModel.newUrgencyScore = Int($0) }
                        ), in: 1...5, step: 1)
                        .tint(.fremBlue)
                        HStack {
                            Text("Low").font(.system(size: 11)).foregroundColor(.fremSlate500)
                            Spacer()
                            Text("High").font(.system(size: 11)).foregroundColor(.fremSlate500)
                        }
                    }
                }
            }
            .navigationTitle("New Goal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        viewModel.resetForm()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Create") {
                        Task {
                            await viewModel.createGoal()
                        }
                    }
                    .fontWeight(.semibold)
                    .disabled(viewModel.newTitle.isEmpty || viewModel.newTargetAmount.isEmpty)
                }
            }
        }
    }
}
