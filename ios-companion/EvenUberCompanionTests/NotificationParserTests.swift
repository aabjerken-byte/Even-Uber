import XCTest
import UserNotifications
@testable import EvenUberCompanion

/// Fixtures covering the Uber notification formats the parser is expected to handle.
private struct Fixture {
    let title: String
    let body: String
    let name: String
    let rating: Double
    let color: String
    let make: String
    let model: String
    let plate: String
    let eta: Int
}

final class NotificationParserTests: XCTestCase {

    private let fixtures: [Fixture] = [
        Fixture(title: "Your Uber is arriving",
                body: "John D. (4.9★) is 3 mins away in a Silver Toyota Prius (ABC123)",
                name: "John D.", rating: 4.9, color: "Silver",
                make: "Toyota", model: "Prius", plate: "ABC123", eta: 3),

        Fixture(title: "Uber",
                body: "Driver Sarah M. (4.8★) arriving in 6 minutes in a Silver Honda Civic",
                name: "Sarah M.", rating: 4.8, color: "Silver",
                make: "Honda", model: "Civic", plate: "", eta: 6),

        Fixture(title: "Your driver is on the way",
                body: "Your driver John D. in a Blue Ford Focus (XYZ789) will arrive in 7 mins",
                name: "John D.", rating: 0.0, color: "Blue",
                make: "Ford", model: "Focus", plate: "XYZ789", eta: 7),

        Fixture(title: "Your Uber is arriving",
                body: "John is 3 mins away in a White Toyota Prius (ABC123)",
                name: "John", rating: 0.0, color: "White",
                make: "Toyota", model: "Prius", plate: "ABC123", eta: 3),

        Fixture(title: "Uber",
                body: "Meet Priya at the pickup point. She is 12 minutes away in a Black Tesla Model 3 (7XYZ123)",
                name: "Priya", rating: 0.0, color: "Black",
                make: "Tesla", model: "Model 3", plate: "7XYZ123", eta: 12),

        Fixture(title: "Your ride is confirmed",
                body: "Marcus (4.95★) is driving a Red Ferrari Roma and is 4 mins away",
                name: "Marcus", rating: 4.95, color: "Red",
                make: "Ferrari", model: "Roma", plate: "", eta: 4),
    ]

    // MARK: - Field extraction

    func testExtractsEveryFieldAcrossKnownFormats() {
        for fixture in fixtures {
            let text = "\(fixture.title) \(fixture.body)"
            let context = "body: \(fixture.body)"

            XCTAssertEqual(NotificationParser.extractDriverName(from: text), fixture.name, context)
            XCTAssertEqual(NotificationParser.extractDriverRating(from: text), fixture.rating, accuracy: 0.001, context)
            XCTAssertEqual(NotificationParser.extractLicensePlate(from: text), fixture.plate, context)
            XCTAssertEqual(NotificationParser.extractETA(from: text), fixture.eta, context)

            let vehicle = NotificationParser.extractVehicleInfo(from: text)
            XCTAssertEqual(vehicle.color, fixture.color, context)
            XCTAssertEqual(vehicle.make, fixture.make, context)
            XCTAssertEqual(vehicle.model, fixture.model, context)
        }
    }

    func testParseProducesRideDataForEveryKnownFormat() throws {
        for fixture in fixtures {
            let ride = try XCTUnwrap(
                NotificationParser.parse(title: fixture.title, body: fixture.body),
                "expected a parse for: \(fixture.body)"
            )
            XCTAssertEqual(ride.driverName, fixture.name)
            XCTAssertEqual(ride.etaMinutes, fixture.eta)
            XCTAssertEqual(ride.vehicleMake, fixture.make)
        }
    }

    // MARK: - Boilerplate rejection
    //
    // These are the regressions that motivated the rewrite: the original
    // patterns returned "Your Uber" as a driver name and never populated
    // the vehicle make or model.

    func testDoesNotTreatBoilerplateAsDriverName() {
        let text = "Your Uber is arriving John D. (4.9★) is 3 mins away"
        XCTAssertEqual(NotificationParser.extractDriverName(from: text), "John D.")
        XCTAssertNotEqual(NotificationParser.extractDriverName(from: text), "Your Uber")
    }

