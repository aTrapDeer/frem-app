import SwiftUI

// MARK: - FREM Color Palette (matches web Tailwind colors)
extension Color {
    // Primary
    static let fremBlue = Color(red: 37/255, green: 99/255, blue: 235/255)       // blue-600
    static let fremBlueLight = Color(red: 96/255, green: 165/255, blue: 250/255)  // blue-400
    static let fremBlueDark = Color(red: 29/255, green: 78/255, blue: 216/255)    // blue-700

    // Semantic
    static let fremGreen = Color(red: 22/255, green: 163/255, blue: 74/255)      // green-600
    static let fremRed = Color(red: 220/255, green: 38/255, blue: 38/255)        // red-600
    static let fremAmber = Color(red: 217/255, green: 119/255, blue: 6/255)      // amber-600
    static let fremEmerald = Color(red: 16/255, green: 185/255, blue: 129/255)   // emerald-500

    // Slate grays
    static let fremSlate50 = Color(red: 248/255, green: 250/255, blue: 252/255)
    static let fremSlate100 = Color(red: 241/255, green: 245/255, blue: 249/255)
    static let fremSlate200 = Color(red: 226/255, green: 232/255, blue: 240/255)
    static let fremSlate500 = Color(red: 100/255, green: 116/255, blue: 139/255)
    static let fremSlate600 = Color(red: 71/255, green: 85/255, blue: 105/255)
    static let fremSlate900 = Color(red: 15/255, green: 23/255, blue: 42/255)
}

// MARK: - Typography helpers
extension Font {
    static let fremTitle = Font.system(size: 28, weight: .bold, design: .default)
    static let fremHeadline = Font.system(size: 20, weight: .semibold, design: .default)
    static let fremBody = Font.system(size: 16, weight: .regular, design: .default)
    static let fremCaption = Font.system(size: 13, weight: .regular, design: .default)
    static let fremNumbers = Font.system(size: 24, weight: .bold, design: .monospaced)
}

// MARK: - View modifiers
struct FREMCardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

extension View {
    func fremCard() -> some View {
        modifier(FREMCardStyle())
    }
}
