import SwiftUI

struct ProgressRing: View {
    let progress: Double // 0-100
    let size: CGFloat
    let lineWidth: CGFloat
    var color: Color = .fremBlue
    var showLabel: Bool = true

    var body: some View {
        ZStack {
            // Background ring
            Circle()
                .stroke(Color.fremBorder, lineWidth: lineWidth)

            // Progress ring
            Circle()
                .trim(from: 0, to: min(progress / 100, 1.0))
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 1.0), value: progress)

            // Label
            if showLabel {
                Text("\(Int(progress))%")
                    .font(.system(size: size * 0.25, weight: .bold))
                    .foregroundColor(color)
            }
        }
        .frame(width: size, height: size)
    }
}

struct GoalLikelihoodRing: View {
    let projections: ProjectionSummary?

    private var likelihood: (percentage: Double, label: String, color: Color, trend: String) {
        guard let projections = projections, !projections.goals.isEmpty else {
            return (0, "No Goals", .fremTextTertiary, "neutral")
        }

        let statusWeights: [ProjectionStatus: Double] = [
            .completed: 100,
            .ahead: 95,
            .onTrack: 85,
            .behind: 50,
            .atRisk: 20
        ]

        let totalWeight = projections.goals.reduce(0.0) { sum, goal in
            sum + (statusWeights[goal.status] ?? 50)
        }
        let avg = totalWeight / Double(projections.goals.count)

        if avg >= 85 { return (avg, "Excellent", .fremEmerald, "up") }
        if avg >= 70 { return (avg, "Good", .fremGreen, "up") }
        if avg >= 50 { return (avg, "Moderate", .fremAmber, "neutral") }
        if avg >= 30 { return (avg, "At Risk", .orange, "down") }
        return (avg, "Critical", .fremRed, "down")
    }

    var body: some View {
        let data = likelihood

        HStack(spacing: 16) {
            ProgressRing(
                progress: data.percentage,
                size: 64,
                lineWidth: 5,
                color: data.color
            )

            VStack(alignment: .leading, spacing: 4) {
                Text(data.label)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(data.color)

                if let projections = projections, !projections.goals.isEmpty {
                    let onTrack = projections.goals.filter { [.completed, .ahead, .onTrack].contains($0.status) }.count
                    let needsWork = projections.goals.filter { [.behind, .atRisk].contains($0.status) }.count

                    if onTrack > 0 {
                        Label("\(onTrack) on track", systemImage: "checkmark.circle.fill")
                            .font(.system(size: 12))
                            .foregroundColor(.fremGreen)
                    }
                    if needsWork > 0 {
                        Label("\(needsWork) need attention", systemImage: "exclamationmark.triangle.fill")
                            .font(.system(size: 12))
                            .foregroundColor(.fremAmber)
                    }
                } else {
                    Text("Add goals to track")
                        .font(.system(size: 12))
                        .foregroundColor(.fremTextTertiary)
                }
            }
        }
    }
}
