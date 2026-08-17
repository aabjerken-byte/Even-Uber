import Foundation
import UserNotifications

/// Parses Uber notification text and extracts ride data
enum NotificationParser {

    // MARK: - Reference Data

    /// Vehicle colours Uber uses in notification copy.
    static let knownColors = [
        "White", "Silver", "Black", "Red", "Blue", "Gray", "Grey",
        "Green", "Yellow", "Orange", "Brown", "Gold", "Beige", "Maroon",
    ]

    /// Vehicle makes we can recognise by name. Anything outside this list
    /// falls back to positional extraction (see `extractVehicleInfo`).
    static let knownMakes = [
        "Toyota", "Honda", "BMW", "Mercedes", "Mercedes-Benz", "Ford", "Chevrolet",
        "Chevy", "Tesla", "Volkswagen", "VW", "Audi", "Lexus", "Hyundai", "Kia",
        "Nissan", "Subaru", "Mazda", "Jeep", "Dodge", "Chrysler", "GMC", "Buick",
        "Cadillac", "Acura", "Infiniti", "Volvo", "Mitsubishi", "Porsche", "Genesis",
        "Land Rover", "Range Rover", "Lincoln", "Ram", "Fiat", "Mini",
    ]

    /// Capitalised words that look like names but never are. Without this the
    /// name matcher happily returns "Your Uber" from "Your Uber is arriving".
    private static let nameStopwords: Set<String> = [
        "your", "uber", "the", "a", "an", "driver", "arriving", "arrived",
        "meet", "trip", "ride", "your driver", "on", "at", "in", "is", "has",
        "pickup", "pick", "eta", "estimated", "minutes", "mins", "away",
        "heading", "confirmed", "cancelled", "canceled", "uberx", "uberxl",
        "comfort", "black", "pool", "share", "reserve", "please",
        // Pronouns — "She is 12 minutes away" must not yield a driver named "She".
        "he", "she", "they", "it", "we", "you", "i", "there", "this", "that",
    ]

    // MARK: - Entry Points

    /// Parse a `UNNotificationContent` into `RideData`.
    static func parse(_ content: UNNotificationContent) -> RideData? {
        parse(title: content.title, body: content.body)
    }

    /// Parse raw notification text into `RideData`.
    ///
    /// Split out from `parse(_:)` so the extraction logic can be unit tested
    /// without constructing notification objects.
    static func parse(title: String, body: String) -> RideData? {
        let fullText = "\(title) \(body)"

        let status = extractStatus(from: fullText)
        let driverName = extractDriverName(from: fullText)
        let driverRating = extractDriverRating(from: fullText)
        let vehicleInfo = extractVehicleInfo(from: fullText)
        let licensePlate = extractLicensePlate(from: fullText)
        let etaMinutes = extractETA(from: fullText)

        // Only a plain en-route update needs a name and an ETA — without them
        // that card has nothing to say.
        //
        // Every transition is held to a lower bar on purpose: "Your driver is
        // arriving now" and "Your driver has arrived" name nobody and quote no
        // ETA, yet they are the most important messages in the stream — one
        // tells the user to look up, the other takes the card off the glasses.
        // Requiring a name here used to drop both. The display merges these
        // onto the ride already on screen, so the driver details survive.
        if status == .enroute {
            guard !driverName.isEmpty, etaMinutes > 0 else {
                print("⚠️ Failed to parse notification: en-route ride missing name or ETA")
                print("   Title: \(title)")
                print("   Body: \(body)")
                return nil
            }
        }

        return RideData(
            status: status,
            driverName: driverName,
            driverRating: driverRating,
            vehicleMake: vehicleInfo.make,
            vehicleModel: vehicleInfo.model,
            vehicleColor: vehicleInfo.color,
            licensePlate: licensePlate,
            etaMinutes: etaMinutes,
            timestamp: Date()
        )
    }

    /// Classify the ride's lifecycle stage from the notification wording.
    ///
    /// Checked most-terminal-first: a cancellation mentioning an ETA is still a
    /// cancellation.
    static func extractStatus(from text: String) -> RideStatus {
        let haystack = text.lowercased()

        let cancelled = ["cancelled", "canceled", "trip was called off"]
        let completed = ["trip is complete", "trip complete", "trip completed",
                         "you've arrived", "you have arrived", "thanks for riding",
                         "rate your trip", "rate your driver", "trip receipt",
                         "how was your trip", "trip summary"]
        let arrived = ["has arrived", "is here", "is waiting", "arrived at",
                       "your driver is outside", "meet your driver outside"]
        let arriving = ["is arriving now", "arriving now", "is pulling up",
                        "pulling up", "is almost there"]

        if cancelled.contains(where: haystack.contains) { return .cancelled }
        if completed.contains(where: haystack.contains) { return .completed }
        if arrived.contains(where: haystack.contains) { return .arrived }
        if arriving.contains(where: haystack.contains) { return .arriving }
        return .enroute
    }

