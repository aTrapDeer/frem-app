import Foundation

@Observable
class SettingsViewModel {
    var settings: UserSettings = .default
    var isLoading = true
    var isSaving = false
    var error: String?
    var saveSuccess = false

    // Bank reserve form state
    var reserveType: String = "amount"
    var reserveAmountText: String = ""

    func loadSettings() async {
        await MainActor.run { isLoading = true; error = nil }

        do {
            let fetched = try await APIService.shared.fetchUserSettings()
            await MainActor.run {
                self.settings = fetched
                self.reserveType = fetched.bankReserveType
                self.reserveAmountText = fetched.bankReserveAmount > 0
                    ? String(format: "%.0f", fetched.bankReserveAmount)
                    : ""
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                self.isLoading = false
            }
        }
    }

    func saveReserve() async {
        await MainActor.run { isSaving = true; error = nil; saveSuccess = false }

        let amount = Double(reserveAmountText) ?? 0

        var updated = settings
        updated.bankReserveAmount = amount
        updated.bankReserveType = reserveType

        do {
            let saved = try await APIService.shared.updateUserSettings(updated)
            await MainActor.run {
                self.settings = saved
                self.isSaving = false
                self.saveSuccess = true
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                self.isSaving = false
            }
        }
    }

    func signOut() {
        AuthService.shared.signOut()
    }
}
