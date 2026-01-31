# iOS App Troubleshooting Guide

## Error: "Simulator device failed to launch com.frem.app - No such process"

This error typically means the app didn't build successfully or the simulator is in a bad state.

### Solution 1: Clean Build Folder

1. In Xcode, go to **Product → Clean Build Folder** (or press `Shift + Cmd + K`)
2. Wait for it to complete
3. Try building again with `Cmd + R`

### Solution 2: Reset Simulator

1. In Xcode, go to **Window → Devices and Simulators** (or press `Shift + Cmd + 2`)
2. Select your simulator from the left sidebar
3. Right-click on it and choose **Erase All Content and Settings...**
4. Confirm the reset
5. Wait for it to complete
6. Try building again

### Solution 3: Check Build Errors

1. Look at the **Issue Navigator** in Xcode (⚠️ icon in the left sidebar)
2. Check for any red error indicators
3. Fix any compilation errors before trying to run

### Solution 4: Check Console for Build Errors

1. Open the **Report Navigator** (📊 icon in the left sidebar)
2. Click on the most recent build
3. Look for any errors in red
4. Common issues:
   - Missing files
   - Swift syntax errors
   - Missing dependencies

### Solution 5: Restart Xcode

Sometimes Xcode gets into a bad state:
1. Quit Xcode completely (`Cmd + Q`)
2. Reopen the project
3. Try building again

### Solution 6: Check Signing

1. Select the **FREM** project in the left sidebar
2. Select the **FREM** target
3. Go to **Signing & Capabilities**
4. Make sure **"Automatically manage signing"** is checked
5. If there are signing errors, try unchecking and rechecking this option

### Solution 7: Delete Derived Data

1. In Xcode, go to **Xcode → Settings → Locations**
2. Click the arrow next to **Derived Data** path to open it in Finder
3. Close Xcode
4. Delete the folder for your project (or delete all derived data)
5. Reopen Xcode and try building again

### Solution 8: Check for Missing Info.plist

If the project uses `GENERATE_INFOPLIST_FILE = YES`, make sure there's no conflicting Info.plist file. The project should auto-generate it.

### Solution 9: Verify All Files Are Included

1. Select a Swift file that might be missing
2. In the right sidebar, check **Target Membership**
3. Make sure **FREM** is checked

### Solution 10: Try a Different Simulator

Sometimes a specific simulator can be corrupted:
1. Select a different simulator (e.g., iPhone 15 instead of iPhone 16)
2. Try building and running

---

## Common Build Errors

### "Cannot find type 'X' in scope"
- Make sure all Swift files are included in the target
- Check for missing imports

### "Value of type 'X' has no member 'Y'"
- Check that your models match the API responses
- Verify property names are correct

### Signing Errors
- Make sure you've selected a Team in Signing & Capabilities
- For simulator, signing issues are usually not the problem

---

## Still Not Working?

If none of these solutions work:
1. Check the Xcode console for more detailed error messages
2. Try building from the command line: `xcodebuild -project FREMApp.xcodeproj -scheme FREM -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 15 Pro'`
3. Share the full error output from the console
