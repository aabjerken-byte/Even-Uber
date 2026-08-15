# Even Uber – Build Specification (iOS + Even Hub)

## Phase 1: iOS Notification Interception + G2 Display

### 1.1 iOS Companion App (Swift)

**Purpose**: Run natively on iPhone, intercept Uber notifications, parse data, relay to G2.

**Requirements**:
- Target iOS 16.0+
- Request "Notification Access" permission (Settings → Notifications → Even Uber Companion)
- Intercept notifications from `com.ubercab` package
- Parse notification text for:
  - Driver name (e.g., "John D.")
  - Driver rating (e.g., "4.9★")
  - Vehicle type (e.g., "Toyota Prius")
  - License plate (e.g., "ABC123")
  - ETA in minutes (e.g., "3 mins away")
  - Car color (extracted from text)

**Implementation**:
```swift
// UberNotificationListener.swift
- Use UserNotificationCenter to observe incoming notifications
- Filter by com.ubercab source
- Parse notification.userInfo for title + body
- Regex extraction: Driver name, ETA, vehicle info
- Send to local Even Hub app via localhost socket/IPC
```

**Acceptance Criteria**:
- [ ] App runs on iOS 16+
- [ ] Notification permission requested and granted
- [ ] Captures Uber notifications in real-time (<100ms latency)
- [ ] Parses 90%+ of notification formats correctly
- [ ] Sends data to Even Hub web app (sub-500ms)
- [ ] No crashes on malformed notifications
- [ ] Battery impact < 2% per hour idle

---

### 1.2 Even Hub Display App (React + TypeScript)

**Purpose**: Run on phone, receive parsed data, render to G2 via Even Hub SDK.

**Requirements**:
- Built with React 18 + TypeScript + Vite
- Integrate @evenrealities/even_hub_sdk npm package
- Display components optimized for 576x288 monochrome green micro-LED
- Receive data from iOS companion app (local IPC)
- Render in real-time as notifications arrive

**Display Layout** (576x288 pixels per eye):
```
┌─────────────────────────────────┐
│  DRIVER CARD (Top)              │
│  John D. ⭐ 4.9 | Toyota Prius  │
│  License: ABC123                │
├─────────────────────────────────┤
│  ETA: 3 MINUTES AWAY            │
│  Now heading to your location   │
├─────────────────────────────────┤
│  [INTERACTIVE MAP]              │
│  🔴 You  →  🚗 Driver (0.5 mi)  │
└─────────────────────────────────┘
```

**Components**:
- `RideCard.tsx` — Driver name, rating, vehicle, plate
- `ETADisplay.tsx` — Estimated pickup time + status
- `LocationMap.tsx` — Driver vs. requester map (lightweight)
- `NotificationReceiver.tsx` — Listen for iOS app messages

**Data Model**:
```typescript
interface RideNotification {
  driverName: string;
  driverRating: number;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  licensePlate: string;
  etaMinutes: number;
  driverLatitude: number;
  driverLongitude: number;
  requesterLatitude: number;
  requesterLongitude: number;
  timestamp: Date;
}
```

**Acceptance Criteria**:
- [ ] App starts and connects to Even Hub SDK
- [ ] Receives data from iOS companion app
- [ ] Renders within 300ms of data arrival
- [ ] Display is readable on green micro-LED (contrast/font size optimized)
- [ ] Map shows both locations accurately
- [ ] ETA updates smoothly every 5-10 seconds
- [ ] No console errors
- [ ] Handles missing/malformed data gracefully

---

### 1.3 iOS-to-Even Hub Communication

**Protocol**: Local IPC (Inter-Process Communication)

**Options**:
1. **HTTP localhost** (`http://127.0.0.1:3000/api/ride-update`)
   - Simplest, web-standard
   - Lightweight JSON payload
   - 50-100ms latency typical

2. **Unix Domain Socket**
   - Lower latency, more secure
   - Native to iOS/macOS
   - Requires custom setup

**Recommended**: HTTP localhost (simpler, sufficient latency)

**Payload**:
```json
POST /api/ride-update
{
  "driverName": "John D.",
  "driverRating": 4.9,
  "vehicleMake": "Toyota",
  "vehicleModel": "Prius",
  "vehicleColor": "Silver",
  "licensePlate": "ABC123",
  "etaMinutes": 3,
  "driverLat": 37.7749,
  "driverLng": -122.4194,
  "requesterLat": 37.7755,
  "requesterLng": -122.4180,
  "timestamp": "2026-08-14T12:00:00Z"
}
```

**Acceptance Criteria**:
- [ ] Messages arrive within 500ms of notification
- [ ] Payload is valid JSON
- [ ] Even Hub app acknowledges receipt
- [ ] Connection survives app backgrounding
- [ ] Auto-reconnects if interrupted

---

### 1.4 Text Parsing Engine (Swift Regex)

**Input**: Uber notification text (variable format)

