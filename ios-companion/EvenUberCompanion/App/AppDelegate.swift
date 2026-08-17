import UIKit
import UserNotifications

/// App delegate to handle app initialization
final class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Route notification callbacks to the listener and start it.
        // `startListening()` installs itself as the notification centre
        // delegate, so it must run before any notification can arrive.
        UberNotificationListener.shared.startListening()

        // Refresh the cached permission state for the UI.
        NotificationPermissions.shared.checkAuthorizationStatus()

        print("🚀 Even Uber Companion App started")

        return true
    }
}
