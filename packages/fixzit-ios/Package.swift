// swift-tools-version:5.7
import PackageDescription

let package = Package(
    name: "FixzitApp",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "FixzitApp",
            targets: ["FixzitApp"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.6.0"),
        .package(url: "https://github.com/SwiftyJSON/SwiftyJSON.git", from: "5.0.0"),
        .package(url: "https://github.com/onevcat/Kingfisher.git", from: "7.0.0"),
        .package(url: "https://github.com/realm/realm-swift.git", from: "10.36.0"),
        .package(url: "https://github.com/socketio/socket.io-client-swift", from: "16.0.0"),
        .package(url: "https://github.com/firebase/firebase-ios-sdk", from: "10.0.0"),
        .package(url: "https://github.com/marmelroy/PhoneNumberKit", from: "3.5.0"),
        .package(url: "https://github.com/hackiftekhar/IQKeyboardManager", from: "6.5.0"),
        .package(url: "https://github.com/SwiftGen/SwiftGen", from: "6.6.0"),
        .package(url: "https://github.com/airbnb/lottie-ios.git", from: "4.0.0")
    ],
    targets: [
        .target(
            name: "FixzitApp",
            dependencies: [
                "Alamofire",
                "SwiftyJSON",
                "Kingfisher",
                .product(name: "RealmSwift", package: "realm-swift"),
                .product(name: "SocketIO", package: "socket.io-client-swift"),
                .product(name: "FirebaseAuth", package: "firebase-ios-sdk"),
                .product(name: "FirebaseMessaging", package: "firebase-ios-sdk"),
                .product(name: "FirebaseAnalytics", package: "firebase-ios-sdk"),
                "PhoneNumberKit",
                .product(name: "IQKeyboardManagerSwift", package: "IQKeyboardManager"),
                "Lottie"
            ],
            path: "Sources"
        ),
        .testTarget(
            name: "FixzitAppTests",
            dependencies: ["FixzitApp"],
            path: "Tests"
        ),
    ]
)