# Fixzit Android App

Native Android application for Fixzit Property Management System built with Kotlin and Jetpack Compose.

## Features

- **Modern Android**: Built with Jetpack Compose
- **Material Design 3**: Following latest design guidelines
- **Real-time Updates**: Socket.IO integration
- **Offline First**: Room database with sync
- **Biometric Authentication**: Fingerprint/Face unlock
- **Push Notifications**: FCM integration
- **Arabic Support**: Full RTL layout support
- **Dark Theme**: System-based theme switching

## Requirements

- Android Studio Hedgehog (2023.1.1) or newer
- JDK 17
- Android SDK 34
- Minimum Android 7.0 (API 24)
- Target Android 14 (API 34)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/fixzit/fixzit-android.git
cd fixzit-android
```

2. Open in Android Studio:
```bash
studio .
```

3. Configure environment:
   - Copy `local.properties.example` to `local.properties`
   - Add your API configuration

4. Sync project with Gradle files

5. Run the app on device/emulator

## Configuration

### API Configuration

In `app/build.gradle.kts`:
```kotlin
buildConfigField("String", "API_BASE_URL", "\"https://api.fixzit.sa\"")
buildConfigField("String", "SOCKET_URL", "\"wss://api.fixzit.sa\"")
```

### Firebase Setup

1. Add `google-services.json` to `app/` directory
2. Configure FCM in Firebase Console
3. Update notification channels in `NotificationService.kt`

### Google Play Setup

1. Create app in Google Play Console
2. Configure signing certificates
3. Set up internal testing track
4. Prepare store listing

## Architecture

- **MVVM + Clean Architecture**
- **Jetpack Compose**: UI framework
- **Hilt**: Dependency injection
- **Coroutines + Flow**: Asynchronous programming
- **Repository Pattern**: Data abstraction
- **Use Cases**: Business logic

## Project Structure

```
app/
├── src/main/java/com/fixzit/app/
│   ├── data/
│   │   ├── api/
│   │   ├── local/
│   │   └── repository/
│   ├── domain/
│   │   ├── model/
│   │   ├── repository/
│   │   └── usecase/
│   ├── presentation/
│   │   ├── dashboard/
│   │   ├── properties/
│   │   ├── workorders/
│   │   └── common/
│   ├── di/
│   ├── utils/
│   └── FixzitApplication.kt
├── res/
└── AndroidManifest.xml
```

## Key Components

### Authentication
- DataStore for secure token storage
- Biometric prompt API
- JWT token management
- Auto refresh mechanism

### Data Management
- Room database for local storage
- Retrofit for API calls
- WorkManager for background sync
- Paging 3 for large datasets

### UI Components
- Compose Material 3 components
- Custom composables
- Adaptive layouts
- Accessibility features

## Dependencies

Main dependencies:
- Jetpack Compose
- Hilt for DI
- Retrofit + OkHttp
- Room Database
- Firebase (Auth, FCM, Analytics)
- Socket.IO Client
- Coil for images
- Vico for charts

## Testing

### Unit Tests
```bash
./gradlew test
```

### Instrumented Tests
```bash
./gradlew connectedAndroidTest
```

### UI Tests
```bash
./gradlew connectedCheck
```

## Building

### Debug Build
```bash
./gradlew assembleDebug
```

### Release Build
```bash
./gradlew assembleRelease
```

### Bundle for Play Store
```bash
./gradlew bundleRelease
```

## Signing

1. Generate keystore:
```bash
keytool -genkey -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias fixzit
```

2. Configure in `gradle.properties`:
```properties
RELEASE_STORE_FILE=release-key.jks
RELEASE_STORE_PASSWORD=your_password
RELEASE_KEY_ALIAS=fixzit
RELEASE_KEY_PASSWORD=your_password
```

## ProGuard Rules

ProGuard is configured for release builds. Key rules:
- Keep data models
- Keep API interfaces
- Preserve annotations
- Optimize for size

## API Integration

The app connects to the same backend API:
- Base URL: Configure in build.gradle
- Authentication: Bearer token
- All endpoints documented in API docs

## Permissions

Required permissions:
- **INTERNET**: API communication
- **CAMERA**: Document scanning
- **ACCESS_FINE_LOCATION**: Property locations
- **POST_NOTIFICATIONS**: Push notifications
- **USE_BIOMETRIC**: Fingerprint auth
- **VIBRATE**: Notification feedback

## Localization

Supported languages:
- English (en)
- Arabic (ar) with RTL

## Performance

- Baseline profiles for startup optimization
- R8 full mode for code shrinking
- WebP images for reduced size
- Lazy loading for lists
- Image caching with Coil

## Analytics

Firebase Analytics events:
- Screen views
- User actions
- Error tracking
- Performance monitoring

## Distribution

1. **Internal Testing**: Upload to Play Console
2. **Closed Testing**: Beta testers
3. **Open Testing**: Public beta
4. **Production**: Staged rollout

## Troubleshooting

Common issues:
- API connection: Check network security config
- Build errors: Clean and rebuild
- Signing issues: Verify keystore path
- FCM: Check google-services.json

## License

Copyright © 2025 Fixzit. All rights reserved.