import Foundation

enum Config {
    // MARK: - API Configuration
    // Update this to your deployed Vercel URL or local dev server
    static let apiBaseURL = "https://frem.vercel.app/"

    // MARK: - Google Sign-In
    // Add your iOS Google Client ID from Google Cloud Console
    static let googleClientID = "234347869786-j99g3kk5nqi6j9eacpd3t68fgr9noqqr.apps.googleusercontent.com"

    // MARK: - App Info
    static let appName = "FREM"
    static let appTagline = "Forward your finances"

    // MARK: - Defaults
    static let defaultDailyTarget: Double = 150.0
    static let defaultCurrency = "USD"
}
