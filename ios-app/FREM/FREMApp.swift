import SwiftUI
import GoogleSignIn

@main
struct FREMApp: App {
    init() {
        // Configure Google Sign-In
        let clientID = Config.googleClientID
        if !clientID.isEmpty && clientID != "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com" {
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        }
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