    func testDoesNotTreatPronounAsDriverName() {
        let text = "Uber Meet Priya at the pickup point. She is 12 minutes away"
        XCTAssertEqual(NotificationParser.extractDriverName(from: text), "Priya")
    }

    func testExtractsVehicleMakeAndModelRatherThanLeadingWords() {
        let text = "Your Uber is arriving John D. is 3 mins away in a Silver Toyota Prius"
        let vehicle = NotificationParser.extractVehicleInfo(from: text)
        XCTAssertEqual(vehicle.make, "Toyota")
        XCTAssertEqual(vehicle.model, "Prius")
        XCTAssertEqual(vehicle.color, "Silver")
    }

    func testRatingIsNotMistakenForLicensePlate() {
        let text = "John D. (4.9★) is 3 mins away"
        XCTAssertEqual(NotificationParser.extractLicensePlate(from: text), "")
    }

    func testRejectsNonRideNotifications() {
        let nonRides = [
            ("Promo", "50% off your next 3 rides this week"),
            ("Uber Eats", "Your order is being prepared"),
            ("Uber", "Your driver is on the way"),
        ]

        for (title, body) in nonRides {
            XCTAssertNil(
                NotificationParser.parse(title: title, body: body),
                "should not have parsed a ride from: \(body)"
            )
        }
    }

    /// Post-trip notices are not junk — they're the signal that the ride ended,
    /// and the display uses them to take the card off the glasses.
    ///
    /// They carry no driver and no ETA, so they only ever act as a transition:
    /// the server drops a terminal update that arrives with no ride in progress,
    /// which is what stops a stray receipt raising a blank card.
    func testPostTripNoticesAreTerminalSignals() throws {
        let postTrip = [
            "Your trip receipt is ready. Total $24.50",
            "Rate your trip with your driver",
            "Your trip is complete",
        ]

        for body in postTrip {
            let ride = try XCTUnwrap(
                NotificationParser.parse(title: "Uber", body: body),
                "expected a terminal signal from: \(body)"
            )
            XCTAssertEqual(ride.status, .completed, body)
        }
    }

    func testMissingEtaIsRejected() {
        XCTAssertNil(NotificationParser.parse(
            title: "Uber",
            body: "Your driver John D. is in a Silver Toyota Prius (ABC123)"
        ))
    }

    func testMissingFieldsDegradeGracefully() throws {
        // Only a name and an ETA — everything else should come back empty
        // rather than failing the parse.
        let ride = try XCTUnwrap(NotificationParser.parse(
            title: "Uber",
            body: "Your driver Alex is 5 mins away"
        ))
        XCTAssertEqual(ride.driverName, "Alex")
        XCTAssertEqual(ride.etaMinutes, 5)
        XCTAssertEqual(ride.vehicleMake, "")
        XCTAssertEqual(ride.licensePlate, "")
        XCTAssertEqual(ride.driverRating, 0.0)
    }

    // MARK: - UNNotificationContent bridge

    func testParsesFromNotificationContent() throws {
        let content = UNMutableNotificationContent()
        content.title = "Your Uber is arriving"
        content.body = "John D. (4.9★) is 3 mins away in a Silver Toyota Prius (ABC123)"
        content.threadIdentifier = "uber.ride"

        let ride = try XCTUnwrap(NotificationParser.parse(content))
        XCTAssertEqual(ride.driverName, "John D.")
        XCTAssertEqual(ride.etaMinutes, 3)
        XCTAssertEqual(ride.licensePlate, "ABC123")
    }

    // MARK: - ETA variants

    func testEtaFormatVariants() {
        let expectations: [(String, Int)] = [
            ("3 mins away", 3),
            ("5 minutes away", 5),
            ("arriving in 10 mins", 10),
            ("1 min away", 1),
            ("arriving in 15 MINUTES", 15),
        ]

        for (text, expected) in expectations {
            XCTAssertEqual(NotificationParser.extractETA(from: text), expected, text)
        }
    }

    func testEtaAbsentReturnsZero() {
        XCTAssertEqual(NotificationParser.extractETA(from: "Your driver has arrived"), 0)
    }

    // MARK: - Ride lifecycle