**Examples**:
- "John is 3 mins away in a White Toyota Prius (ABC123)"
- "John D. (4.9★) is arriving in Silver Prius"
- "Driver John approaching in vehicle (plate ABC123)"

**Extraction Logic**:
```swift
// Patterns to extract
let namePattern = "(?:Driver\\s)?([A-Z][a-z]+\\s[A-Z]?)"
let etaPattern = "(\\d+)\\s*(?:mins?|minutes?)"
let vehiclePattern = "(\\w+)\\s+(\\w+)"
let platePattern = "[A-Z0-9]{2,8}\\)?"
let ratingPattern = "([0-9.]+)★"
let colorPattern = "(White|Silver|Black|Red|Blue|Gray|Grey)\\s+(\\w+)"
```

**Acceptance Criteria**:
- [ ] Extracts driver name with 95%+ accuracy
- [ ] Extracts ETA with 90%+ accuracy
- [ ] Extracts vehicle info with 85%+ accuracy
- [ ] Extracts license plate when present
- [ ] Handles missing fields gracefully (defaults)
- [ ] No crashes on unexpected text

---

## Data Flow

```
1. User orders Uber ride via official app
   ↓
2. Uber sends notification to iOS (title + body)
   ↓
3. iOS companion app receives notification
   ↓
4. Swift regex engine parses text
   ↓
5. Companion app sends JSON via HTTP localhost
   ↓
6. Even Hub React app receives POST
   ↓
7. React state updates, re-renders
   ↓
8. Even Hub SDK renders to G2 micro-LED
   ↓
9. User sees driver card, ETA, map in AR glasses
   ↓
10. Repeat every 5-10 seconds as updates arrive
```

---

## Phase 1 Acceptance Criteria

- [ ] iOS companion app compiles and runs on iPhone 14+
- [ ] User can grant notification permissions
- [ ] Real Uber notification captured and parsed
- [ ] Data sent to Even Hub within 500ms
- [ ] Even Hub app displays driver info card
- [ ] ETA visible and updates live
- [ ] Location map shows both positions
- [ ] <1% data loss (notifications not missed)
- [ ] Battery impact < 3% per hour of active tracking
- [ ] Graceful failure if Uber app not installed
- [ ] Handles notification rate-limiting (multiple updates/second)

---

## Phase 2 (Future)

- [ ] Voice command: "Hey Siri, request Uber"
- [ ] Direct ride request from G2 (via Even Hub, fallback to phone)
- [ ] Driver chat/communication
- [ ] Trip history and receipts
- [ ] Surge pricing alert
- [ ] Multiple active rides

---

## Dependencies & Assumptions

- [ ] iOS 16.0+ SDK available
- [ ] Even Hub SDK (npm: @evenrealities/even_hub_sdk) accessible
- [ ] G2 device paired with iPhone via Bluetooth 5.2
- [ ] Uber app installed on phone
- [ ] User has active Uber account
- [ ] Xcode 14+ for Swift development
- [ ] Node.js 18+ for React build
- [ ] Network access to localhost (no VPN interference)

---

## Timeline

- **Phase 1**: 3–4 weeks
  - Week 1: iOS companion app (notification + parsing)
  - Week 2: Even Hub display app (React + components)
  - Week 3: Integration + testing on hardware
  - Week 4: Polish + battery optimization

- **Phase 2**: 2–3 weeks (contingent on Phase 1 success)

---

## Success Metrics

- [ ] Driver card displays <1s after notification
- [ ] ETA accuracy ±1 minute (source: Uber)
- [ ] Map shows driver within 50m accuracy
- [ ] <5% notification miss rate
- [ ] 95% of notifications parsed correctly
- [ ] Battery drain < 3% per hour during active ride
- [ ] >95% uptime during active ride

---

## Resources

- **Even Hub Docs**: https://hub.evenrealities.com/docs
- **iOS NotificationCenter**: https://developer.apple.com/documentation/usernotifications
- **Even Hub SDK**: @evenrealities/even_hub_sdk (npm)
- **Figma G2 Design Guidelines**: (from Even Realities Discord)
- **Community**: https://discord.gg/GsuDkKDXDe

---

## Security & Privacy

- ⚠️ **No credentials stored** — Companion app doesn't store passwords
- ⚠️ **Local-only communication** — iOS app ↔ Even Hub (localhost only)
- ⚠️ **Notification data** — Ephemeral (not logged or cached)
- ⚠️ **Location data** — Device GPS only, sent to G2 and discarded
- ⚠️ **Permissions** — User explicitly grants notification access

---

## Known Limitations

- ❌ **No Authorization Code flow** — Uses notification interception, not Uber API
- ❌ **No ride requests** — Phase 2 feature
- ❌ **Uber format changes** — Regex patterns may need updates if Uber changes notification format
- ❌ **iOS only** — Phase 1 targets iOS; Android would need separate NotificationListenerService
- ❌ **Manual testing** — Requires real Uber rides to test (or mock data)
