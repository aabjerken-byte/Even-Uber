import Foundation
import UserNotifications

/// Listens for ride notifications and relays them to Even Hub.
///
/// > Important: `UNUserNotificationCenterDelegate` only delivers notifications
/// > that *this* app posts or receives via push. iOS has no public API for
/// > reading another app's notifications, so this cannot observe the official
/// > Uber app directly. See `ios-companion/NOTIFICATION_ACCESS.md`.
final class UberNotificationListener: NSObject, ObservableObject, UNUserNotificationCenterDelegate {

    static let shared = UberNotificationListener()

    /// Most recent successfully parsed ride, published for the UI.
    @Published private(set) var lastRide: RideData?

    /// Most recent error message, published for the UI.
    @Published private(set) var lastError: String?

    /// Whether the Even Hub display app is reachable.
    @Published private(set) var isConnected = false

    /// Optional callbacks for non-SwiftUI consumers.
    var onNotificationReceived: ((RideData) -> Void)?
    var onError: ((String) -> Void)?

    private let client: EvenHubClient

    private init(client: EvenHubClient = .shared) {
        self.client = client
        super.init()

        self.client.onConnectionStatusChanged = { [weak self] connected in
            DispatchQueue.main.async { self?.isConnected = connected }
        }
    }

    /// Start listening for ride notifications
    func startListening() {
        UNUserNotificationCenter.current().delegate = self
        print("🎧 Uber notification listener started")
        checkConnection { _ in }
    }

    /// Ping the Even Hub display app and publish the result.
    func checkConnection(completion: @escaping (Bool) -> Void) {
        client.checkConnection { [weak self] connected in
            DispatchQueue.main.async {
                self?.isConnected = connected
                completion(connected)
            }
        }
    }

    /// Parse and relay an already-received notification. Exposed for testing
    /// and for the in-app "send a sample ride" debug action.
    func handle(title: String, body: String) {
        guard let parsed = NotificationParser.parse(title: title, body: body) else {
            report(error: "Failed to parse Uber notification")
            return
        }

        // Notification text carries no coordinates, so attach our own position
        // here — without it the display has nothing to draw a map around.
        let coordinate = LocationProvider.shared.currentCoordinate()
        let rideData = parsed.withRequesterLocation(
            latitude: coordinate?.latitude,
            longitude: coordinate?.longitude
        )

        print("✅ Parsed Uber notification successfully")
        print("   Driver: \(rideData.driverName)")
        print("   ETA: \(rideData.etaMinutes) minutes")
        print("   Vehicle: \(rideData.vehicleColor) \(rideData.vehicleMake) \(rideData.vehicleModel)")
        if let coordinate {
            print("   Location: \(coordinate.latitude), \(coordinate.longitude)")
        } else {
            print("   Location: unavailable — map will show ETA range only")
        }

        client.send(rideData) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    self?.lastRide = rideData
                    self?.lastError = nil
                    self?.onNotificationReceived?(rideData)
                case .failure(let error):
                    self?.report(error: "Failed to send to Even Hub: \(error.localizedDescription)")
                }
            }
        }
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

        if Self.isUberNotification(content) {
            handle(title: content.title, body: content.body)
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

        if Self.isUberNotification(content) {
            print("👆 User tapped Uber notification")
            handle(title: content.title, body: content.body)
        }

        completionHandler()
    }

    // MARK: - Private

    /// Determine if a notification looks like an Uber ride update
    static func isUberNotification(_ content: UNNotificationContent) -> Bool {
        let thread = content.threadIdentifier.lowercased()
        let isUberThread = thread.contains("uber") || thread == "com.ubercab.uberclient"

        let haystack = "\(content.title) \(content.body)".lowercased()
        let isUberKeyword = haystack.contains("uber")
            || haystack.contains("driver")
            || haystack.contains("arriving")

        return isUberThread || isUberKeyword
    }

    private func report(error message: String) {
        print("❌ \(message)")
        DispatchQueue.main.async { [weak self] in
            self?.lastError = message
            self?.onError?(message)
        }
    }
}
