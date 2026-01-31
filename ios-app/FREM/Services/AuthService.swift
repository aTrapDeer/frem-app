import Foundation
import SwiftUI

@Observable
class AuthService {
    static let shared = AuthService()

    var currentUser: User?
    var userSettings: UserSettings = .default
    var isAuthenticated: Bool { currentUser != nil }
    var isLoading = true

    private init() {
        loadSavedSession()
    }

    // MARK: - Session Management

    /// Load saved session from Keychain on app launch
    private func loadSavedSession() {
        guard let userId = KeychainHelper.read(.userId),
              let token = KeychainHelper.read(.sessionToken) else {
            isLoading = false
            return
        }

        let name = KeychainHelper.read(.userName)
        let email = KeychainHelper.read(.userEmail)
        let image = KeychainHelper.read(.userImage)

        currentUser = User(
            id: userId,
            name: name,
            email: email,
            image: image,
            createdAt: nil,
            updatedAt: nil
        )

        // Validate session in background
        Task {
            await validateSession()
            isLoading = false
        }
    }

    /// Validate the stored session token is still valid
    private func validateSession() async {
        do {
            let settings = try await APIService.shared.fetchUserSettings()
            await MainActor.run {
                self.userSettings = settings
            }
        } catch let error as APIError {
            if case .unauthorized = error {
                await MainActor.run {
                    self.signOut()
                }
            }
        } catch {
            // Network error - keep session, will retry later
        }
    }

    // MARK: - Google Sign-In

    /// Handle sign-in with Google credential
    /// In production, integrate GoogleSignIn SDK:
    /// 1. Add GoogleSignIn SPM package
    /// 2. Call GIDSignIn.sharedInstance.signIn()
    /// 3. Send the ID token to your NextAuth endpoint
    /// 4. Receive session token back
    func signInWithGoogle() async throws {
        // TODO: Integrate GoogleSignIn SDK
        // This is the flow:
        //
        // 1. GIDSignIn.sharedInstance.signIn(withPresenting: rootVC) { result, error in
        //      let idToken = result?.user.idToken?.tokenString
        //      let accessToken = result?.user.accessToken.tokenString
        // }
        //
        // 2. POST to /api/auth/callback/google with the tokens
        //
        // 3. Extract session token from response cookies
        //
        // 4. Save to Keychain

        // For now, placeholder that shows the flow:
        throw AuthError.googleSignInNotConfigured
    }

    /// Complete sign-in after receiving session data from OAuth callback
    func completeSignIn(sessionToken: String, user: User) {
        KeychainHelper.save(sessionToken, for: .sessionToken)
        KeychainHelper.save(user.id, for: .userId)
        if let name = user.name { KeychainHelper.save(name, for: .userName) }
        if let email = user.email { KeychainHelper.save(email, for: .userEmail) }
        if let image = user.image { KeychainHelper.save(image, for: .userImage) }

        currentUser = user

        Task {
            do {
                let settings = try await APIService.shared.fetchUserSettings()
                await MainActor.run {
                    self.userSettings = settings
                }
            } catch {}
        }
    }

    // MARK: - Sign Out

    func signOut() {
        KeychainHelper.clearAll()
        currentUser = nil
        userSettings = .default
    }
}

enum AuthError: LocalizedError {
    case googleSignInNotConfigured
    case invalidResponse
    case tokenExtractionFailed

    var errorDescription: String? {
        switch self {
        case .googleSignInNotConfigured:
            return "Google Sign-In SDK not yet configured. See AuthService.swift for integration steps."
        case .invalidResponse:
            return "Invalid response from auth server"
        case .tokenExtractionFailed:
            return "Could not extract session token"
        }
    }
}