    // MARK: - Extraction Methods

    /// Extract driver name from notification text.
    ///
    /// Patterns are ordered most-specific first: an explicit "Driver X" label
    /// beats a name sitting next to a rating, which beats a bare "X is ...".
    /// Every candidate is filtered through `nameStopwords` so boilerplate like
    /// "Your Uber" never wins.
    static func extractDriverName(from text: String) -> String {
        let patterns = [
            // "Your driver John D." / "Driver Sarah M."
            "(?:[Yy]our\\s+driver|[Dd]river)\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]*\\.?)?)",
            // "Meet Priya at the pickup point"
            "\\b[Mm]eet\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]*\\.?)?)",
            // "John D. (4.9★)" — name immediately before a rating
            "([A-Z][a-z]+(?:\\s+[A-Z][a-z]*\\.?)?)\\s*\\(\\s*[0-9]\\.[0-9]",
            // "John is 3 mins away" / "Sarah has arrived"
            "([A-Z][a-z]+(?:\\s+[A-Z][a-z]*\\.?)?)\\s+(?:is|has|will)\\b",
            // "John arriving in a Silver Toyota"
            "([A-Z][a-z]+(?:\\s+[A-Z][a-z]*\\.?)?)\\s+(?:arriving|approaching)\\b",
        ]

        for pattern in patterns {
            for candidate in allCaptures(of: pattern, in: text) {
                // Strip leading boilerplate rather than rejecting the whole
                // candidate: the two-token pattern greedily matches "Uber John"
                // in "Uber John is pulling up", and discarding it outright
                // would lose "John" — the regex has already consumed it, so no
                // later match gets another look.
                let name = strippingLeadingStopwords(candidate)
                guard !name.isEmpty else { continue }
                return name
            }
        }

        return ""
    }

    /// Drop leading stopword tokens ("Uber John" → "John"); empty when nothing
    /// name-like survives ("Your Uber" → "").
    private static func strippingLeadingStopwords(_ candidate: String) -> String {
        var tokens = candidate
            .trimmingCharacters(in: .whitespaces)
            .split(separator: " ")
            .map(String.init)

        while let first = tokens.first, nameStopwords.contains(first.lowercased()) {
            tokens.removeFirst()
        }

        return tokens.joined(separator: " ")
    }

    /// Extract driver rating from notification text.
    /// Examples: "4.9★", "(4.9)", "4.9 stars"
    static func extractDriverRating(from text: String) -> Double {
        let patterns = [
            "([0-9]\\.[0-9]{1,2})\\s*★",         // "4.9★"
            "\\(\\s*([0-9]\\.[0-9]{1,2})\\s*★?\\s*\\)", // "(4.9)" or "(4.9★)"
            "([0-9]\\.[0-9]{1,2})\\s*stars?",    // "4.9 stars"
            "rated\\s+([0-9]\\.[0-9]{1,2})",     // "rated 4.9"
        ]

        for pattern in patterns {
            for candidate in allCaptures(of: pattern, in: text, caseInsensitive: true) {
                if let rating = Double(candidate), (0.0...5.0).contains(rating) {
                    return rating
                }
            }
        }

        return 0.0
    }

    /// Extract vehicle colour, make and model from notification text.
    ///
    /// Tries a known-make lookup first ("… Silver **Toyota** Prius …"), then
    /// falls back to the positional "in a <Color> <Make> <Model>" shape so
    /// makes outside `knownMakes` still resolve.
    static func extractVehicleInfo(from text: String) -> (make: String, model: String, color: String) {
        // 1. Known make followed by a model token.
        for makeName in knownMakes {
            let escaped = NSRegularExpression.escapedPattern(for: makeName)
            let pattern = "\\b(\(escaped))\\b(?:\\s+([A-Za-z][A-Za-z0-9-]*(?:\\s+[0-9][A-Za-z0-9-]*)?))?"

            guard let match = firstMatch(of: pattern, in: text, caseInsensitive: true) else { continue }

            let make = capture(match, at: 1, in: text) ?? makeName
            let model = capture(match, at: 2, in: text) ?? ""
            let color = extractColor(from: text, precedingIndexOf: match.range.location)

            // Guard against "Toyota" being followed by a sentence word.
            let cleanedModel = isStopword(model) ? "" : model
            return (make: make, model: cleanedModel, color: color)
        }

        // 2. Positional fallback: "in a Blue Ferrari Roma".
        let colorAlternation = knownColors.joined(separator: "|")
        let fallback = "\\b(?:in|driving|drives)\\s+(?:a|an|the)\\s+(?:(\(colorAlternation))\\s+)?([A-Z][A-Za-z0-9-]*)\\s+([A-Za-z0-9][A-Za-z0-9-]*)"

        if let match = firstMatch(of: fallback, in: text, caseInsensitive: true) {
            let color = capture(match, at: 1, in: text).map(normalizedColor) ?? ""
            let make = capture(match, at: 2, in: text) ?? ""
            let model = capture(match, at: 3, in: text) ?? ""
            if !isStopword(make) {
                return (make: make, model: isStopword(model) ? "" : model, color: color)
            }
        }

        return (make: "", model: "", color: extractColor(from: text, precedingIndexOf: nil))
    }

