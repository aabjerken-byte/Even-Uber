import Foundation

/// Lifecycle of a ride. Mirrors `RideStatus` in the React model.
///
/// Without this the display kept the last card forever — a heads-up display
/// insisting the driver is "1 min away" after the trip already ended.
enum RideStatus: String, Codable {
    case enroute
    case arriving
    case arrived
    case completed
    case cancelled

    /// Statuses after which the display should wind the card down.
    var isTerminal: Bool {
        switch self {
        case .arrived, .completed, .cancelled: return true
        case .enroute, .arriving: return false
        }
    }

    /// Whether an ETA is meaningful for this status.
    var expectsETA: Bool { self == .enroute || self == .arriving }
}

/// Data model for a ride notification parsed from Uber
struct RideData: Codable {
    let status: RideStatus
    let driverName: String
    let driverRating: Double
    let vehicleMake: String
    let vehicleModel: String
    let vehicleColor: String
    let licensePlate: String
    let etaMinutes: Int
    let driverLat: Double?
    let driverLng: Double?
    let requesterLat: Double?
    let requesterLng: Double?
    let timestamp: Date

    enum CodingKeys: String, CodingKey {
        case status
        case driverName
        case driverRating
        case vehicleMake
        case vehicleModel
        case vehicleColor
        case licensePlate
        case etaMinutes
        case driverLat
        case driverLng
        case requesterLat
        case requesterLng
        case timestamp
    }

    /// Initialize with default values for optional fields
    init(
        status: RideStatus = .enroute,
        driverName: String,
        driverRating: Double = 0.0,
        vehicleMake: String = "",
        vehicleModel: String = "",
        vehicleColor: String = "",
        licensePlate: String = "",
        etaMinutes: Int = 0,
        driverLat: Double? = nil,
        driverLng: Double? = nil,
        requesterLat: Double? = nil,
        requesterLng: Double? = nil,
        timestamp: Date = Date()
    ) {
        self.status = status
        self.driverName = driverName
        self.driverRating = driverRating
        self.vehicleMake = vehicleMake
        self.vehicleModel = vehicleModel
        self.vehicleColor = vehicleColor
        self.licensePlate = licensePlate
        self.etaMinutes = etaMinutes
        self.driverLat = driverLat
        self.driverLng = driverLng
        self.requesterLat = requesterLat
        self.requesterLng = requesterLng
        self.timestamp = timestamp
    }

    /// Copy of this ride with the requester's coordinates attached.
    ///
    /// The parser produces rides without any location — notification text
    /// carries none — so the listener enriches the result from `LocationProvider`
    /// before sending it on to the display.
    func withRequesterLocation(latitude: Double?, longitude: Double?) -> RideData {
        guard let latitude, let longitude else { return self }

        return RideData(
            status: status,
            driverName: driverName,
            driverRating: driverRating,
            vehicleMake: vehicleMake,
            vehicleModel: vehicleModel,
            vehicleColor: vehicleColor,
            licensePlate: licensePlate,
            etaMinutes: etaMinutes,
            driverLat: driverLat,
            driverLng: driverLng,
            requesterLat: latitude,
            requesterLng: longitude,
            timestamp: timestamp
        )
    }
}
