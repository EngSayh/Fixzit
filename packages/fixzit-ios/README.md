# Fixzit iOS App

Native iOS application for Fixzit Property Management System built with Swift and SwiftUI.

## Features

- **Native iOS Experience**: Built with SwiftUI for modern iOS devices
- **Real-time Updates**: WebSocket integration for live notifications
- **Offline Support**: Local database caching with Realm
- **Biometric Authentication**: Face ID/Touch ID support
- **Push Notifications**: Firebase Cloud Messaging integration
- **Arabic Support**: Full RTL layout support
- **Dark Mode**: Automatic theme switching

## Requirements

- iOS 15.0+
- Xcode 14.0+
- Swift 5.7+
- CocoaPods or Swift Package Manager

## Installation

### Using Swift Package Manager

1. Clone the repository
2. Open `FixzitApp.xcodeproj` in Xcode
3. Wait for Swift Package Manager to resolve dependencies
4. Build and run

### Manual Setup

1. Clone the repository:
```bash
git clone https://github.com/fixzit/fixzit-ios.git
cd fixzit-ios
```

2. Install dependencies:
```bash
swift package resolve
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your API endpoints
```

4. Open in Xcode:
```bash
open FixzitApp.xcodeproj
```

## Configuration

### API Configuration

Edit `Config.swift` to set your API endpoints:

```swift
struct Config {
    struct API {
        static let baseURL = "https://api.fixzit.sa"
        static let timeout: TimeInterval = 30
    }
}
```

### Firebase Setup

1. Add your `GoogleService-Info.plist` to the project
2. Enable Push Notifications in project capabilities
3. Configure Firebase in `AppDelegate.swift`

### App Store Connect

1. Create App ID in Apple Developer Portal
2. Configure provisioning profiles
3. Set up App Store Connect metadata
4. Submit for review

## Architecture

- **MVVM Pattern**: Model-View-ViewModel architecture
- **Combine Framework**: Reactive programming
- **SwiftUI**: Declarative UI
- **Dependency Injection**: Using property wrappers
- **Repository Pattern**: Data layer abstraction

## Project Structure

```
FixzitApp/
├── App/
│   ├── FixzitApp.swift
│   └── AppDelegate.swift
├── Views/
│   ├── Dashboard/
│   ├── Properties/
│   ├── WorkOrders/
│   └── Settings/
├── ViewModels/
├── Models/
├── Services/
│   ├── APIManager.swift
│   ├── AuthManager.swift
│   └── NotificationService.swift
├── Utils/
├── Resources/
└── Tests/
```

## Key Components

### Authentication
- JWT token management
- Biometric authentication
- Secure keychain storage
- Auto token refresh

### Data Management
- Realm database for offline storage
- Combine publishers for reactive updates
- Automatic sync with backend

### UI Components
- Custom SwiftUI components
- Reusable views
- Accessibility support
- Dynamic Type support

## Testing

Run tests using Xcode:
```bash
swift test
```

Or using command line:
```bash
xcodebuild test -scheme FixzitApp -destination 'platform=iOS Simulator,name=iPhone 14'
```

## Building

### Debug Build
```bash
xcodebuild -scheme FixzitApp -configuration Debug
```

### Release Build
```bash
xcodebuild -scheme FixzitApp -configuration Release archive
```

## Deployment

1. Archive the app in Xcode
2. Upload to App Store Connect
3. Submit for TestFlight beta testing
4. Submit for App Store review

## API Integration

The app connects to the same backend API as the web application:

- Base URL: Configure in `Config.swift`
- Authentication: Bearer token in headers
- All endpoints match web API documentation

## Localization

- English (en)
- Arabic (ar) with full RTL support

## Privacy

- Camera: For document scanning
- Location: For property location features
- Notifications: For real-time updates
- Biometrics: For secure authentication

## License

Copyright © 2025 Fixzit. All rights reserved.