import Foundation
import Combine
import Security
import LocalAuthentication

// MARK: - Auth Manager
class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var token: String?
    
    private let keychain = KeychainManager()
    private var cancellables = Set<AnyCancellable>()
    
    private init() {
        loadStoredCredentials()
    }
    
    // MARK: - Authentication
    func login(email: String, password: String) -> AnyPublisher<LoginResponse, APIError> {
        let endpoint = AuthEndpoints.login(email: email, password: password)
        
        return APIManager.shared.request(endpoint, type: LoginResponse.self)
            .handleEvents(receiveOutput: { [weak self] response in
                self?.handleLoginSuccess(response)
            })
            .eraseToAnyPublisher()
    }
    
    func loginWithBiometrics() -> AnyPublisher<Bool, Error> {
        let context = LAContext()
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return Fail(error: AuthError.biometricsNotAvailable)
                .eraseToAnyPublisher()
        }
        
        return Future { promise in
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                                 localizedReason: "Log in to your account") { success, error in
                DispatchQueue.main.async {
                    if success {
                        if let storedToken = self.keychain.getToken() {
                            self.token = storedToken
                            self.isAuthenticated = true
                            self.fetchUserProfile()
                            promise(.success(true))
                        } else {
                            promise(.failure(AuthError.noStoredCredentials))
                        }
                    } else {
                        promise(.failure(error ?? AuthError.biometricsFailed))
                    }
                }
            }
        }
        .eraseToAnyPublisher()
    }
    
    func logout() {
        token = nil
        currentUser = nil
        isAuthenticated = false
        keychain.deleteToken()
        
        // Call logout endpoint
        let endpoint = AuthEndpoints.logout
        APIManager.shared.request(endpoint, type: EmptyResponse.self)
            .sink(receiveCompletion: { _ in },
                  receiveValue: { _ in })
            .store(in: &cancellables)
    }
    
    func refreshToken() -> AnyPublisher<LoginResponse, APIError> {
        guard let currentToken = token else {
            return Fail(error: APIError.unauthorized)
                .eraseToAnyPublisher()
        }
        
        let endpoint = AuthEndpoints.refreshToken(token: currentToken)
        
        return APIManager.shared.request(endpoint, type: LoginResponse.self)
            .handleEvents(receiveOutput: { [weak self] response in
                self?.token = response.token
                self?.keychain.saveToken(response.token)
            })
            .eraseToAnyPublisher()
    }
    
    // MARK: - User Profile
    func fetchUserProfile() {
        let endpoint = AuthEndpoints.profile
        
        APIManager.shared.request(endpoint, type: User.self)
            .sink(receiveCompletion: { _ in },
                  receiveValue: { [weak self] user in
                self?.currentUser = user
            })
            .store(in: &cancellables)
    }
    
    // MARK: - Private Methods
    private func loadStoredCredentials() {
        if let storedToken = keychain.getToken() {
            token = storedToken
            isAuthenticated = true
            fetchUserProfile()
        }
    }
    
    private func handleLoginSuccess(_ response: LoginResponse) {
        token = response.token
        keychain.saveToken(response.token)
        isAuthenticated = true
        
        if let user = response.user {
            currentUser = user
        } else {
            fetchUserProfile()
        }
    }
}

// MARK: - Auth Endpoints
enum AuthEndpoints: Endpoint {
    case login(email: String, password: String)
    case logout
    case refreshToken(token: String)
    case profile
    
    var path: String {
        switch self {
        case .login:
            return "/api/auth/login"
        case .logout:
            return "/api/auth/logout"
        case .refreshToken:
            return "/api/auth/refresh"
        case .profile:
            return "/api/auth/profile"
        }
    }
    
    var method: HTTPMethod {
        switch self {
        case .login, .logout, .refreshToken:
            return .post
        case .profile:
            return .get
        }
    }
    
    var headers: [String: String]? { nil }
    
    var body: Encodable? {
        switch self {
        case .login(let email, let password):
            return LoginRequest(email: email, password: password)
        case .refreshToken(let token):
            return RefreshTokenRequest(token: token)
        default:
            return nil
        }
    }
}

// MARK: - Auth Models
struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct LoginResponse: Decodable {
    let token: String
    let user: User?
}

struct RefreshTokenRequest: Encodable {
    let token: String
}

struct EmptyResponse: Decodable {}

// MARK: - Auth Errors
enum AuthError: Error, LocalizedError {
    case biometricsNotAvailable
    case biometricsFailed
    case noStoredCredentials
    
    var errorDescription: String? {
        switch self {
        case .biometricsNotAvailable:
            return "Biometric authentication is not available"
        case .biometricsFailed:
            return "Biometric authentication failed"
        case .noStoredCredentials:
            return "No stored credentials found"
        }
    }
}

// MARK: - Keychain Manager
class KeychainManager {
    private let tokenKey = "com.fixzit.authToken"
    
    func saveToken(_ token: String) {
        let data = token.data(using: .utf8)!
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: tokenKey,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    func getToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: tokenKey,
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return token
    }
    
    func deleteToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: tokenKey
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}