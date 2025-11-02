# 🔧 Mobile App Troubleshooting Guide

## The Problem
The app works on web but not on mobile (Android/iOS).

## Common Issues & Solutions

### Issue 1: Module Not Found Errors
**Symptoms:** "Cannot find module" or "Module not found" errors

**Solution:**
```bash
# On Windows (PowerShell):
rm -r node_modules
npm cache clean --force
npm install
expo start -c

# Or use the batch script:
./reset-mobile.bat

# On Mac/Linux:
./reset-mobile.sh
```

### Issue 2: Navigation Not Working
**Symptoms:** App crashes when clicking "Start Detection"

**Solution:**
1. Make sure you have the latest dependencies:
   ```bash
   npm install
   ```
2. Rebuild the app:
   ```bash
   expo prebuild --clean
   ```

### Issue 3: Blank Screen on App Launch
**Symptoms:** White/blank screen when app loads

**Solution:**
1. Clear Expo cache:
   ```bash
   expo start -c
   ```
2. Force reload in Expo Go (shake device and select "Refresh")
3. Restart the development server

### Issue 4: "GestureHandlerRootView" Not Found
**Symptoms:** Error about gesture handler

**Solution:**
This has been fixed. The app no longer uses gesture-handler. If you still get this error:
```bash
npm install
```

### Issue 5: Image Not Displaying
**Symptoms:** Image picker works but image doesn't show

**Solution:**
1. Grant camera/photo permissions
2. Make sure image file is valid
3. Try a different image

### Issue 6: Results Page Not Loading
**Symptoms:** Stuck on loading spinner

**Solution:**
1. Check browser console for errors
2. Make sure Results.tsx file exists at `src/pages/Results.tsx`
3. Restart development server:
   ```bash
   expo start -c
   ```

## Step-by-Step Recovery

### Step 1: Full Clean Install
```bash
# Close the terminal where npm start is running (Ctrl+C)

# Windows:
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force
npm install

# Mac/Linux:
rm -rf node_modules
rm -f package-lock.json
npm cache clean --force
npm install
```

### Step 2: Clear Expo Cache
```bash
expo start -c
```

Press 'a' for Android or 'i' for iOS

### Step 3: Test on Device
- **Android:** Open Expo Go app → Scan QR code
- **iOS:** Scan QR code with Camera app or Expo Go

### Step 4: If Still Not Working
Try a full prebuild:
```bash
# Close the development server (Ctrl+C)

expo prebuild --clean

# Then for Android:
npm run android

# Or for iOS:
npm run ios
```

## Debugging Commands

```bash
# Check if all dependencies are installed
npm list

# Check for dependency conflicts
npm audit

# Verify file structure
ls src/pages/
ls src/pages/Results.tsx

# Start with verbose logging (useful for debugging)
expo start --verbose

# Clear all caches and reinstall
npm install --force
```

## File Verification

Make sure these files exist:

```
frontend/
├── App.tsx ✓
├── app.json ✓
├── package.json ✓
├── src/
│   └── pages/
│       └── Results.tsx ✓
└── node_modules/ (created after npm install)
```

To verify:
```bash
# Check if Results.tsx exists
test -f src/pages/Results.tsx && echo "✓ Results.tsx exists" || echo "✗ Results.tsx missing"
```

## Current Setup (Should Work)

✅ **Removed:** react-native-gesture-handler (was causing issues)
✅ **Kept:** @react-navigation/native, @react-navigation/stack, react-native-screens
✅ **App.tsx:** Simple NavigationContainer without extra wrappers
✅ **Results.tsx:** Proper navigation back button handling

## Quick Fixes by Platform

### Android

```bash
# If Android build fails
expo prebuild --clean --platform android
npm run android

# If Expo Go fails to load
adb reverse tcp:19000 tcp:19000
adb reverse tcp:19001 tcp:19001
```

### iOS

```bash
# If iOS build fails
expo prebuild --clean --platform ios
npm run ios

# Clear iOS build cache
rm -rf ios/
expo prebuild --platform ios
npm run ios
```

## Testing Checklist

After cleaning and reinstalling:

- [ ] Run `npm install` successfully
- [ ] Run `expo start -c` without errors
- [ ] App loads in Expo Go
- [ ] Home screen displays correctly
- [ ] "Upload Image" button works
- [ ] Image picker opens and closes
- [ ] "Start Detection" button works
- [ ] Navigation to Results page works
- [ ] Loading spinner appears
- [ ] Results page displays after 2 seconds
- [ ] Back button returns to Home
- [ ] Can upload another image

## Network Issues

If experiencing slow or timeout errors:

```bash
# Use a direct QR code (no tunnel)
expo start --localhost

# Or use LAN mode
expo start --lan
```

## Still Having Issues?

1. **Check Node version:**
   ```bash
   node --version  # Should be 16.x or higher
   npm --version   # Should be 8.x or higher
   ```

2. **Check Expo CLI:**
   ```bash
   expo --version  # Should be 49+
   ```

3. **Try using a different network:**
   - Try on your phone's personal hotspot
   - Switch from WiFi to LAN

4. **Restart everything:**
   ```bash
   # Close all terminals and apps
   # Restart your phone/emulator
   # Start fresh with npm start
   ```

## Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| "Cannot find module" | Dependencies not installed | Run `npm install` |
| "Module resolution" | Cache issue | Run `expo start -c` |
| "Blank white screen" | Loading or render issue | Restart app with Ctrl+C |
| "Navigation failed" | Navigation config issue | Check App.tsx |
| "Image not found" | Image picker issue | Grant permissions |
| "Build failed" | Native build issue | Run `expo prebuild --clean` |

## Performance Tips

- Use Expo Go for quick testing
- For production, use `eas build` (requires EAS CLI)
- Test on real device before building for distribution

---

**Still stuck?** Try this nuclear option:

```bash
# On Windows:
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force
npm install
expo start -c

# Then scan the QR code and force refresh in the app
```

This should resolve 95% of mobile app issues! 🚀
