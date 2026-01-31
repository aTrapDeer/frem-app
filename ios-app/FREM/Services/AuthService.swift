import Foundation
import SwiftUI
import UIKit
import GoogleSignIn

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
    func signInWithGoogle() async throws {
        guard let clientID = Config.googleClientID.isEmpty ? nil : Config.googleClientID,
              clientID != "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com" else {
            throw AuthError.googleSignInNotConfigured
        }

        // Configure Google Sign-In
        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config

        // Get the root view controller
        guard let windowScene = await UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = await windowScene.windows.first?.rootViewController else {
            throw AuthError.invalidResponse
        }

        // Sign in with Google
        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController)
        
        guard let idToken = result.user.idToken?.tokenString,
              let accessToken = result.user.accessToken.tokenString else {
            throw AuthError.tokenExtractionFailed
        }

        // Send tokens to backend
        guard let url = URL(string: "\(Config.apiBaseURL)/api/auth/mobile") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = [
            "idToken": idToken,
            "accessToken": accessToken
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            if httpResponse.statusCode == 401 {
                throw AuthError.invalidResponse
            }
            throw APIError.serverError(httpResponse.statusCode)
        }

        // Parse response
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let sessionToken = json["sessionToken"] as? String,
              let userDict = json["user"] as? [String: Any],
              let userId = userDict["id"] as? String else {
            throw AuthError.tokenExtractionFailed
        }

        let userName = userDict["name"] as? String
        let userEmail = userDict["email"] as? String
        let userImage = userDict["image"] as? String

        let user = User(
            id: userId,
            name: userName,
            email: userEmail,
            image: userImage,
            createdAt: nil,
            updatedAt: nil
        )

        // Save session
        await MainActor.run {
            self.completeSignIn(sessionToken: sessionToken, user: user)
        }
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
