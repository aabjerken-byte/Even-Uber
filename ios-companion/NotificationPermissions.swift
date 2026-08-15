import Foundation
import UserNotifications

/// Manages notification permissions
class NotificationPermissions {

    static let shared = NotificationPermissions()

    private(set) var isAuthorized = false
    var onAuthorizationStatusChanged: ((Bool) -> Void)?

    private init() {
        checkAuthorizationStatus()
    }

    /// Request permission to read notifications
    func requestPermission(completion: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { [weak self] granted, error in
            DispatchQueue.main.async {
                self?.isAuthorized = granted

                if granted {
                    print("✅ Notification permission granted")
                } else {
                    print("❌ Notification permission denied")
                    if let error = error {
                        print("   Error: \(error.localizedDescription)")
                    }
                }

                self?.onAuthorizationStatusChanged?(granted)
                completion(granted)
            }
        }
    }

    /// Check current authorization status without requesting
    func checkAuthorizationStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            DispatchQueue.main.async {
                let authorized = settings.authorizationStatus == .authorized
                self?.isAuthorized = authorized

                switch settings.authorizationStatus {
                case .authorized:
                    print("🔔 Notifications authorized")
                case .denied:
                    print("🚫 Notifications denied - enable in Settings → Notifications")
                case .notDetermined:
                    print("❓ Notification status not determined - request permission")
                case .provisional:
                    print("⏳ Provisional notification access granted")
                case .ephemeral:
                    print("⏲️ Ephemeral notification access granted")
                @unknown default:
                    print("❓ Unknown notification status")
                }
            }
        }
    }

    /// Open Settings app to notification permissions
    func openNotificationSettings() {
        guard let settingsURL = URL(string: UIApplication.openSettingsURLString) else {
            print("❌ Could not open Settings")
            return
        }

        if UIApplication.shared.canOpenURL(settingsURL) {
            UIApplication.shared.open(settingsURL)
        }
    }
}
