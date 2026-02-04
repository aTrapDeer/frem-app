import SwiftUI

struct AIChatView: View {
    @State private var viewModel = ChatViewModel()
    @Environment(\.dismiss) private var dismiss
    @FocusState private var isInputFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Messages
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            if viewModel.messages.isEmpty {
                                welcomeMessage
                            }

                            ForEach(viewModel.messages) { message in
                                messageBubble(message)
                                    .id(message.id)
                            }

                            if viewModel.isSending {
                                HStack(spacing: 8) {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                    Text("Thinking...")
                                        .font(.system(size: 13))
                                        .foregroundColor(.fremTextTertiary)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal)
                                .id("loading")
                            }
                        }
                        .padding()
                    }
                    .onChange(of: viewModel.messages.count) {
                        withAnimation {
                            if let lastMessage = viewModel.messages.last {
                                proxy.scrollTo(lastMessage.id, anchor: .bottom)
                            }
                        }
                    }
                }

                // Error
                if let error = viewModel.error {
                    Text(error)
                        .font(.system(size: 12))
                        .foregroundColor(.fremRed)
                        .padding(.horizontal)
                        .padding(.vertical, 4)
                }

                Divider()

                // Input bar
                HStack(spacing: 8) {
                    TextField("Ask about your finances...", text: $viewModel.inputText, axis: .vertical)
                        .textFieldStyle(.plain)
                        .lineLimit(1...4)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.fremSurface)
                        .clipShape(RoundedRectangle(cornerRadius: 20))
                        .focused($isInputFocused)

                    Button {
                        Task { await viewModel.sendMessage() }
                    } label: {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(viewModel.inputText.trimmingCharacters(in: .whitespaces).isEmpty ? .fremPlaceholder : .fremBlue)
                    }
                    .disabled(viewModel.inputText.trimmingCharacters(in: .whitespaces).isEmpty || viewModel.isSending)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(Color.fremCardBg)
            }
            .navigationTitle("AI Advisor")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.clearChat()
                    } label: {
                        Image(systemName: "trash")
                            .foregroundColor(.fremTextTertiary)
                    }
                    .disabled(viewModel.messages.isEmpty)
                }
            }
        }
    }

    // MARK: - Welcome

    private var welcomeMessage: some View {
        VStack(spacing: 12) {
            Image(systemName: "sparkles")
                .font(.system(size: 36))
                .foregroundColor(.purple)
            Text("FREM AI Financial Advisor")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.fremTextPrimary)
            Text("Ask me anything about your finances. I can help with budgeting advice, goal planning, spending analysis, and more.")
                .font(.system(size: 14))
                .foregroundColor(.fremTextTertiary)
                .multilineTextAlignment(.center)

            // Suggestion chips
            VStack(spacing: 8) {
                suggestionChip("How am I doing with my goals?")
                suggestionChip("What should I prioritize?")
                suggestionChip("How can I save more?")
            }
        }
        .padding(.vertical, 40)
    }

    private func suggestionChip(_ text: String) -> some View {
        Button {
            viewModel.inputText = text
            Task { await viewModel.sendMessage() }
        } label: {
            Text(text)
                .font(.system(size: 13))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(Color.fremBlue.opacity(0.08))
                .foregroundColor(.fremBlue)
                .clipShape(Capsule())
        }
    }

    // MARK: - Message Bubble

    private func messageBubble(_ message: AIChatMessage) -> some View {
        let isUser = message.role == "user"

        return HStack {
            if isUser { Spacer(minLength: 60) }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
                if isUser {
                    Text(message.content)
                        .font(.system(size: 14))
                        .foregroundColor(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.fremBlue)
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                } else {
                    MarkdownMessageView(content: message.content)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.fremSurface)
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                }
            }

            if !isUser { Spacer(minLength: 60) }
        }
    }
}
