import Foundation

/// Data model for a ride notification parsed from Uber
struct RideData: Codable {
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
}
