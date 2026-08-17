# Even Uber iOS Companion App

Swift app that parses Uber ride notifications and relays the structured data to
the Even Hub display app, which renders it on G2 glasses.

> ⚠️ **Before you build on this:** iOS does not let one app read another app's
> notifications, so this cannot observe the official Uber app. The parser,
> relay and display all work — only that first hop is blocked. See
> **[NOTIFICATION_ACCESS.md](NOTIFICATION_ACCESS.md)** for the details and the
> integration paths that *are* open.

## Requirements

- iOS 16.0+
- Xcode 15+ / Swift 5.9+

## Quick start

```bash
cd ios-companion
open EvenUberCompanion.xcodeproj
```

Set your signing team, then ⌘R. Full instructions, including connecting to the
display app and pushing test notifications, are in
**[XCODE_SETUP.md](XCODE_SETUP.md)**.

## Project structure

```
ios-companion/
├── project.yml                          # XcodeGen spec — source of truth
├── EvenUberCompanion.xcodeproj          # Generated, committed
├── EvenUberCompanion/
│   ├── App/
│   │   ├── EvenUberCompanionApp.swift   # SwiftUI entry point
│   │   └── AppDelegate.swift            # Startup wiring
│   ├── Models/
│   │   └── RideData.swift               # Codable model, mirrors the React model
│   ├── Notification/
│   │   ├── UberNotificationListener.swift  # UNUserNotificationCenterDelegate
│   │   └── NotificationParser.swift        # Text → RideData
│   ├── Location/
│   │   └── LocationProvider.swift       # CoreLocation → requester coordinates
│   ├── Network/
│   │   └── EvenHubClient.swift          # HTTP POST to the display app
│   ├── Permissions/
│   │   └── NotificationPermissions.swift
│   ├── UI/
│   │   ├── ContentView.swift
│   │   ├── StatusView.swift
│   │   └── SettingsView.swift
│   ├── Resources/Assets.xcassets
│   └── Info.plist                       # Generated from project.yml
└── EvenUberCompanionTests/
    └── NotificationParserTests.swift
```

## How the pieces fit

```
notification text
      ↓  NotificationParser.parse(title:body:)
   RideData?
      ↓  .withRequesterLocation(...)   ← LocationProvider (CoreLocation)
   RideData
      ↓  EvenHubClient.send(_:completion:)
POST http://127.0.0.1:3000/api/ride-update
      ↓
Even Hub display app → G2 glasses
```

### LocationProvider

Notification text contains no coordinates, so the map would have nothing to
anchor on. `LocationProvider` supplies the *requester's* position from
CoreLocation, and the listener attaches it to every parsed ride.

The **driver's** position still cannot come from a notification. The display
handles that honestly: with your position alone it draws you at the centre plus
a range ring derived from the ETA, labelled as an estimate. It does not invent a
driver pin. Real driver coordinates only arrive via the Uber API path in
`src/backend/`.

Accuracy is set to 100 m with a 50 m distance filter, which lets iOS use
wifi/cell positioning rather than waking the GPS chip — enough to place a
pickup pin while staying inside the project's battery target.

### NotificationParser

Pure text-in, model-out. Every field is extracted independently and degrades to
an empty value rather than failing the whole parse; a result is only rejected
when there's no driver name or no ETA, since a card without those has nothing
to show.

The two entry points:

```swift
NotificationParser.parse(_ content: UNNotificationContent) -> RideData?
NotificationParser.parse(title: String, body: String) -> RideData?
```

The second exists so the extraction logic is testable without constructing
notification objects.

Recognised shapes include:

| Notification text | Parsed |
|---|---|
| `John D. (4.9★) is 3 mins away in a Silver Toyota Prius (ABC123)` | John D. · 4.9 · Silver Toyota Prius · ABC123 · 3 min |
| `Driver Sarah M. (4.8★) arriving in 6 minutes in a Silver Honda Civic` | Sarah M. · 4.8 · Silver Honda Civic · 6 min |
| `Meet Priya at the pickup point. She is 12 minutes away in a Black Tesla Model 3 (7XYZ123)` | Priya · Black Tesla Model 3 · 7XYZ123 · 12 min |

Vehicle makes outside the known-makes list fall back to positional extraction
(`in a <Colour> <Make> <Model>`), so unusual cars still resolve.

### EvenHubClient

Posts `RideData` as ISO-8601 JSON. The base URL defaults to
`http://127.0.0.1:3000` and can be redirected at a Mac on the LAN:

```swift
EvenHubClient.shared.setBaseURL("http://192.168.1.42:3000")
```

The setting persists in `UserDefaults` and is shown in the app's Settings
screen.

### UberNotificationListener

An `ObservableObject` publishing `lastRide`, `lastError` and `isConnected`,
which the SwiftUI views observe directly.

## Testing

```bash
cd ios-companion
xcodebuild test -project EvenUberCompanion.xcodeproj -scheme EvenUberCompanion \
  -destination 'platform=iOS Simulator,name=iPhone 16'
```

`NotificationParserTests` covers each supported format, the ETA and rating
variants, graceful degradation when fields are missing, and rejection of
non-ride notifications (receipts, promos, Uber Eats).

When a real Uber notification parses badly: log the text, add it as a fixture,
then adjust the patterns until the test passes.

## Privacy

- No Uber credentials are stored or handled
- Ride data is sent only to the configured Even Hub address (localhost/LAN by
  default) — nothing leaves the local network
- Notifications are not cached or persisted
- Notification permission is explicit and revocable

## Limitations

- **Cannot read the Uber app's notifications** — see
  [NOTIFICATION_ACCESS.md](NOTIFICATION_ACCESS.md)
- Text parsing breaks if Uber rewords its notifications; the API route in
  `src/backend/` does not have this problem
- iOS only
