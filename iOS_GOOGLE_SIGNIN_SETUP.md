# Google Sign-In Setup for iOS

This guide will walk you through setting up Google Sign-In for your iOS app.

## Step 1: Add Google Sign-In Package to Xcode

1. **Open your Xcode project** (`FREMApp.xcodeproj`)

2. **Add Package Dependency:**
   - In Xcode, go to **File → Add Package Dependencies...**
   - Enter this URL: `https://github.com/google/GoogleSignIn-iOS`
   - Click **Add Package**
   - Select **GoogleSignIn** (make sure it's checked)
   - Click **Add Package**

3. **Verify the package is added:**
   - In the left sidebar, you should see **Package Dependencies**
   - Expand it to see **GoogleSignIn-iOS**

## Step 2: Configure Google Cloud Console

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project (the same one you use for the web app)

2. **Create iOS OAuth Client:**
   - Go to **APIs & Services → Credentials**
   - Click **Create Credentials → OAuth 2.0 Client ID**
   - Application type: **iOS**
   - Name: "FREM iOS App"
   - **Bundle ID**: This is your app's bundle identifier
     - In Xcode: Select your project → Target "FREM" → General tab
     - Look for "Bundle Identifier" (should be `com.frem.app`)
     - Copy this value and paste it in Google Console
   - Click **Create**

3. **Copy the iOS Client ID:**
   - After creating, you'll see a Client ID that looks like:
     `123456789-abc123def456.apps.googleusercontent.com`
   - Copy this Client ID

## Step 3: Update Constants.swift

1. **In Xcode, open `FREM/Utilities/Constants.swift`**

2. **Update the `googleClientID`:**
   ```swift
   static let googleClientID = "YOUR_IOS_CLIENT_ID_HERE.apps.googleusercontent.com"
   ```
   
   Replace `YOUR_IOS_CLIENT_ID_HERE` with the iOS Client ID you copied from Google Console.

   **Important:** This is different from your web Client ID! You need a separate iOS Client ID.

## Step 4: Configure URL Scheme (Info.plist)

1. **In Xcode, you need to add a URL scheme for Google Sign-In:**
   - The project uses auto-generated Info.plist, so we need to add it via build settings
   - Select your project in the left sidebar
   - Select the **FREM** target
   - Go to the **Info** tab
   - Expand **URL Types**
   - Click the **+** button to add a new URL Type
   - Set:
     - **Identifier**: `GoogleSignIn`
     - **URL Schemes**: Your reversed client ID
       - Take your iOS Client ID: `123456789-abc123def456.apps.googleusercontent.com`
       - Reverse it: `com.googleusercontent.apps.abc123def456-123456789`
       - Paste this as the URL scheme

   **OR** if you prefer, add it to the project's Info.plist file directly:
   - Right-click on the FREM folder → New File → Property List
   - Name it `Info.plist`
   - Add:
     ```xml
     <key>CFBundleURLTypes</key>
     <array>
       <dict>
         <key>CFBundleTypeRole</key>
         <string>Editor</string>
         <key>CFBundleURLSchemes</key>
         <array>
           <string>com.googleusercontent.apps.YOUR_REVERSED_CLIENT_ID</string>
         </array>
       </dict>
     </array>
     ```

## Step 5: Update Info.plist via Build Settings (Alternative)

If the project uses `GENERATE_INFOPLIST_FILE = YES`, you can add the URL scheme via build settings:

1. Select your project → Target "FREM" → **Build Settings**
2. Search for "Info.plist"
3. Add to **Info.plist Values**:
   - Key: `CFBundleURLTypes`
   - Value: (array with your reversed client ID)

**Or use a simpler approach:** Create a custom Info.plist file:

1. In Xcode, right-click the **FREM** folder
2. Select **New File...**
3. Choose **Property List**
4. Name it `Info.plist`
5. Add this content (replace with your reversed client ID):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleTypeRole</key>
            <string>Editor</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>com.googleusercontent.apps.YOUR_REVERSED_CLIENT_ID</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

6. In **Build Settings**, set **Info.plist File** to `FREM/Info.plist`
7. Set **GENERATE_INFOPLIST_FILE** to `NO`

## Step 6: Build and Test

1. **Clean build folder:** `Shift + Cmd + K`
2. **Build:** `Cmd + B`
3. **Run:** `Cmd + R`

4. **Test Sign-In:**
   - Tap "Sign in with Google"
   - You should see the Google Sign-In flow
   - After signing in, you should be authenticated

## Troubleshooting

### Error: "Google Sign-In SDK not yet configured"
- Make sure you've added the GoogleSignIn package
- Check that `Constants.swift` has a valid Client ID (not the placeholder)

### Error: "Invalid client"
- Make sure you're using the **iOS Client ID**, not the web Client ID
- Verify the Bundle ID in Google Console matches your app's Bundle ID

### Error: "URL scheme not configured"
- Make sure you've added the reversed client ID as a URL scheme
- The format should be: `com.googleusercontent.apps.CLIENT_ID_PART`

### Sign-in opens but doesn't complete
- Check that your backend API endpoint `/api/auth/mobile` is working
- Make sure your backend URL in `Constants.swift` is correct
- Check the Xcode console for error messages

## Notes

- The iOS app uses a **different Client ID** than the web app
- You can have both web and iOS Client IDs in the same Google Cloud project
- The URL scheme must match the reversed client ID format
- Make sure your backend is deployed and accessible from the iOS app

## Next Steps

Once Google Sign-In is working:
1. Test the full authentication flow
2. Verify sessions are being created correctly
3. Test API calls with the session token
4. Consider adding error handling and loading states
