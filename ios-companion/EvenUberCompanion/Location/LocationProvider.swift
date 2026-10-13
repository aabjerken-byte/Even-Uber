import CoreLocation
import Foundation

/// Supplies the requester's own coordinates so the Even Hub map has something
/// real to anchor on.
///
/// The *driver's* position cannot come from here — a notification carries no
/// coordinates, and iOS won't hand us Uber's data. Driver coordinates only
/// arrive via the Uber API path in `src/backend/`. See `NOTIFICATION_ACCESS.md`.
final class LocationProvider: NSObject, ObservableObject, CLLocationManagerDelegate {

    static let shared = LocationProvider()

    @Published private(set) var lastKnownLocation: CLLocationCoordinate2D?
    @Published private(set) var authorizationStatus: CLAuthorizationStatus = .notDetermined

    private let manager = CLLocationManager()

    var isAuthorized: Bool {
        authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways
    }

    private override init() {
        super.init()
        manager.delegate = self
        // 100 m is plenty to place a pickup pin, and it lets iOS use wifi/cell
        // positioning instead of waking the GPS chip — which is what keeps this
        // inside the project's <3%/hour battery target.
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        manager.distanceFilter = 50
        manager.pausesLocationUpdatesAutomatically = true
        authorizationStatus = manager.authorizationStatus
    }

    /// Ask for "when in use" access. Safe to call repeatedly; iOS only prompts
    /// on the first call.
    func requestPermission() {
        guard authorizationStatus == .notDetermined else {
            startUpdatingIfAuthorized()
            return
        }
        manager.requestWhenInUseAuthorization()
    }

    /// Best known coordinate, or nil if location is unavailable or denied.
    func currentCoordinate() -> CLLocationCoordinate2D? {
        lastKnownLocation
    }

    func startUpdatingIfAuthorized() {
        guard isAuthorized else { return }
        manager.startUpdatingLocation()
    }

    func stopUpdating() {
        manager.stopUpdatingLocation()
    }

    // MARK: - CLLocationManagerDelegate

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.authorizationStatus = manager.authorizationStatus

            switch manager.authorizationStatus {
            case .authorizedWhenInUse, .authorizedAlways:
                print("📍 Location authorized")
                manager.startUpdatingLocation()
            case .denied, .restricted:
                print("🚫 Location denied — the map will show ETA range only")
                self.lastKnownLocation = nil
            case .notDetermined:
                print("❓ Location permission not yet requested")
            @unknown default:
                break
            }
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        DispatchQueue.main.async { [weak self] in
            self?.lastKnownLocation = location.coordinate
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // A transient failure is normal indoors; keep the last good fix rather
        // than blanking the map.
        print("⚠️ Location update failed: \(error.localizedDescription)")
    }
}