    /// Extract licence plate from notification text.
    /// Examples: "(ABC123)", "[ABC123]", "plate ABC123"
    static func extractLicensePlate(from text: String) -> String {
        let patterns = [
            "\\(([A-Z0-9][A-Z0-9\\- ]{1,8})\\)",        // "(ABC123)"
            "\\[([A-Z0-9][A-Z0-9\\- ]{1,8})\\]",        // "[ABC123]"
            "(?:plate|licen[cs]e plate)\\s*:?\\s*([A-Z0-9][A-Z0-9\\-]{1,8})", // "plate ABC123"
        ]

        for pattern in patterns {
            for candidate in allCaptures(of: pattern, in: text) {
                let plate = candidate.trimmingCharacters(in: .whitespaces)
                // Plates carry at least one letter — this is what keeps a bare
                // "(2026)" or a rating out of the plate field.
                guard plate.rangeOfCharacter(from: .uppercaseLetters) != nil else { continue }
                return plate
            }
        }

        return ""
    }

    /// Extract ETA in minutes from notification text.
    /// Examples: "3 mins away", "5 minutes", "arriving in 10 mins"
    static func extractETA(from text: String) -> Int {
        let patterns = [
            "(\\d{1,3})\\s*(?:mins?|minutes?)\\b",         // "3 mins" / "5 minutes"
            "in\\s+(\\d{1,3})\\s*(?:mins?|minutes?)\\b",   // "in 3 mins"
            "(\\d{1,3})\\s*m\\b",                          // "3m"
        ]

        for pattern in patterns {
            for candidate in allCaptures(of: pattern, in: text, caseInsensitive: true) {
                if let minutes = Int(candidate), minutes > 0, minutes < 600 {
                    return minutes
                }
            }
        }

        return 0
    }

    // MARK: - Helpers

    /// Find a colour word, preferring the one immediately before the vehicle make.
    private static func extractColor(from text: String, precedingIndexOf makeLocation: Int?) -> String {
        var best: (location: Int, color: String)?

        for colorName in knownColors {
            let pattern = "\\b\(NSRegularExpression.escapedPattern(for: colorName))\\b"
            guard let match = firstMatch(of: pattern, in: text, caseInsensitive: true) else { continue }

            if let makeLocation {
                // Only accept a colour that sits before the make.
                guard match.range.location < makeLocation else { continue }
            }

            if best == nil || match.range.location > best!.location {
                best = (match.range.location, normalizedColor(colorName))
            }
        }

        return best?.color ?? ""
    }

    private static func normalizedColor(_ raw: String) -> String {
        knownColors.first { $0.caseInsensitiveCompare(raw) == .orderedSame } ?? raw.capitalized
    }

    private static func isStopword(_ word: String) -> Bool {
        let normalized = word.trimmingCharacters(in: .whitespaces).lowercased()
        guard !normalized.isEmpty else { return true }
        // Reject if the whole phrase or its leading token is boilerplate.
        if nameStopwords.contains(normalized) { return true }
        if let firstToken = normalized.split(separator: " ").first {
            return nameStopwords.contains(String(firstToken))
        }
        return false
    }

    private static func firstMatch(
        of pattern: String,
        in text: String,
        caseInsensitive: Bool = false
    ) -> NSTextCheckingResult? {
        let options: NSRegularExpression.Options = caseInsensitive ? [.caseInsensitive] : []
        guard let regex = try? NSRegularExpression(pattern: pattern, options: options) else { return nil }
        return regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text))
    }

    /// All group-1 captures for `pattern`, in document order.
    private static func allCaptures(
        of pattern: String,
        in text: String,
        caseInsensitive: Bool = false
    ) -> [String] {
        let options: NSRegularExpression.Options = caseInsensitive ? [.caseInsensitive] : []
        guard let regex = try? NSRegularExpression(pattern: pattern, options: options) else { return [] }

        return regex
            .matches(in: text, range: NSRange(text.startIndex..., in: text))
            .compactMap { capture($0, at: 1, in: text) }
    }

    private static func capture(_ match: NSTextCheckingResult, at index: Int, in text: String) -> String? {
        guard index < match.numberOfRanges,
              let range = Range(match.range(at: index), in: text) else { return nil }
        let value = String(text[range]).trimmingCharacters(in: .whitespaces)
        return value.isEmpty ? nil : value
    }
}
