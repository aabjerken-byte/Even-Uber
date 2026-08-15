import Foundation
import UserNotifications

/// Parses Uber notification text and extracts ride data
class NotificationParser {

    /// Parse a UNNotificationContent into RideData
    static func parse(_ content: UNNotificationContent) -> RideData? {
        let title = content.title
        let body = content.body
        let fullText = "\(title) \(body)"

        // Extract fields from notification text
        let driverName = extractDriverName(from: fullText)
        let driverRating = extractDriverRating(from: fullText)
        let vehicleInfo = extractVehicleInfo(from: fullText)
        let licensePlate = extractLicensePlate(from: fullText)
        let etaMinutes = extractETA(from: fullText)

        // Build RideData
        let ride = RideData(
            driverName: driverName,
            driverRating: driverRating,
            vehicleMake: vehicleInfo.make,
            vehicleModel: vehicleInfo.model,
            vehicleColor: vehicleInfo.color,
            licensePlate: licensePlate,
            etaMinutes: etaMinutes,
            timestamp: Date()
        )

        // Validate we got at least driver name and ETA
        guard !driverName.isEmpty && etaMinutes > 0 else {
            print("⚠️ Failed to parse notification: missing critical fields")
            print("   Title: \(title)")
            print("   Body: \(body)")
            return nil
        }

        return ride
    }

    // MARK: - Extraction Methods

    /// Extract driver name from notification text
    /// Examples: "John D.", "Driver John", "John is 3 mins away"
    private static func extractDriverName(from text: String) -> String {
        let patterns = [
            "(?:Driver\\s)?([A-Z][a-z]+(?:\\s[A-Z][a-z]*)?)",  // "John D." or "John Davis"
            "([A-Z][a-z]+)\\s(?:is|has)",                        // "John is 3 mins away"
            "([A-Z][a-z]+)\\s\\(",                               // "John (4.9★)"
        ]

        for pattern in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern),
               let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
               let range = Range(match.range(at: 1), in: text) {
                return String(text[range]).trimmingCharacters(in: .whitespaces)
            }
        }

        return ""
    }

    /// Extract driver rating from notification text
    /// Examples: "4.9★", "4.9 star", "(4.9)"
    private static func extractDriverRating(from text: String) -> Double {
        let patterns = [
            "([0-9]\\.[0-9])\\s*★",     // "4.9★"
            "\\(([0-9]\\.[0-9])\\)",    // "(4.9)"
            "([0-9]\\.[0-9])\\s*star",  // "4.9 star"
        ]

        for pattern in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern),
               let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
               let range = Range(match.range(at: 1), in: text),
               let rating = Double(text[range]) {
                return rating
            }
        }

        return 0.0
    }

    /// Extract vehicle make and model from notification text
    /// Examples: "Toyota Prius", "White Honda Civic", "Silver BMW X5"
    private static func extractVehicleInfo(from text: String) -> (make: String, model: String, color: String) {
        let colors = ["White", "Silver", "Black", "Red", "Blue", "Gray", "Grey", "Green", "Yellow", "Orange", "Brown", "Gold", "Beige"]
        let makes = ["Toyota", "Honda", "BMW", "Mercedes", "Ford", "Chevrolet", "Tesla", "Volkswagen", "Audi", "Lexus", "Hyundai", "Kia"]

        var color = ""
        var make = ""
        var model = ""

        // Extract color (if present)
        for colorName in colors {
            if text.localizedCaseInsensitiveContains(colorName) {
                color = colorName
                break
            }
        }

        // Extract vehicle make and model
        let vehiclePattern = "(\\w+)\\s+(\\w+)"
        if let regex = try? NSRegularExpression(pattern: vehiclePattern),
           let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) {
            if let makeRange = Range(match.range(at: 1), in: text),
               let modelRange = Range(match.range(at: 2), in: text) {
                let potentialMake = String(text[makeRange])
                if makes.contains(potentialMake) {
                    make = potentialMake
                    model = String(text[modelRange])
                }
            }
        }

        return (make: make, model: model, color: color)
    }

    /// Extract license plate from notification text
    /// Examples: "ABC123", "(ABC123)", "[ABC123]"
    private static func extractLicensePlate(from text: String) -> String {
        let patterns = [
            "\\(([A-Z0-9]{2,8})\\)",    // "(ABC123)"
            "\\[([A-Z0-9]{2,8})\\]",    // "[ABC123]"
            "plate\\s([A-Z0-9]{2,8})",  // "plate ABC123"
            "([A-Z0-9]{2,8})\\)",       // "ABC123)" at end
        ]

        for pattern in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern),
               let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
               let range = Range(match.range(at: 1), in: text) {
                return String(text[range])
            }
        }

        return ""
    }

    /// Extract ETA in minutes from notification text
    /// Examples: "3 mins away", "5 minutes", "arriving in 10 mins"
    private static func extractETA(from text: String) -> Int {
        let patterns = [
            "(\\d+)\\s*(?:mins?|minutes?)",  // "3 mins" or "5 minutes"
            "in\\s+(\\d+)\\s*(?:mins?)",     // "in 3 mins"
            "(\\d+)\\s*(?:mins?)\\s*away",   // "3 mins away"
        ]

        for pattern in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
               let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
               let range = Range(match.range(at: 1), in: text),
               let minutes = Int(text[range]) {
                return minutes
            }
        }

        return 0
    }
}
