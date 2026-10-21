# Mobile App Deployment Guide

This guide covers deploying the NexaERP mobile apps to Apple App Store and Google Play Store.

## Prerequisites

### Apple App Store

- Apple Developer Account ($99/year)
- macOS with Xcode 14+
- Valid Apple Developer certificates
- App Store Connect access

### Google Play Store

- Google Play Developer Account ($25 one-time)
- Android Studio
- Google Play Console access
- Signing keystore for release builds

## iOS Deployment

### 1. Prepare App for Release

**Update version and build number** in `ios/NexaERP/Info.plist`:
```xml
<key>CFBundleShortVersionString</key>
<string>1.0.0</string>
<key>CFBundleVersion</key>
<string>1</string>
```

**Configure App ID** in Xcode:
1. Open `ios/NexaERP.xcworkspace`
2. Select NexaERP project
3. General tab > Identity
4. Set Bundle Identifier: `com.nexaerp.mobile`

### 2. Configure Signing

**In Xcode**:
1. Signing & Capabilities tab
2. Team: Select your Apple Developer team
3. Enable "Automatically manage signing"
4. Or manually select provisioning profiles

### 3. Create Archive

1. Select "Any iOS Device" as target
2. Product > Scheme > Edit Scheme
3. Set Build Configuration to "Release"
4. Product > Archive
5. Wait for archive to complete

### 4. Upload to App Store Connect

1. In Organizer, select the archive
2. Click "Distribute App"
3. Select "App Store Connect"
4. Follow prompts to upload

### 5. Submit for Review

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. My Apps > NexaERP
3. App Store tab
4. Complete all required information:
   - App screenshots (all required sizes)
   - App description
   - Keywords
   - Support URL
   - Privacy policy URL
5. Submit for review

**Required Screenshots Sizes**:
- iPhone 6.7": 1290 x 2796 px
- iPhone 6.5": 1242 x 2688 px
- iPhone 5.5": 1242 x 2208 px
- iPad Pro 12.9": 2048 x 2732 px

### 6. Review Process

- Initial review: 24-48 hours
- Updates: 24 hours
- Check status in App Store Connect

## Android Deployment

### 1. Generate Signing Key

