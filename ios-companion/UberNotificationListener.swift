import Foundation
import UserNotifications

/// Listens for notifications from the official Uber app and relays them to Even Hub
class UberNotificationListener: NSObject, UNUserNotificationCenterDelegate {

    static let shared = UberNotificationListener()

    var onNotificationReceived: ((RideData) -> Void)?
    var onError: ((String) -> Void)?

    private override init() {
        super.init()
    }

    /// Start listening for Uber notifications
    func startListening() {
        UNUserNotificationCenter.current().delegate = self
        print("🎧 Uber notification listener started")
    }

    // MARK: - UNUserNotificationCenterDelegate

    /// Called when a notification arrives while the app is in the foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let content = notification.request.content

        print("📬 Received notification from: \(content.threadIdentifier)")
        print("   Title: \(content.title)")
        print("   Body: \(content.body)")

        // Check if this is from the Uber app
        if isUberNotification(content) {
            handleUberNotification(content)
        }

        // Show the notification banner even if we're in the foreground
        completionHandler([.banner, .sound, .badge])
    }

    /// Called when the user taps on a notification
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let content = response.notification.request.content

        if isUberNotification(content) {
            print("👆 User tapped Uber notification")
            handleUberNotification(content)
        }

        completionHandler()
    }

    // MARK: - Private Methods

    /// Determine if a notification is from the Uber app
    private func isUberNotification(_ content: UNNotificationContent) -> Bool {
        // Check for known Uber notification identifiers
        let isUberThread = content.threadIdentifier.lowercased().contains("uber") ||
                          content.threadIdentifier == "com.ubercab.UberClient"

        let isUberKeyword = content.title.lowercased().contains("uber") ||
                           content.body.lowercased().contains("driver") ||
                           content.body.lowercased().contains("arriving")

        return isUberThread || isUberKeyword
    }

    /// Parse and relay the Uber notification to Even Hub
    private func handleUberNotification(_ content: UNNotificationContent) {
        guard let rideData = NotificationParser.parse(content) else {
            let error = "Failed to parse Uber notification"
            print("❌ \(error)")
            onError?(error)
            return
        }

        print("✅ Parsed Uber notification successfully")
        print("   Driver: \(rideData.driverName)")
        print("   ETA: \(rideData.etaMinutes) minutes")
        print("   Vehicle: \(rideData.vehicleColor) \(rideData.vehicleMake) \(rideData.vehicleModel)")

        // Send to Even Hub web app
        EvenHubClient.shared.send(rideData) { [weak self] result in
            switch result {
            case .success:
                self?.onNotificationReceived?(rideData)
            case .failure(let error):
                self?.onError?("Failed to send to Even Hub: \(error.localizedDescription)")
            }
        }
    }
}
