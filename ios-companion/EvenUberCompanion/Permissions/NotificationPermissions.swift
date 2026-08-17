import Foundation
import UIKit
import UserNotifications

/// Manages notification permissions
final class NotificationPermissions: ObservableObject {

    static let shared = NotificationPermissions()

    @Published private(set) var isAuthorized = false
    @Published private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined

    var onAuthorizationStatusChanged: ((Bool) -> Void)?

    private init() {
        checkAuthorizationStatus()
    }

    /// Request permission to post notifications
    func requestPermission(completion: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { [weak self] granted, error in
            DispatchQueue.main.async {
                self?.isAuthorized = granted
                self?.authorizationStatus = granted ? .authorized : .denied

                if granted {
                    print("✅ Notification permission granted")
                } else {
                    print("❌ Notification permission denied")
                    if let error {
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
                    || settings.authorizationStatus == .provisional
                self?.isAuthorized = authorized
                self?.authorizationStatus = settings.authorizationStatus

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

                self?.onAuthorizationStatusChanged?(authorized)
            }
        }
    }

    /// Open the Settings app at this app's notification settings
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
