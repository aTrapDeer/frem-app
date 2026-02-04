import SwiftUI

struct KPICard: View {
    let title: String
    let icon: String
    let value: String
    var subtitle: String?
    var valueColor: Color = .fremTextPrimary
    var iconColor: Color = .fremTextSecondary
    var progress: Double?
    var target: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.fremTextSecondary)
                Spacer()
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundColor(iconColor)
            }

            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.system(size: 24, weight: .bold, design: .monospaced))
                    .foregroundColor(valueColor)

                if let target = target {
                    Text("/\(target)")
                        .font(.system(size: 16))
                        .foregroundColor(.fremTextTertiary)
                }
            }

            if let subtitle = subtitle {
                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundColor(.fremTextTertiary)
            }

            if let progress = progress {
                ProgressView(value: min(progress, 1.0))
                    .tint(.fremBlue)

                Text("\(Int(progress * 100))% of target")
                    .font(.system(size: 11))
                    .foregroundColor(.fremTextSecondary)
            }
        }
        .padding()
        .background(Color.fremCardBg)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .fremShadow, radius: 8, x: 0, y: 2)
    }
}
