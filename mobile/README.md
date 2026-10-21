# NexaERP Mobile App

Native mobile application for iOS and Android built with React Native.

## Features

### ✅ Implemented (Task 40.2)

- **Cross-Platform Support**: Single codebase for iOS and Android using React Native
- **Mobile Authentication**: Secure login with JWT tokens stored in device keychain
- **Offline Mode**: Data caching and offline queue for network resilience
- **Automatic Sync**: Queued requests sync automatically when connectivity is restored
- **Push Notifications**: Firebase Cloud Messaging integration for real-time alerts
- **Mobile-Optimized UI**: Touch-friendly interfaces optimized for mobile screens
- **Core Modules**:
  - Dashboard with KPIs and quick actions
  - Inventory management with search and filtering
  - Point of Sale (POS) for creating sales
  - Orders list and management
  - User profile and settings

### 🚧 To Be Implemented

- **Barcode Scanning**: Camera integration for barcode/QR code scanning
- **Signature Capture**: Canvas for digital signature collection
- **Advanced Offline**: Conflict resolution for offline edits
- **Biometric Auth**: Face ID / Touch ID / Fingerprint authentication
- **Camera Integration**: Product photo capture
- **Document Scanner**: OCR for invoice scanning
- **GPS Location**: Location tracking for field operations

## Architecture

### Technology Stack

- **Framework**: React Native 0.76.5
- **Language**: TypeScript
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **State Management**: React Hooks (useState, useEffect)
- **HTTP Client**: Axios with interceptors
- **Storage**: AsyncStorage + React Native Keychain
- **Push Notifications**: @notifee/react-native + Firebase Messaging
- **Icons**: React Native Vector Icons

### Project Structure

```
mobile/
├── src/
│   ├── config/              # API configuration
│   │   └── api.ts
│   ├── services/            # Business logic services
│   │   ├── api.service.ts       # HTTP client wrapper
│   │   ├── auth.service.ts      # Authentication
│   │   ├── offline.service.ts   # Offline data sync
│   │   └── notification.service.ts  # Push notifications
│   ├── navigation/          # Navigation configuration
│   │   ├── AuthNavigator.tsx    # Auth flow navigation
│   │   └── MainNavigator.tsx    # Main app navigation
│   ├── screens/            # Screen components
│   │   ├── auth/           # Authentication screens
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   └── main/           # Main app screens
│   │       ├── DashboardScreen.tsx
│   │       ├── InventoryScreen.tsx
│   │       ├── POSScreen.tsx
│   │       ├── OrdersScreen.tsx
│   │       └── ProfileScreen.tsx
│   └── App.tsx             # Root component
├── android/                # Android native code
├── ios/                    # iOS native code
├── index.js               # App entry point
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm/yarn
- React Native development environment
- For iOS: macOS with Xcode 14+
- For Android: Android Studio with SDK 33+

### Installation

1. **Install dependencies**:
   ```bash
   cd mobile
   npm install
   ```

2. **iOS Setup**:
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Android Setup**:
   - Open `android/` folder in Android Studio
   - Let Gradle sync complete
   - Accept any SDK license agreements

### Running the App

**Start Metro bundler**:
```bash
npm start
```

**Run on iOS** (requires macOS):
```bash
npm run ios
```

**Run on Android**:
```bash
npm run android
```

**Run on specific device**:
```bash
# iOS
npm run ios -- --simulator="iPhone 15 Pro"

# Android
npm run android -- --deviceId=<device-id>
```

## Configuration

### API Endpoint

Update the API base URL in `src/config/api.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://localhost:3000'  // Development
    : 'https://api.nexaerp.com', // Production
};
```

**Note**: For Android emulator, use `http://10.0.2.2:3000` instead of `localhost:3000`.

### Environment Variables

Create a `.env` file in the mobile directory:

```env
API_BASE_URL=http://localhost:3000
ENABLE_OFFLINE_MODE=true
```

## Key Features Implementation

### 1. Authentication (Requirement 22.2.3)

- **Secure Storage**: JWT tokens stored in device keychain (iOS) / Keystore (Android)
- **Auto Refresh**: Automatic token refresh on 401 responses
- **Session Management**: Persistent sessions across app restarts
- **Logout**: Complete cleanup of stored credentials

```typescript
// Login
await AuthService.login({email, password});

// Check authentication
const isAuth = await AuthService.isAuthenticated();

// Logout
await AuthService.logout();
```

