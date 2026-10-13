# Even Uber Companion — Xcode Setup

The Xcode project now exists and is committed. You no longer need to create one
by hand — open it and build.

## Prerequisites

- **macOS 13+**
- **Xcode 15+** ([Mac App Store](https://apps.apple.com/us/app/xcode/id497799835))
- **Apple ID** (a free one is enough to run on your own device)
- **iOS 16+** device or simulator

After installing Xcode, point the command line tools at it and accept the
licence — otherwise `xcodebuild` and `swiftc` refuse to run:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

## 1. Open the project

```bash
cd ios-companion
open EvenUberCompanion.xcodeproj
```

## 2. Set your signing team

Simulator builds need no signing. To run on a physical device:

1. Select the **EvenUberCompanion** target → **Signing & Capabilities**
2. Under **Team**, pick your Apple ID (**Add an Account…** if the list is empty)
3. Change the **Bundle Identifier** from `com.evenuber.companion` to something
   unique to you, e.g. `com.yourname.evenubercompanion` — free accounts can't
   claim an identifier someone else has registered

No team is committed to the project, so this is the one field you must set.

## 3. Build and run

| Action | Shortcut |
|---|---|
| Build | ⌘B |
| Run | ⌘R |
| Test | ⌘U |

Or from the command line:

```bash
cd ios-companion
xcodebuild build -project EvenUberCompanion.xcodeproj -scheme EvenUberCompanion \
  -destination 'platform=iOS Simulator,name=iPhone 16'
```

```bash
cd ios-companion
xcodebuild test -project EvenUberCompanion.xcodeproj -scheme EvenUberCompanion \
  -destination 'platform=iOS Simulator,name=iPhone 16'
```

## 4. Connect to the Even Hub display app

In a separate terminal:

```bash
cd even-hub-display
npm install
npm run dev
```

That serves the API on `http://127.0.0.1:3000` and the UI on
`http://127.0.0.1:5173`.

The companion app posts to `http://127.0.0.1:3000` by default. On the
**simulator**, that loopback address resolves to your Mac, so it connects with
no further setup. On a **physical device**, `127.0.0.1` is the phone itself —
point the client at your Mac's LAN address instead:

```swift
EvenHubClient.shared.setBaseURL("http://192.168.1.42:3000")
```

The value is persisted in `UserDefaults`, and the current setting is shown in
the app's **Settings** screen.

`Info.plist` already carries the App Transport Security exception
(`NSAllowsLocalNetworking`) and the `NSLocalNetworkUsageDescription` string
needed for cleartext HTTP to local addresses — iOS blocks those by default.

Tap the **Even Hub Connection** row in the app to re-check connectivity.

## 5. Testing the pipeline

⚠️ **The app cannot read the official Uber app's notifications.** iOS provides
no API for that. See **[NOTIFICATION_ACCESS.md](NOTIFICATION_ACCESS.md)** for
what this means and which integration paths are actually open.

To exercise the parse → relay → display chain, schedule a local notification
from the app or send one to the simulator:

```bash
cat > /tmp/uber.apns <<'EOF'
{
  "Simulator Target Bundle": "com.evenuber.companion",
  "aps": {
    "alert": {
      "title": "Your Uber is arriving",
      "body": "John D. (4.9★) is 3 mins away in a Silver Toyota Prius (ABC123)"
    },
    "thread-id": "uber.ride"
  }
}
EOF
xcrun simctl push booted com.evenuber.companion /tmp/uber.apns
```

You should see the parsed ride appear in the app and on the Even Hub display.

## Project layout

```
ios-companion/
├── project.yml                        # XcodeGen spec — source of truth
├── EvenUberCompanion.xcodeproj        # Generated, committed
├── EvenUberCompanion/
│   ├── App/         EvenUberCompanionApp.swift, AppDelegate.swift
│   ├── Models/      RideData.swift
│   ├── Notification/ UberNotificationListener.swift, NotificationParser.swift
│   ├── Network/     EvenHubClient.swift
│   ├── Permissions/ NotificationPermissions.swift
│   ├── UI/          ContentView.swift, StatusView.swift, SettingsView.swift
│   ├── Resources/   Assets.xcassets
│   └── Info.plist                     # Generated from project.yml
└── EvenUberCompanionTests/
    └── NotificationParserTests.swift
```

### Adding files

Adding a file in Xcode works normally. To keep `project.yml` authoritative,
regenerate afterwards:

```bash
brew install xcodegen
cd ios-companion && xcodegen generate
```

Anything under `EvenUberCompanion/` is picked up automatically — the spec globs
the directory rather than listing files.

## Push Notifications capability

Not enabled, and not needed: the app only uses *local* notification permission,
which requires no entitlement. Adding the Push Notifications capability would
introduce an `aps-environment` entitlement that free Apple accounts can't sign.

If you later need real remote pushes, add the capability in **Signing &
Capabilities** and mirror it in `project.yml`:

```yaml
    entitlements:
      path: EvenUberCompanion/EvenUberCompanion.entitlements
      properties:
        aps-environment: development
```

## Troubleshooting

**"Signing for EvenUberCompanion requires a development team"**
Set your team (step 2). Simulator-only builds can instead pass
`CODE_SIGNING_ALLOWED=NO`.

**"Failed to register bundle identifier"**
Someone else owns `com.evenuber.companion`. Change it to your own prefix.

**Connection shows red on a physical device**
`127.0.0.1` on the phone is the phone. Use your Mac's LAN IP (step 4), confirm
both are on the same network, and allow the connection when iOS prompts for
local network access.

**"You have not agreed to the Xcode license agreements"**
Run `sudo xcodebuild -license accept`.

**Regex not matching a real Uber notification**
Log the text (`print(content.body)`), add it as a fixture in
`NotificationParserTests.swift`, then adjust the patterns in
`NotificationParser.swift` until the test passes.

## Resources

- [UserNotifications framework](https://developer.apple.com/documentation/usernotifications)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen)
