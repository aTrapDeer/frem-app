import SwiftUI

struct LoginView: View {
    @State private var isSigningIn = false
    @State private var error: String?

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Logo and tagline
            VStack(spacing: 16) {
                Text("FREM")
                    .font(.system(size: 48, weight: .bold, design: .default))
                    .foregroundColor(.fremBlue)

                Text("Forward your finances")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(.fremSlate600)

                Text("Track → Visualize → Optimize your money")
                    .font(.system(size: 14))
                    .foregroundColor(.fremSlate500)
            }

            Spacer()

            // Features
            VStack(spacing: 16) {
                featureRow(icon: "chart.line.uptrend.xyaxis", title: "Smart Projections", subtitle: "See when you'll reach your goals")
                featureRow(icon: "dollarsign.circle", title: "Daily Targets", subtitle: "Know exactly what to earn each day")
                featureRow(icon: "sparkles", title: "AI Advisor", subtitle: "Get personalized financial insights")
            }
            .padding(.horizontal, 32)

            Spacer()

            // Sign in button
            VStack(spacing: 12) {
                Button {
                    signIn()
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "person.badge.key")
                            .font(.system(size: 18))

                        Text(isSigningIn ? "Signing in..." : "Sign in with Google")
                            .font(.system(size: 16, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.fremBlue)
                    .foregroundColor(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(isSigningIn)

                if let error = error {
                    Text(error)
                        .font(.system(size: 12))
                        .foregroundColor(.fremRed)
                        .multilineTextAlignment(.center)
                }

                Text("By signing in, you agree to our Terms of Service and Privacy Policy")
                    .font(.system(size: 11))
                    .foregroundColor(.fremSlate500)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 40)
        }
        .background(Color.white)
    }

    private func featureRow(icon: String, title: String, subtitle: String) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(.fremBlue)
                .frame(width: 40, height: 40)
                .background(Color.fremBlue.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.fremSlate900)
                Text(subtitle)
                    .font(.system(size: 13))
                    .foregroundColor(.fremSlate500)
            }
            Spacer()
        }
    }

    private func signIn() {
        isSigningIn = true
        error = nil

        Task {
            do {
                try await AuthService.shared.signInWithGoogle()
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    self.isSigningIn = false
                }
            }
        }
    }
}
