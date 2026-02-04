import Foundation

@Observable
class ChatViewModel {
    var messages: [AIChatMessage] = []
    var inputText = ""
    var isSending = false
    var error: String?

    func sendMessage() async {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        let userMessage = AIChatMessage(role: "user", content: text)

        await MainActor.run {
            messages.append(userMessage)
            inputText = ""
            isSending = true
            error = nil
        }

        do {
            // Server expects {message: string, conversationHistory: [{role, content}]}
            let history = Array(messages.dropLast())
            let response = try await APIService.shared.sendAIChatMessage(
                message: text,
                conversationHistory: history
            )

            let assistantMessage = AIChatMessage(role: "assistant", content: response.text)

            await MainActor.run {
                messages.append(assistantMessage)
                isSending = false
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                isSending = false
            }
        }
    }

    func clearChat() {
        messages.removeAll()
        error = nil
    }
}
