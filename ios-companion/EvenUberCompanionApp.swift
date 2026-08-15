import SwiftUI
import UserNotifications

@main
struct EvenUberCompanionApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var permissionManager = NotificationPermissions.shared
    @StateObject private var listener = UberNotificationListener.shared

    var body: some Scene {
        WindowGroup {
            ContentView(permissionManager: permissionManager, listener: listener)
        }
    }
}

/// App delegate to handle app initialization
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Set up notification handler
        UNUserNotificationCenter.current().delegate = UberNotificationListener.shared

        // Start listening for notifications
        UberNotificationListener.shared.startListening()

        // Check and request notification permissions if needed
        NotificationPermissions.shared.checkAuthorizationStatus()

        print("🚀 Even Uber Companion App started")

        return true
    }
}
