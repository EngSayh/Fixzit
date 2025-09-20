import SwiftUI
import Combine
import Foundation

@main
struct FixzitApp: App {
    @StateObject private var authManager = AuthManager.shared
    @StateObject private var dataManager = DataManager.shared
    @StateObject private var notificationManager = NotificationManager.shared
    
    init() {
        setupAppearance()
        configureServices()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(dataManager)
                .environmentObject(notificationManager)
                .onAppear {
                    notificationManager.requestPermission()
                }
        }
    }
    
    private func setupAppearance() {
        UINavigationBar.appearance().largeTitleTextAttributes = [
            .foregroundColor: UIColor(Color.primary)
        ]
        
        UITableView.appearance().backgroundColor = .systemGroupedBackground
    }
    
    private func configureServices() {
        APIManager.shared.configure(baseURL: Config.API.baseURL)
    }
}

// MARK: - ContentView
struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showSplash = true
    
    var body: some View {
        Group {
            if showSplash {
                SplashView()
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            withAnimation {
                                showSplash = false
                            }
                        }
                    }
            } else if authManager.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
    }
}

// MARK: - Configuration
struct Config {
    struct API {
        static let baseURL = ProcessInfo.processInfo.environment["API_URL"] ?? "http://localhost:5000"
        static let timeout: TimeInterval = 30
    }
    
    struct App {
        static let name = "Fixzit"
        static let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        static let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }
}