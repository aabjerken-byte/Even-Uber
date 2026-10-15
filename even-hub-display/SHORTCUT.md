# Getting ride details from the Uber app

iOS doesn't let one app read another's screen or notifications, and Uber has
no API for personal apps without approval. So Even Uber gets real ride details
the way you would: by reading the Uber screen. An iOS Shortcut does the
reading; you double-tap the back of the phone to run it.

## One-time setup

### 1. Build the Shortcut

In the **Shortcuts** app, tap **+** and add these actions in order:

1. **Take Screenshot**
2. **Extract Text from Image** — input: the screenshot
3. **Copy to Clipboard** — input: the extracted text

Name it **Uber → Even**.

### 2. Put it on Back Tap

**Settings → Accessibility → Touch → Back Tap → Double Tap → Uber → Even**

## On a ride

1. With the **Uber app** showing your driver (or your trip), **double-tap the
   back of the phone**.
2. Open **Even Uber** and tap **📋 Paste from Uber**.
   - If the Even App blocks clipboard access, a box appears instead:
     long-press it, choose **Paste**, then **Use this text**.
3. The line under the button shows what was picked up, e.g.
   `Maria · ★4.95 · Blue Honda Civic · plate 7XYZ482 · 4 min to pickup`.

Do it once at pickup and once after you get in. On the trip screen it picks up
the destination and the minutes (or "Drop-off by 7:42 PM") left; the phone's
GPS keeps the distance live in between.

A screenshot of an Uber **notification** works too.

## What it recognises

| On the Uber screen | Becomes |
|---|---|
| `Meet at…`, `3 min`, `min away` | On the way, pickup ETA |
| `is arriving now`, `pulling up` | Arriving |
| `has arrived`, `is here` | Arrived |
| `Heading to…`, `Drop-off by 7:42 PM`, `Arrive by…` | On trip, ETA and destination |
| `Trip complete`, `Rate your trip` | Trip complete |
| A name above a `4.95` rating | Driver and rating |
| `Silver Toyota Prius` | Vehicle |
| A line like `8ABC123` | Plate |

The patterns are a best guess at Uber's wording. If something isn't picked up,
the screenshot text is the thing to tune `src/models/uberText.ts` against.
