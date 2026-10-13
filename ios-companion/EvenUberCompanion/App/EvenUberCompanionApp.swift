import SwiftUI

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
