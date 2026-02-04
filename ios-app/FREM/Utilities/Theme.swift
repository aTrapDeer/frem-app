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

    // Slate grays (raw values — prefer adaptive semantic colors below)
    static let fremSlate50 = Color(red: 248/255, green: 250/255, blue: 252/255)
    static let fremSlate100 = Color(red: 241/255, green: 245/255, blue: 249/255)
    static let fremSlate200 = Color(red: 226/255, green: 232/255, blue: 240/255)
    static let fremSlate500 = Color(red: 100/255, green: 116/255, blue: 139/255)
    static let fremSlate600 = Color(red: 71/255, green: 85/255, blue: 105/255)
    static let fremSlate900 = Color(red: 15/255, green: 23/255, blue: 42/255)

    // MARK: - Adaptive semantic colors (auto-switch for dark mode)

    /// Page / scroll-view background
    static let fremBackground = Color(UIColor { tc in
        tc.userInterfaceStyle == .dark
            ? UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
            : UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
    })

    /// Card / elevated surface background
    static let fremCardBg = Color(UIColor { tc in
        tc.userInterfaceStyle == .dark
            ? UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1)
            : UIColor.white
    })

    /// Inner surface inside cards (list rows, nested sections)
    static let fremSurface = Color(UIColor { tc in
        tc.userInterfaceStyle == .dark
            ? UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1)
            : UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
    })

    /// Subtle alternate surface
    static let fremSurfaceAlt = Color(UIColor { tc in
        tc.userInterfaceStyle == .dark
            ? UIColor(red: 30/255, green: 41/255, blue: 59/255, alpha: 1)
            : UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1)
    })

    /// Primary text
    static let fremTextPrimary = Color(UIColor { tc in
        tc.userInterfaceStyle == .dark
            ? UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
            : UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
    })

    /// Secondary text
    static let fremTextSecondary = Color(UIColor { tc in
        tc.userInterfaceStyle == .dark
            ? UIColor(red: 203/255, green: 213/255, blue: 225/255, alpha: 1)
            : UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
    })

    /// Tertiary / caption text
    static let fremTextTertiary = Color(UIColor { tc in
        tc.userInterfaceStyle == .dark
            ? UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1)
            : UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
    })

    /// Borders & dividers
    static let fremBorder = Color(UIColor { tc in
        tc.userInterfaceStyle == .dark
            ? UIColor(red: 51/255, green: 65/255, blue: 85/255, alpha: 1)
            : UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1)
    })

    /// Placeholder / empty-state icons
    static let fremPlaceholder = Color(UIColor { tc in
        tc.userInterfaceStyle == .dark
            ? UIColor(red: 71/255, green: 85/255, blue: 105/255, alpha: 1)
            : UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1)
    })

    /// Card shadow
    static let fremShadow = Color(UIColor { tc in
        tc.userInterfaceStyle == .dark
            ? UIColor.black.withAlphaComponent(0.3)
            : UIColor.black.withAlphaComponent(0.05)
    })
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
            .background(Color.fremCardBg)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .fremShadow, radius: 8, x: 0, y: 2)
    }
}

extension View {
    func fremCard() -> some View {
        modifier(FREMCardStyle())
    }
}
