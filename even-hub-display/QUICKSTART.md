# Even Uber Display – Quick Start Guide

Get the Even Hub display app running locally in 5 minutes.

## Prerequisites

- **Node.js 18+** ([download](https://nodejs.org))
- **npm** (comes with Node.js)
- **Terminal/Command Prompt**

## Installation

### 1. Navigate to the project

```bash
cd EvenUber/even-hub-display
```

### 2. Install dependencies

```bash
npm install
```

This installs:
- React 18
- Express.js
- TypeScript
- Vite (dev server)
- Other tools

### 3. Start the dev server

```bash
npm run dev
```

You should see:

```
🚀 Even Uber Display Server
📍 Running at http://127.0.0.1:3000

📝 API Endpoints:
   POST /api/ride-update    ← iOS companion app sends data here
   GET  /api/ride           ← Get current ride data
   POST /api/ride-clear     ← Clear ride (testing)
   GET  /api/status         ← Server status
   GET  /health             ← Health check

💡 Test with mock data:
   curl -X POST http://127.0.0.1:3000/api/ride-update ...

🟢 Ready to receive ride data from iOS app
```

## Testing

### Open the App

`npm run dev` starts **two** processes on **two** ports:

| Port | Process | Use it for |
|------|---------|-----------|
| `3000` | Express API (`server.ts`) | The API the iOS app posts to. Also serves the production bundle from `dist/` after `npm run build`. |
| `5173` | Vite dev server | Browsing the UI while developing — this is the one with hot reload. |

While developing, visit **`http://127.0.0.1:5173`**. The page calls the API on
port 3000 directly (the server sends permissive CORS headers), so both must be
running.

To view the *production* build instead, run `npm run build` then `npm start` and
visit **`http://127.0.0.1:3000`**.

Either way you should see the "Waiting for ride data..." screen.

> The API stays on port 3000 in both modes — that address is hardcoded in the
> iOS companion app, so don't move it.

### Send Mock Data

Open a new terminal and run:

```bash
curl -X POST http://127.0.0.1:3000/api/ride-update \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

### Watch the Magic ✨

Go back to **http://127.0.0.1:3000** and you should see:

```
🚗 John D. ⭐ 4.9 | Silver Toyota Prius
📋 ABC123

3 MINUTES AWAY
Driver heading to your location

[Interactive Map showing driver vs requester]
```

The display updates every 2 seconds as new data arrives.

### Try More Scenarios

**Test ETA countdown** (driver arriving soon):

```bash
curl -X POST http://127.0.0.1:3000/api/ride-update \
  -H "Content-Type: application/json" \
  -d '{
    "driverName": "Sarah M.",
    "driverRating": 4.8,
    "vehicleMake": "Honda",
    "vehicleModel": "Civic",
    "vehicleColor": "Black",
    "licensePlate": "XYZ789",
    "etaMinutes": 1,
    "driverLat": 37.7753,
    "driverLng": -122.4189,
    "requesterLat": 37.7755,
    "requesterLng": -122.4180,
    "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'"
  }'
```

Notice the ETA display turns urgent (orange border) when <= 2 minutes!

**Clear the ride** (trip complete):

```bash
curl -X POST http://127.0.0.1:3000/api/ride-clear
```

The app should return to "Waiting for ride data..."

## API Reference

### `POST /api/ride-update` (iOS app → Server)

Receive a ride update from the iOS companion app.

**Request body:**
```json
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

**Response:**
```json
{
  "status": "success",
  "message": "Ride data updated",
  "data": { ...ride data... }
}
```

### `GET /api/ride` (React app polls)

Get the current active ride.

**Response (if ride active):**
```json
{
  "status": "success",
  "data": { ...ride data... }
}
```

**Response (if no ride):**
```json
{
  "status": "no_data",
  "message": "No active ride"
}
```

### `GET /api/status` (Debugging)

Get server status and current ride.

**Response:**
```json
{
  "status": "ok",
  "uptime": 123.45,
  "hasActiveRide": true,
  "lastUpdate": "2026-08-14T12:05:30Z",
  "currentRide": { ...ride data... }
}
```

### `GET /health`

Health check for monitoring.

**Response:**
```json
{
  "status": "ok",
  "data": {
    "status": "healthy",
    "uptime": 123.45,
    "timestamp": "2026-08-14T12:05:30Z"
  }
}
```

### `POST /api/ride-clear` (Testing)

Clear the current ride (for testing).

**Response:**
```json
{
  "status": "success",
  "message": "Ride data cleared"
}
```

## How It Works

```
1. iOS Companion App (running on iPhone)
         ↓
   Intercepts Uber notification
   Parses: driver name, ETA, vehicle, plate
         ↓
2. iOS sends HTTP POST to http://127.0.0.1:3000/api/ride-update
         ↓
3. Express Server receives and stores the ride data
         ↓
4. React App (browser) polls /api/ride every 2 seconds
         ↓
5. React displays the ride data:
   - Driver info card
   - ETA countdown
   - Location map (driver vs requester)
         ↓
6. Even Hub SDK renders to G2 glasses
```

## Troubleshooting

### "Port 3000 already in use"

Another app is using port 3000. Kill it or change the port:

**Option A: Kill the process**
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Option B: Change the port** (edit `vite.config.ts`):
```typescript
server: {
  port: 3001,  // Use a different port
  ...
}
```

### "npm: command not found"

Install Node.js from https://nodejs.org

### "Waiting for ride data..." won't go away

Make sure you're sending POST requests to **`http://127.0.0.1:3000`** (not `localhost:3000` or `127.0.0.1:5173`).

### Debug Console

Open your browser's Developer Tools (F12) → Console tab to see debug logs:

```
✅ Connected to Even Hub server
✅ Ride data updated: John D.
🔴 Disconnected from Even Hub
```

## What's Next

1. **iOS Companion App**: Create the Swift app that intercepts Uber notifications
2. **Connect iPhone**: Have iOS app send real POST requests to this server
3. **Test end-to-end**: Order a real Uber ride and see data flow through
4. **Deploy to G2**: Package app with Even Hub SDK and deploy to glasses

## File Structure

```
even-hub-display/
├── src/
│   ├── App.tsx                # Main React component (polling logic)
│   ├── App.css                # Green monochrome styling
│   ├── components/
│   │   ├── RideCard.tsx       # Main display card
│   │   ├── DriverInfo.tsx
│   │   ├── ETADisplay.tsx
│   │   ├── LocationMap.tsx
│   │   └── StatusView.tsx
│   └── models/
│       └── RideData.ts        # TypeScript interfaces
├── server.ts                  # Express.js backend
├── package.json
├── vite.config.ts
├── tsconfig.json
└── public/
    └── index.html
```

## Commands

```bash
npm run dev           # Start dev server + React
npm run dev:vite      # Start Vite only (HMR)
npm run dev:server    # Start Express only
npm run build         # Build for production
npm run preview       # Preview prod build
npm run lint          # Check TypeScript
```

---

**You're all set!** 🎉 The Even Hub display app is running and ready to receive ride data from the iOS companion app.
