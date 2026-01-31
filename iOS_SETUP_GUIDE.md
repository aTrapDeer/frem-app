# iOS App Setup Guide

This guide will walk you through setting up the FREM iOS app in Xcode for the first time.

## Prerequisites

- ✅ Xcode installed (you have this!)
- ✅ Mac with macOS (you're on macOS)
- ✅ Your Next.js backend running (either locally or deployed)

---

## Step 1: Open the Xcode Project

1. Open **Finder** and navigate to your project folder
2. Go to `ios-app/` directory
3. Double-click on `FREMApp.xcodeproj` to open it in Xcode

Alternatively, you can open it from Terminal:
```bash
cd /Users/idonotknow/Coding/frem-app/ios-app
open FREMApp.xcodeproj
```

---

## Step 2: Configure Your Backend URL

The app needs to know where your API is hosted.

1. In Xcode, open `FREM/Utilities/Constants.swift`
2. Update the `apiBaseURL` with your backend URL:

**For local development:**
```swift
static let apiBaseURL = "http://localhost:3000"
```

**For production (Vercel):**
```swift
static let apiBaseURL = "https://your-frem-app.vercel.app"
```

⚠️ **Important:** If using `localhost`, you'll need to use your Mac's IP address when testing on a physical device (e.g., `http://192.168.1.100:3000`). For the iOS Simulator, `localhost` works fine.

---

## Step 3: Set Up Signing & Capabilities

1. In Xcode, click on the **FREM** project in the left sidebar (blue icon at the top)
2. Select the **FREM** target under "TARGETS"
3. Go to the **Signing & Capabilities** tab
4. Check **"Automatically manage signing"**
5. Select your **Team** (your Apple ID)
   - If you don't have one, click "Add Account..." and sign in with your Apple ID
   - You can use a free Apple Developer account for development

This will automatically generate a provisioning profile and signing certificate.

---

## Step 4: Configure Deployment Target

1. Still in the **Signing & Capabilities** tab
2. Under **"Deployment Info"**, make sure:
   - **iOS Deployment Target** is set to **17.0** (as specified in the project)
   - **Devices** includes **iPhone**

---

## Step 5: Add Swift Package Dependencies (Optional - for Google Sign-In)

The app currently has Google Sign-In as a TODO. If you want to enable it later:

1. In Xcode, go to **File → Add Package Dependencies...**
2. Enter: `https://github.com/google/GoogleSignIn-iOS`
3. Click **Add Package**
4. Select **GoogleSignIn** and click **Add Package**

For now, you can skip this step and work on other features. The app will show an error when trying to sign in, but you can test other functionality.

---

## Step 6: Build and Run

1. At the top of Xcode, select a **simulator** (e.g., "iPhone 15 Pro" or "iPhone 16")
2. Click the **Play button** (▶️) or press `Cmd + R` to build and run
3. Wait for the build to complete (first build may take a minute or two)

If you see any build errors, they'll be shown in the **Issue Navigator** (⚠️ icon in the left sidebar).

---

## Step 7: Test the App

Once the app launches in the simulator:

1. You should see the **LoginView** (since Google Sign-In isn't configured yet)
2. You can explore the UI structure
3. To test API calls, you'll need to:
   - Configure Google Sign-In (Step 5), OR
   - Temporarily bypass auth for testing (modify `AuthService.swift`)

---

## Common Issues & Solutions

### Issue: "No signing certificate found"
**Solution:** Make sure you've selected your Team in Signing & Capabilities. You may need to create a free Apple Developer account.

### Issue: Build errors about missing files
**Solution:** Make sure all Swift files are included in the target:
1. Select a file showing an error
2. In the right sidebar, check the **Target Membership** checkbox for "FREM"

### Issue: "Cannot connect to localhost" when testing on a physical device
**Solution:** Use your Mac's local IP address instead:
1. Find your Mac's IP: System Settings → Network → Wi‑Fi/Ethernet → Details → IP Address
2. Update `Constants.swift` with: `http://YOUR_IP_ADDRESS:3000`

### Issue: API calls failing with CORS errors
**Solution:** Make sure your Next.js backend allows requests from the iOS app. You may need to configure CORS in your Next.js API routes.

---

## Next Steps

Once you have the app building and running:

1. **Configure Google Sign-In** (if you want authentication)
   - Get your iOS Client ID from Google Cloud Console
   - Add it to `Constants.swift`
   - Complete the integration in `AuthService.swift`

2. **Test API Integration**
   - Make sure your backend is running
   - Test API calls from the app

3. **Customize the App**
   - Update app icon in `Assets.xcassets/AppIcon.appiconset/`
   - Adjust colors in `Theme.swift`
   - Add any missing features

---

## Development Tips

- **Simulator vs Device:** Use the simulator for quick testing, but test on a real device for accurate performance
- **Debugging:** Use breakpoints and the Xcode debugger (View → Debug Area → Show Debug Area)
- **Console Logs:** Check the console at the bottom of Xcode for print statements and errors
- **Hot Reload:** SwiftUI supports live previews - use the canvas (Option+Cmd+Return) to see changes in real-time

---

## Need Help?

- Check the `iOS_TODO.md` file for the project roadmap
- Review SwiftUI documentation: https://developer.apple.com/documentation/swiftui
- Check Xcode documentation: Help → Xcode Help

Good luck building your iOS app! 🚀
