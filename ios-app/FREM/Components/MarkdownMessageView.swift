import SwiftUI

struct MarkdownMessageView: View {
    let content: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(parseBlocks().enumerated()), id: \.offset) { _, block in
                switch block {
                case .text(let text):
                    renderTextBlock(text)
                case .codeBlock(let language, let code):
                    renderCodeBlock(language: language, code: code)
                }
            }
        }
    }

    // MARK: - Block Parsing

    private enum MarkdownBlock {
        case text(String)
        case codeBlock(language: String?, code: String)
    }

    private func parseBlocks() -> [MarkdownBlock] {
        var blocks: [MarkdownBlock] = []
        var remaining = content
        let fence = "```"

        while let fenceStart = remaining.range(of: fence) {
            // Text before the fence
            let textBefore = String(remaining[remaining.startIndex..<fenceStart.lowerBound])
            if !textBefore.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                blocks.append(.text(textBefore))
            }

            // After opening fence
            let afterFence = String(remaining[fenceStart.upperBound...])

            // Find the closing fence
            if let closingRange = afterFence.range(of: fence) {
                let codeContent = String(afterFence[afterFence.startIndex..<closingRange.lowerBound])
                let lines = codeContent.split(separator: "\n", maxSplits: 1, omittingEmptySubsequences: false)

                let language: String?
                let code: String

                if let firstLine = lines.first {
                    let firstLineStr = String(firstLine).trimmingCharacters(in: .whitespaces)
                    // If first line looks like a language identifier (no spaces, short)
                    if !firstLineStr.isEmpty && !firstLineStr.contains(" ") && firstLineStr.count < 20 {
                        language = firstLineStr
                        code = lines.count > 1 ? String(lines[1]) : ""
                    } else {
                        language = nil
                        code = codeContent
                    }
                } else {
                    language = nil
                    code = codeContent
                }

                blocks.append(.codeBlock(
                    language: language,
                    code: code.trimmingCharacters(in: .newlines)
                ))

                remaining = String(afterFence[closingRange.upperBound...])
            } else {
                // No closing fence — treat rest as text
                blocks.append(.text(String(remaining[fenceStart.lowerBound...])))
                remaining = ""
            }
        }

        // Remaining text after last code block
        if !remaining.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            blocks.append(.text(remaining))
        }

        return blocks
    }

    // MARK: - Text Block Rendering

    private func renderTextBlock(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            let lines = text.components(separatedBy: "\n")
            ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
                let trimmed = line.trimmingCharacters(in: .whitespaces)
                if trimmed.isEmpty {
                    Spacer().frame(height: 4)
                } else if trimmed.hasPrefix("#### ") {
                    headerView(String(trimmed.dropFirst(5)), size: 13, weight: .bold)
                } else if trimmed.hasPrefix("### ") {
                    headerView(String(trimmed.dropFirst(4)), size: 14, weight: .bold)
                } else if trimmed.hasPrefix("## ") {
                    headerView(String(trimmed.dropFirst(3)), size: 15, weight: .bold)
                } else if trimmed.hasPrefix("# ") {
                    headerView(String(trimmed.dropFirst(2)), size: 16, weight: .bold)
                } else if trimmed.hasPrefix("- ") || trimmed.hasPrefix("* ") {
                    bulletView(String(trimmed.dropFirst(2)))
                } else if let match = trimmed.range(of: #"^\d+\.\s"#, options: .regularExpression) {
                    let number = String(trimmed[trimmed.startIndex..<match.upperBound])
                    let rest = String(trimmed[match.upperBound...])
                    numberedView(number: number, text: rest)
                } else {
                    inlineMarkdownText(trimmed)
                }
            }
        }
    }

    private func headerView(_ text: String, size: CGFloat, weight: Font.Weight) -> some View {
        inlineMarkdownText(text)
            .font(.system(size: size, weight: weight))
    }

    private func bulletView(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 6) {
            Text("\u{2022}")
                .font(.system(size: 14))
                .foregroundColor(.fremTextSecondary)
            inlineMarkdownText(text)
        }
    }

    private func numberedView(number: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 4) {
            Text(number)
                .font(.system(size: 14))
                .foregroundColor(.fremTextSecondary)
            inlineMarkdownText(text)
        }
    }

    @ViewBuilder
    private func inlineMarkdownText(_ text: String) -> some View {
        if let attributed = try? AttributedString(
            markdown: text,
            options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        ) {
            Text(attributed)
                .font(.system(size: 14))
                .foregroundColor(.fremTextPrimary)
        } else {
            Text(text)
                .font(.system(size: 14))
                .foregroundColor(.fremTextPrimary)
        }
    }

    // MARK: - Code Block Rendering

    private func renderCodeBlock(language: String?, code: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            if let language = language {
                HStack {
                    Text(language)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.fremTextTertiary)
                    Spacer()
                    Button {
                        UIPasteboard.general.string = code
                    } label: {
                        Image(systemName: "doc.on.doc")
                            .font(.system(size: 11))
                            .foregroundColor(.fremTextTertiary)
                    }
                }
                .padding(.horizontal, 10)
                .padding(.top, 8)
                .padding(.bottom, 4)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                Text(code)
                    .font(.system(size: 13, design: .monospaced))
                    .foregroundColor(.fremTextPrimary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, language != nil ? 4 : 10)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.fremSurface)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}
