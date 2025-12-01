# Mobile & Offline Capabilities Setup

This guide will help you set up the native mobile app with offline capabilities.

## Features Implemented

✅ **Native App (Capacitor)**: Convert to iOS and Android native apps
✅ **Offline Mode**: Cache data and queue actions for later sync
✅ **GPS Tracking**: Track location during daily working entries
✅ **Photo Attachments**: Add photos to doctor and pharmacy profiles
✅ **Auto-Sync**: Automatically sync offline data when connection returns

## Setup Instructions

### 1. Initialize Capacitor

The Capacitor configuration is already created. To initialize the native platforms:

```bash
# First, ensure you've pulled the project from GitHub
git pull

# Install dependencies
npm install

# Initialize Capacitor (already configured)
npx cap init
```

The app is configured with:
- **App ID**: `app.lovable.e5a3604e579f4d31a0d94e6a3d85c573`
- **App Name**: `winvision-sales-hub`
- **Hot Reload**: Enabled for development

### 2. Add Native Platforms

#### For iOS (requires Mac with Xcode):
```bash
npx cap add ios
npx cap update ios
npm run build
npx cap sync
npx cap run ios
```

#### For Android (requires Android Studio):
```bash
npx cap add android
npx cap update android
npm run build
npx cap sync
npx cap run android
```

### 3. Required Permissions

The app requires the following permissions:

#### iOS (`ios/App/Info.plist`):
```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to take photos of doctors and pharmacies</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs photo library access to select photos</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs location access to track your visits</string>
```

#### Android (`android/app/src/main/AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## Feature Usage

### Offline Mode

The app automatically:
- Detects network status
- Caches master data (doctors, pharmacies, distributors, products)
- Queues offline entries for sync
- Shows an offline banner with sync status
- Auto-syncs when connection returns

### GPS Tracking

When recording daily working entries:
1. The app requests location permission
2. Captures GPS coordinates automatically
3. Stores location with accuracy and timestamp
4. Works both online and offline

### Photo Attachments

On doctor and pharmacy forms:
1. Click "Take Photo" to use camera
2. Click "Choose Photo" to select from gallery
3. Photos are stored as base64 data URLs
4. Preview and remove photos before saving

### Push Notifications (Coming Soon)

Push notifications will be added in a future update for:
- Target reminders
- Expense approval notifications
- Tour plan updates

## Testing

### Test Offline Mode:
1. Disable WiFi/mobile data
2. Create a daily working entry
3. Note the "Offline Mode" banner
4. Re-enable connection
5. Click "Sync Now" to upload queued data

### Test GPS:
1. Grant location permission
2. Create a daily working entry
3. Location is automatically captured
4. Check browser console for coordinates

### Test Camera:
1. Open doctor or pharmacy form
2. Grant camera/photo permissions
3. Take or select a photo
4. Photo appears in preview

## Deployment

### Development Build:
```bash
npm run build
npx cap sync
npx cap open ios  # or android
```

### Production Build:
1. Update version in `package.json`
2. Build for production: `npm run build`
3. Sync with Capacitor: `npx cap sync`
4. Open in Xcode/Android Studio
5. Build and submit to App Store/Play Store

## Troubleshooting

### Camera not working:
- Check permissions are granted
- Verify native platform is properly synced
- Check platform-specific permission declarations

### GPS not working:
- Ensure location services are enabled on device
- Check app has location permission
- Test on physical device (not simulator)

### Offline sync failing:
- Check network status
- Verify Supabase connection
- Check browser console for errors
- Clear offline cache: `localStorage.clear()`

## Database Schema Updates

The following columns were added:
- `doctors.photo_url` (text, nullable)
- `pharmacies.photo_url` (text, nullable)
- `daily_working.location` (jsonb, nullable)

Location data structure:
```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "accuracy": 10,
  "timestamp": 1234567890
}
```

## Support

For issues or questions:
- Check Capacitor docs: https://capacitorjs.com/docs
- Review Lovable docs: https://docs.lovable.dev
- Join Lovable Discord community

---

**Note**: Hot reload is enabled for faster development. The app connects to your Lovable preview URL for live updates during development.