**Create release keystore**:
```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 \
  -keystore nexaerp-release.keystore \
  -alias nexaerp-key-alias \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Save keystore credentials** in `android/gradle.properties`:
```properties
NEXAERP_RELEASE_STORE_FILE=nexaerp-release.keystore
NEXAERP_RELEASE_KEY_ALIAS=nexaerp-key-alias
NEXAERP_RELEASE_STORE_PASSWORD=your_store_password
NEXAERP_RELEASE_KEY_PASSWORD=your_key_password
```

**⚠️ Important**: Keep these credentials secure. Never commit to git.

### 2. Configure Signing in Gradle

Update `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('NEXAERP_RELEASE_STORE_FILE')) {
                storeFile file(NEXAERP_RELEASE_STORE_FILE)
                storePassword NEXAERP_RELEASE_STORE_PASSWORD
                keyAlias NEXAERP_RELEASE_KEY_ALIAS
                keyPassword NEXAERP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

### 3. Update App Version

In `android/app/build.gradle`:
```gradle
defaultConfig {
    applicationId "com.nexaerp.mobile"
    versionCode 1        // Increment for each release
    versionName "1.0.0"  // User-visible version
}
```

### 4. Build Release APK/AAB

**Build AAB (recommended for Play Store)**:
```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

**Build APK (for direct distribution)**:
```bash
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

### 5. Upload to Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app or select existing
3. Production > Create new release
4. Upload AAB file
5. Complete release details:
   - Release name (e.g., "1.0.0")
   - Release notes
   - Upload screenshots
   - Complete app content rating questionnaire

**Required Assets**:
- High-res icon: 512 x 512 px
- Feature graphic: 1024 x 500 px
- Screenshots: At least 2 for phone, 1 for tablet
- Privacy policy URL

### 6. Submit for Review

1. Review all required sections (green checkmarks)
2. Submit for review
3. Review process: 1-7 days

## Environment Configuration

### Production API Configuration

Update `src/config/api.ts` for production:
```typescript
export const API_CONFIG = {
  BASE_URL: 'https://api.nexaerp.com',
  TIMEOUT: 30000,
};
```

### Feature Flags

Consider using environment-based feature flags:
```typescript
const FEATURES = {
  OFFLINE_MODE: true,
  PUSH_NOTIFICATIONS: true,
  BARCODE_SCANNING: __DEV__ ? true : false,
};
```

## Post-Deployment

### 1. Monitoring

**Crash Reporting**: Integrate Sentry or Firebase Crashlytics:
```bash
npm install @sentry/react-native
```

**Analytics**: Add Firebase Analytics or similar:
```bash
npm install @react-native-firebase/analytics
```

### 2. Over-the-Air Updates

Consider CodePush for instant updates without app store review:
```bash
npm install react-native-code-push
```

### 3. Release Notes Template

```
Version 1.0.0
- Initial release
- Dashboard with KPIs
- Inventory management
- Point of Sale (POS)
- Orders tracking
- Offline mode support
- Push notifications

Bug fixes:
- Fixed authentication flow
- Improved offline sync
```

## Versioning Strategy

Follow Semantic Versioning (semver):
- **Major**: Breaking changes (2.0.0)
- **Minor**: New features (1.1.0)
- **Patch**: Bug fixes (1.0.1)

**iOS**: Increment `CFBundleVersion` for each build
**Android**: Increment `versionCode` for each build

## Testing Checklist

Before each release:

- [ ] Test on multiple devices (iPhone, iPad, Android phones/tablets)
- [ ] Test on different OS versions (iOS 13+, Android 10+)
- [ ] Test offline mode
- [ ] Test push notifications
- [ ] Test authentication flow
- [ ] Test data sync
- [ ] Check for memory leaks
- [ ] Verify API endpoint configuration
- [ ] Test landscape and portrait modes
- [ ] Verify app icon and splash screen
- [ ] Check app permissions
- [ ] Review crash reports from beta testing

## Beta Testing

### iOS TestFlight

1. Upload build to App Store Connect
2. Internal Testing: Up to 100 internal testers
3. External Testing: Up to 10,000 external testers (requires beta review)
4. Send invitations via email or public link

### Android Internal Testing

1. Go to Play Console > Testing > Internal testing
2. Create new release
3. Add tester email addresses
4. Testers install via Play Store

## Continuous Deployment

### Using Fastlane

Install Fastlane:
```bash
gem install fastlane
```

**iOS Fastfile**:
```ruby
platform :ios do
  desc "Deploy to TestFlight"
  lane :beta do
    build_app(scheme: "NexaERP")
    upload_to_testflight
  end
  
  desc "Deploy to App Store"
  lane :release do
    build_app(scheme: "NexaERP")
    upload_to_app_store
  end
end
```

**Android Fastfile**:
```ruby
platform :android do
  desc "Deploy to Google Play Internal Track"
  lane :internal do
    gradle(task: "bundleRelease")
    upload_to_play_store(track: "internal")
  end
  
  desc "Deploy to Google Play Production"
  lane :production do
    gradle(task: "bundleRelease")
    upload_to_play_store
  end
end
```

Run deployment:
```bash
fastlane ios beta
fastlane android internal
```

## Security Best Practices

1. **Code Obfuscation**: Enable ProGuard/R8 for Android
2. **Certificate Pinning**: Pin SSL certificates
3. **Jailbreak Detection**: Detect compromised devices
4. **Secure Storage**: Use Keychain/Keystore for sensitive data
5. **API Keys**: Never hardcode API keys in source code

## Troubleshooting

### iOS Build Failures

**Provisioning profile issues**:
```bash
# Clear derived data
rm -rf ~/Library/Developer/Xcode/DerivedData
```

**CocoaPods issues**:
```bash
cd ios
pod deintegrate
pod install
```

### Android Build Failures

**Gradle cache issues**:
```bash
cd android
./gradlew clean
rm -rf .gradle
```

**Signing issues**:
- Verify keystore path and credentials
- Ensure keystore file is in `android/app/`

### Upload Failures

**iOS**: Check for missing compliance information in App Store Connect
**Android**: Ensure AAB is under 150MB (split APKs if larger)

## Resources

- [React Native Documentation](https://reactnative.dev/)
- [iOS App Distribution Guide](https://developer.apple.com/documentation/xcode/distributing-your-app)
- [Android Launch Checklist](https://developer.android.com/distribute/best-practices/launch/launch-checklist)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy Center](https://play.google.com/about/developer-content-policy/)

## Support

For deployment issues, consult:
- Apple Developer Forums
- Stack Overflow
- React Native Community
- NexaERP development team
