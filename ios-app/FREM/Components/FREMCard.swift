import SwiftUI

struct FREMCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding()
            .background(Color.fremCardBg)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .fremShadow, radius: 8, x: 0, y: 2)
    }
}

struct FREMSectionHeader: View {
    let title: String
    let icon: String
    var iconColor: Color = .fremBlue

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 28, height: 28)
                .background(iconColor)
                .clipShape(RoundedRectangle(cornerRadius: 8))

            Text(title)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.fremTextPrimary)
        }
    }
}
