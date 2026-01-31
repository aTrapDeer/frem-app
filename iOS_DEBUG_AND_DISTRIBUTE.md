# iOS: Debugging Login Errors & Distributing the App

## 1. Is the app using Vercel or localhost?

The app uses whatever URL is in **`ios-app/FREM/Utilities/Constants.swift`**:

```swift
static let apiBaseURL = "https://frem.vercel.app/"
```

- **`https://frem.vercel.app`** → app talks to your **Vercel** deployment.
- **`http://localhost:3000`** or **`http://192.168.x.x:3000`** → app talks to your **local** dev server.

So right now it’s using **Vercel**. To use localhost from a simulator, set `apiBaseURL` to `"http://localhost:3000"` (no trailing slash). For a physical device, use your Mac’s IP, e.g. `"http://192.168.1.100:3000"`.

---

## 2. Debugging a 400 error after login

### In Xcode (recommended)

1. Run the app from Xcode (**Cmd + R**).
2. After you tap “Sign in with Google” and get the error, open the **Debug area** (View → Debug Area → Show Debug Area, or **Cmd + Shift + Y**).
3. In the **console**, look for lines like:
   - `[FREM Auth] POST https://frem.vercel.app/api/auth/mobile`
   - `[FREM Auth] Response 400: {"error":"...", "details":"..."}`

Those lines show:
- The exact URL (Vercel vs localhost).
- The HTTP status (e.g. 400).
- The server’s `error` and `details` message.

### On the device

The app now surfaces the server’s error message in the red error text under the sign-in button. So you’ll see messages like:

- “Missing ID token or access token”
- “Invalid Google user data – No email in Google response…”
- “Invalid request body…”

Use that text to narrow down the cause.

### On the server (Vercel)

1. Open [Vercel Dashboard](https://vercel.com) → your project → **Logs** (or **Deployments** → a deployment → **Functions**).
2. Reproduce the 400 (sign in again from the app).
3. In the logs, look for:
   - `[auth/mobile] Google userinfo failed: ...` (Google rejected the token).
   - `[auth/mobile] Google response missing email. Keys: ...` (no email in Google’s response).

That tells you whether the 400 is from “missing/invalid body”, “Google token invalid”, or “no email from Google”.

### Typical 400 causes

| What you see | Cause | What to do |
|--------------|--------|------------|
| “Missing idToken or accessToken” | Backend didn’t get tokens or keys are wrong. | Ensure the app sends a JSON body with `idToken` and `accessToken` (same keys as backend). |
| “Invalid request body” | Body isn’t valid JSON. | Check Content-Type is `application/json` and the body is valid JSON. |
| “Invalid Google user data – No email in Google response” | Google didn’t return `email`. | Ensure the iOS app requests the **email** scope when signing in with Google (e.g. `additionalScopes` including `https://www.googleapis.com/auth/userinfo.email`). Check Google Sign-In iOS docs for the exact API. |

---

## 3. Sending a build so you can test on your iPhone (no cable)

You have two main options.

### Option A: TestFlight (recommended – install via link/email)

TestFlight is Apple’s way to install beta builds by link or email. You need:

- An **Apple Developer Program** account ($99/year): [developer.apple.com/programs](https://developer.apple.com/programs)

Steps in short:

1. **Archive the app**
   - In Xcode: Product → **Destination** → “Any iOS Device (arm64)”.
   - Product → **Archive**.
   - When the Organizer opens, select the new archive → **Distribute App**.

2. **Upload to App Store Connect**
   - Choose **App Store Connect** → **Upload**.
   - Use default options (e.g. automatic signing, upload symbols).
   - Wait for the build to appear in App Store Connect (often 5–15 minutes).

3. **Enable TestFlight**
   - In [App Store Connect](https://appstoreconnect.apple.com): Your app → **TestFlight**.
   - Add the build to a group (e.g. “Internal Testing” or “External Testing”).
   - For **Internal Testing**: add your own Apple ID as a tester; you get an email/link to install via the TestFlight app.
   - For **External Testing**: add testers by email; they get an invite and install via TestFlight.

4. **Install on your iPhone**
   - Install the **TestFlight** app from the App Store.
   - Open the invite link from the email (or use the link from App Store Connect).
   - Accept and install the build. You can then open it like any app.

So yes: you can get a **link (or email)** from TestFlight and install the app on your iPhone without Xcode or a cable.

### Option B: Ad Hoc (no TestFlight, but more manual)

- You need an Apple Developer account and **registered device UDIDs**.
- In Xcode: create an **Ad Hoc** provisioning profile, build an **.ipa**, then distribute the .ipa (e.g. via a link from a file host or your own server).
- Users install by opening the link on the device (often with extra steps). No TestFlight app, but setup is more involved.

For “send a link/email and test on my iPhone”, **TestFlight is the standard and easiest**.

---

## 4. Quick reference

- **Where does the app point?** → `Constants.swift` → `apiBaseURL` (Vercel vs localhost/IP).
- **Why 400?** → Xcode console `[FREM Auth] Response 400: ...` and the red error text on screen; optionally Vercel logs for `[auth/mobile]`.
- **Install on iPhone without cable** → Use TestFlight (Apple Developer account required); you get a link/email to install the build.
