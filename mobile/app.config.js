export default {
  expo: {
    name: "Fixzit Mobile",
    slug: "fixzit-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0078D4"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.fixzit.mobile",
      buildNumber: "1.0.0"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0078D4"
      },
      package: "com.fixzit.mobile",
      versionCode: 1,
      permissions: [
        "CAMERA",
        "RECORD_AUDIO",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "NOTIFICATIONS"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#0078D4",
          sounds: ["./assets/notification-sound.wav"]
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow Fixzit to use your location to find nearby properties and technicians."
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow Fixzit to access your camera to capture work order photos and scan QR codes."
        }
      ],
      [
        "expo-barcode-scanner",
        {
          cameraPermission: "Allow Fixzit to access your camera to scan property and equipment QR codes."
        }
      ]
    ],
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: "fixzit-mobile-project"
      }
    }
  }
};