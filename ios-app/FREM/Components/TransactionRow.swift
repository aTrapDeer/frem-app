import SwiftUI

struct TransactionRow: View {
    let transaction: Transaction

    private var isIncome: Bool { transaction.type == .income }

    private var formattedTime: String {
        guard let timeStr = transaction.transactionTime,
              let date = "1970-01-01T\(timeStr)".toDate ?? "1970-01-01 \(timeStr)".toDate else {
            return ""
        }
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }

    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: isIncome ? "arrow.up.right" : "arrow.down.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 32, height: 32)
                .background(isIncome ? Color.fremGreen : Color.fremRed)
                .clipShape(RoundedRectangle(cornerRadius: 8))

            // Description
            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.description)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.fremSlate900)
                    .lineLimit(1)

                if !formattedTime.isEmpty {
                    Text(formattedTime)
                        .font(.system(size: 12))
                        .foregroundColor(.fremSlate500)
                }
            }

            Spacer()

            // Amount
            Text("\(isIncome ? "+" : "-")\(transaction.amount.asCurrencyWithCents)")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(isIncome ? .fremGreen : .fremRed)
        }
        .padding(12)
        .background(Color.fremSlate50)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