    func testClassifiesLifecycleStatus() {
        let expectations: [(String, RideStatus)] = [
            ("John D. is 3 mins away in a Silver Toyota Prius", .enroute),
            ("Your driver is arriving now", .arriving),
            ("John is pulling up", .arriving),
            ("Your driver has arrived", .arrived),
            ("Sarah is here — meet at the pickup point", .arrived),
            ("Your driver is waiting outside", .arrived),
            ("Your trip is complete", .completed),
            ("Rate your trip with John", .completed),
            ("Your trip receipt is ready", .completed),
            ("Your ride was cancelled", .cancelled),
            ("Your trip has been canceled", .cancelled),
        ]

        for (text, expected) in expectations {
            XCTAssertEqual(NotificationParser.extractStatus(from: text), expected, text)
        }
    }

    func testCancellationWinsOverAnEta() {
        // A cancellation that still quotes an ETA is a cancellation.
        XCTAssertEqual(
            NotificationParser.extractStatus(from: "Your ride was cancelled — driver was 3 mins away"),
            .cancelled
        )
    }

    /// The regression this whole lifecycle change exists for: an arrival notice
    /// names nobody and quotes no ETA, and the old guard dropped it — leaving a
    /// stale "3 MIN" on the glasses for a driver already at the kerb.
    func testBareArrivalNoticeIsAccepted() throws {
        let ride = try XCTUnwrap(NotificationParser.parse(
            title: "Uber",
            body: "Your driver has arrived"
        ))
        XCTAssertEqual(ride.status, .arrived)
        XCTAssertEqual(ride.etaMinutes, 0)
    }

    /// Same class of message as the arrival notice: "arriving now" is the
    /// signal to look up for the car, and it names nobody and quotes no ETA.
    /// The first fix covered arrived/completed/cancelled but still dropped
    /// this one — caught in review, pinned here.
    func testBareArrivingNoticeIsAccepted() throws {
        let ride = try XCTUnwrap(NotificationParser.parse(
            title: "Uber",
            body: "Your driver is arriving now"
        ))
        XCTAssertEqual(ride.status, .arriving)
    }

    func testArrivingWithNameButNoEtaIsAccepted() throws {
        let ride = try XCTUnwrap(NotificationParser.parse(
            title: "Uber",
            body: "John is pulling up"
        ))
        XCTAssertEqual(ride.status, .arriving)
        XCTAssertEqual(ride.driverName, "John")
    }

    func testCancellationWithoutDriverNameIsAccepted() throws {
        let ride = try XCTUnwrap(NotificationParser.parse(
            title: "Uber",
            body: "Your ride was cancelled"
        ))
        XCTAssertEqual(ride.status, .cancelled)
    }

    func testEnRouteRideStillRequiresNameAndEta() {
        // Terminal updates get a lower bar; en-route ones must not.
        XCTAssertNil(NotificationParser.parse(title: "Uber", body: "Your driver is on the way"))
        XCTAssertNil(NotificationParser.parse(
            title: "Uber",
            body: "Your driver John D. is in a Silver Toyota Prius (ABC123)"
        ))
    }

    func testStatusSurvivesEncoding() throws {
        let ride = try XCTUnwrap(NotificationParser.parse(
            title: "Uber",
            body: "Your driver has arrived"
        ))

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let json = try XCTUnwrap(String(data: try encoder.encode(ride), encoding: .utf8))

        // The React model keys off this exact string.
        XCTAssertTrue(json.contains("\"status\":\"arrived\""), json)
    }

    func testDefaultStatusIsEnroute() throws {
        let ride = try XCTUnwrap(NotificationParser.parse(
            title: "Your Uber is arriving",
            body: "John D. (4.9★) is 3 mins away in a Silver Toyota Prius (ABC123)"
        ))
        XCTAssertEqual(ride.status, .enroute)
    }

    // MARK: - Rating variants

    func testRatingFormatVariants() {
        XCTAssertEqual(NotificationParser.extractDriverRating(from: "John (4.9★)"), 4.9, accuracy: 0.001)
        XCTAssertEqual(NotificationParser.extractDriverRating(from: "John 4.85 stars"), 4.85, accuracy: 0.001)
        XCTAssertEqual(NotificationParser.extractDriverRating(from: "rated 5.0"), 5.0, accuracy: 0.001)
        XCTAssertEqual(NotificationParser.extractDriverRating(from: "no rating here"), 0.0, accuracy: 0.001)
    }
}