### 2. Offline Mode (Requirement 22.2.3, 22.2.4)

- **Request Queue**: Failed requests queued for later sync
- **Data Cache**: GET responses cached for offline access
- **Auto Sync**: Automatic synchronization when online
- **Sync Status**: Visual indicator of pending sync items

```typescript
// Queue request for offline sync
await OfflineService.queueRequest({
  method: 'POST',
  url: '/api/inventory',
  data: {...}
});

// Manual sync
await OfflineService.syncOfflineData();

// Get sync status
const status = await OfflineService.getSyncStatus();
```

### 3. Push Notifications (Requirement 22.2.6)

- **FCM Integration**: Firebase Cloud Messaging for push notifications
- **Local Notifications**: Notifee for rich local notifications
- **Background Handler**: Notifications work when app is closed
- **Badge Count**: Unread notification count on app icon

```typescript
// Initialize notifications
await NotificationService.initialize();

// Schedule local notification
await NotificationService.scheduleLocalNotification(
  'Title',
  'Body',
  timestamp
);
```

### 4. Mobile-Optimized UI (Requirement 22.2.5)

- **Touch-Friendly**: Large tap targets (44x44pt minimum)
- **Responsive Layout**: Adapts to different screen sizes
- **Pull to Refresh**: Native refresh controls on lists
- **Loading States**: Visual feedback for async operations
- **Empty States**: Helpful messages when no data

## API Integration

The mobile app connects to the existing Express backend. Required backend endpoints:

```
POST   /api/auth/login          # User login
POST   /api/auth/logout         # User logout
POST   /api/auth/refresh        # Token refresh
GET    /api/auth/verify         # Verify token
GET    /api/dashboard/stats     # Dashboard statistics
GET    /api/inventory           # List inventory
POST   /api/inventory           # Create inventory item
GET    /api/orders              # List orders
POST   /api/pos/sale            # Create sale
POST   /api/notifications/register-device  # Register for push
```

## Testing

### Manual Testing

1. **Authentication Flow**:
   - Test login with valid/invalid credentials
   - Test logout and session persistence
   - Test token refresh on expiry

2. **Offline Mode**:
   - Turn off network
   - Create/update records
   - Turn on network and verify sync

3. **UI Responsiveness**:
   - Test on different screen sizes
   - Test portrait/landscape orientations
   - Test touch interactions

### Automated Testing

```bash
npm test
```

## Building for Production

### iOS Build

1. Open `ios/NexaERP.xcworkspace` in Xcode
2. Select "Any iOS Device" as target
3. Product > Archive
4. Distribute to App Store

### Android Build

```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

## Troubleshooting

### Common Issues

**Metro bundler cache issues**:
```bash
npm start -- --reset-cache
```

**iOS build fails**:
```bash
cd ios
pod deintegrate
pod install
```

**Android build fails**:
```bash
cd android
./gradlew clean
```

**Cannot connect to backend**:
- Android emulator: Use `http://10.0.2.2:3000` instead of `localhost:3000`
- iOS simulator: Use `http://localhost:3000` or your machine's IP
- Physical device: Use your machine's IP address on the same network

## Performance Optimization

- **Lazy Loading**: Screens loaded on demand
- **Image Optimization**: Compressed images and icons
- **List Virtualization**: FlatList for efficient rendering
- **Memoization**: React.memo for preventing re-renders
- **Bundle Splitting**: Platform-specific code splitting

## Security Considerations

- JWT tokens stored in secure keychain/keystore
- HTTPS enforced in production
- Certificate pinning (to be implemented)
- Biometric authentication (to be implemented)
- Jailbreak/root detection (to be implemented)

## Future Enhancements

1. **Barcode Scanning**: Integrate react-native-vision-camera for barcode reading
2. **Signature Capture**: Add signature pad for approvals
3. **Offline Conflict Resolution**: Handle merge conflicts for offline edits
4. **Biometric Auth**: Face ID / Touch ID / Fingerprint login
5. **Camera Integration**: Product photo capture
6. **GPS Tracking**: Location-based features
7. **Background Sync**: Periodic sync even when app is closed
8. **Dark Mode**: System theme support

## Contributing

Follow the main NexaERP contribution guidelines. Ensure:
- TypeScript strict mode compliance
- ESLint rules followed
- Platform-specific code documented
- Testing on both iOS and Android

## License

Same as NexaERP main project.

## Support

For issues and questions, refer to the main NexaERP repository.
