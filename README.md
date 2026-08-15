# Even Uber

Real-time ride tracking on Even Reality G2 AR glasses. See your Uber driver approaching in augmented reality—driver info, vehicle details, live ETA, and location tracking—all without looking at your phone.

## Architecture

**Notification Interceptor + Even Hub Display Pipeline**

```
[Official Uber App]
        ↓ (iOS Notification)
[iOS Companion App]
        ↓ (Parse: Driver, ETA, Car)
[Even Hub Web App (on phone)]
        ↓ (Bluetooth LE via Even Hub SDK)
[G2 Smart Glasses HUD]
        ↓
[576x288 Green Micro-LED Display]
```

## Phase 1 (Current MVP)

- ✅ **iOS Companion App** (Swift): Intercepts Uber notifications, parses data
- ✅ **Even Hub Display** (React + TypeScript): Renders driver card, ETA, location to G2
- ✅ **Real-time Data**: Driver name, rating, vehicle info, license plate, ETA
- ✅ **Location Tracking**: Driver position vs. requester (GPS) on interactive map
- ✅ **Monochrome Display**: Optimized for 576x288 green micro-LED per eye

## Phase 2 (Future)

- Voice-triggered ride requests from AR interface
- Driver chat/communication
- Trip history and receipts

## Project Status

- **Kickoff**: August 2026
- **Architecture**: iOS Companion (Swift) + Even Hub Display (React/TypeScript)
- **Hardware**: Even Reality G2 (Bluetooth 5.2 + Dual 576x288 Micro-LED)
- **Related**: [Outlook for G2](../EvenOutlook/), [Argus](../Argus/)

## Project Structure

```
ios-companion/          # Swift iOS app for notification interception
even-hub-display/       # React/TypeScript web app for G2 display
```

## Getting Started

1. **[iOS Companion Setup](ios-companion/README.md)** — Build and deploy the Swift app
2. **[Even Hub Display Setup](even-hub-display/README.md)** — Run the web app locally
3. **[BUILD_SPEC.md](BUILD_SPEC.md)** — Full requirements and acceptance criteria

## Tech Stack

| Component | Technology |
|-----------|------------|
| Notification Listener | Swift (native iOS) |
| Data Parsing | Swift regex + text extraction |
| Display Rendering | React 18 + TypeScript + Vite |
| G2 Communication | Even Hub SDK (@evenrealities/even_hub_sdk) |
| Display Output | HTML/CSS → 576x288 monochrome green |
| State Management | React Hooks |
| Maps/Location | Lightweight map component (TBD) |

## Key Features

🎯 **Real-time Notifications** — Parsed from official Uber app  
🗺️ **Location Mapping** — Driver vs. requester position  
⏱️ **Live ETA** — Updated as driver approaches  
👤 **Driver Profile** — Name, rating, vehicle details  
📱 **Phone-to-Glasses** — Seamless Bluetooth LE sync  
🟢 **Green Monochrome Display** — Optimized for micro-LED
