import SwiftUI

struct GoalProjectionCard: View {
    let projection: GoalProjection

    private var statusColor: Color {
        switch projection.status {
        case .completed, .onTrack: return .fremGreen
        case .ahead: return .fremBlue
        case .behind: return .fremAmber
        case .atRisk: return .fremRed
        }
    }

    private var statusIcon: String {
        projection.statusConfig.iconName
    }

    var body: some View {
        HStack(spacing: 12) {
            // Status icon
            Image(systemName: statusIcon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 32, height: 32)
                .background(statusColor)
                .clipShape(Circle())

            // Goal info
            VStack(alignment: .leading, spacing: 2) {
                Text(projection.title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.fremSlate900)
                    .lineLimit(1)

                Text("\(projection.totalProjectedProgress.asCurrency) / \(projection.targetAmount.asCurrency)")
                    .font(.system(size: 12))
                    .foregroundColor(.fremSlate500)
            }

            Spacer()

            // Progress
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(Int(projection.progressPercentage))%")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(statusColor)

                HStack(spacing: 4) {
                    Image(systemName: "calendar")
                        .font(.system(size: 10))
                    Text(projection.projectedCompletionDate.asShortDate)
                        .font(.system(size: 11))
                }
                .foregroundColor(.fremSlate500)
            }
        }
        .padding(12)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.fremSlate100, lineWidth: 1)
        )
    }
}
