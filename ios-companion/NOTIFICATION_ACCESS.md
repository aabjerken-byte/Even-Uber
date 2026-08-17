# Notification Access: What iOS Actually Allows

**Read this before spending more time on the notification-interception design.**

The architecture in the root `README.md` assumes the companion app can read
notifications posted by the official Uber app. On iOS it cannot. This document
explains why, what the current code *does* do, and which paths are actually
open.

---

## The constraint

`UNUserNotificationCenterDelegate` — the protocol `UberNotificationListener`
implements — only receives notifications that **belong to the app implementing
it**. Specifically:

- `willPresent:` fires for notifications *your app* posts locally, or remote
  pushes sent to *your app's* bundle ID while it is in the foreground.
- `didReceive:` fires when the user interacts with one of *your app's*
  notifications.

There is no public iOS API that lets one app enumerate, observe, or read
another app's notifications. This is a deliberate sandbox boundary, not a
missing entitlement or a permission the user can grant. The
`NSUserNotificationUsageDescription` key in `Info.plist` does not unlock it
(that key isn't a real iOS permission gate at all — it's carried over from
macOS-era guidance and is harmless but inert).

Things that are commonly assumed to be a way around this, and are not:

| Approach | Why it doesn't work |
|---|---|
| Notification Service Extension | Only intercepts remote pushes addressed to **your own** bundle ID, before display. Uber's pushes go to Uber's app. |
| Notification Content Extension | Same scope — custom UI for your own notifications. |
| Push Notifications capability | Lets your app *receive* pushes. Doesn't grant visibility into other apps. |
| "Read notifications" permission | Doesn't exist on iOS. You may be thinking of Android's `NotificationListenerService`, which has no iOS equivalent. |
| Focus / Announce Notifications | System features; no third-party data access. |

Android *does* expose `NotificationListenerService`, which is why this design
pattern is common in Android tutorials. It does not port.

---

## What the current code does do

The listener and parser are both real and working — they're just not fed by
Uber:

- `NotificationParser` correctly extracts driver, rating, vehicle, plate and
  ETA from Uber-style notification text. It's covered by
  `EvenUberCompanionTests/NotificationParserTests.swift`.
- `UberNotificationListener` will parse and relay **any** matching notification
  delivered to this app, including local notifications you schedule yourself.
- `EvenHubClient` posts the parsed `RideData` to the Even Hub display app.

So the pipeline from *notification text → parsed ride → display on G2* is
complete and testable end to end. Only the first hop — getting Uber's text into
this app — is blocked.

You can exercise the whole chain today by scheduling a local notification:

```swift
let content = UNMutableNotificationContent()
content.title = "Your Uber is arriving"
content.body = "John D. (4.9★) is 3 mins away in a Silver Toyota Prius (ABC123)"
content.threadIdentifier = "uber.ride"

UNUserNotificationCenter.current().add(
    UNNotificationRequest(
        identifier: UUID().uuidString,
        content: content,
        trigger: UNTimeIntervalNotificationTrigger(timeInterval: 2, repeats: false)
    )
)
```

---

## Paths that are actually open

### 1. The Uber API (recommended)

`src/backend/` already scaffolds this: an ASP.NET Core service doing JWT
client-credentials OAuth against Uber, with `UberRideService` fetching ride
details. This is the supported, durable route — structured data instead of
regex over marketing copy, and it doesn't break when Uber rewords a push.

The catch is access: ride-level scopes on Uber's API are gated behind developer
application and approval, and what's available to a given app depends on that
approval. Confirm what your account can actually read **before** building
further on this branch.

If this path works out, the iOS companion app's role shrinks considerably — the
backend can drive the Even Hub display directly, and the phone app becomes
optional.

### 2. Shortcuts automation

iOS Shortcuts can trigger a "When I get a notification from Uber" personal
automation. What a shortcut can extract from that notification is limited, and
it generally needs to be run manually or with "Ask Before Running" disabled per
automation. Fragile, but it's user-space and requires no special entitlement.

### 3. Manual entry / testing hooks

Fine for demos and for validating the G2 display, which is where a lot of this
project's value already is.

### Not viable

- Screen scraping via Accessibility APIs — no third-party access on iOS, and
  not App Store distributable.
- Jailbreak or MDM-supervised device tricks — off the table for a normal user.

---

## Recommendation

Treat the notification path as a **demo and test harness**, not the production
data source, and make the Uber API in `src/backend/` the real integration. The
parser and display work already done are not wasted — they're the back half of
either design.
