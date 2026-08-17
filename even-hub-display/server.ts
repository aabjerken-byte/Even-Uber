import express, { Express, Request, Response } from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { RideData, ApiResponse, HealthResponse, isTerminalStatus } from './src/models/RideData'
import { isRideStale } from './src/models/rideTiming'
import { mergeRide } from './src/models/rideMerge'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app: Express = express()
const PORT = 3000

// Middleware
app.use(express.json())
app.use(express.static(path.join(__dirname, 'dist')))

// In-memory store for current ride (in production, use WebSocket)
let currentRide: RideData | null = null
let lastUpdate: Date | null = null

// CORS headers
app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const response: ApiResponse<HealthResponse> = {
    status: 'ok',
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  }
  res.json(response)
})

// Receive ride update from iOS companion app
app.post('/api/ride-update', (req: Request, res: Response) => {
  try {
    const incoming: RideData = req.body

    // Transitions — "arriving now", "has arrived", "trip complete" — carry a
    // status and often nothing else; that's their whole point. Only a plain
    // en-route update must identify a driver and quote an ETA.
    const transition = isTerminalStatus(incoming.status) || incoming.status === 'arriving'
    if (!transition && (!incoming.driverName || incoming.etaMinutes === undefined)) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing required fields: driverName, etaMinutes'
      })
    }

    const existing = activeRide()

    // A transition modifies the ride on screen; it never starts one. Post-trip
    // notifications ("your receipt is ready", "rate your trip") keep arriving
    // long after a trip ends, and without this a stray receipt would raise a
    // blank "TRIP COMPLETE" card on the glasses out of nowhere.
    if (transition && !existing && !incoming.driverName) {
      console.log('↩️ Ignoring transition update with no active ride')
      return res.json({
        status: 'ignored',
        message: 'No active ride to update'
      })
    }

    const rideData = mergeRide(existing, incoming)

    // Store the ride data
    currentRide = rideData
    lastUpdate = new Date()

    console.log(`📤 Received ride update:`)
    console.log(`   Status: ${rideData.status ?? 'enroute'}`)
    console.log(`   Driver: ${rideData.driverName}`)
    console.log(`   Rating: ${rideData.driverRating}★`)
    console.log(`   Vehicle: ${rideData.vehicleColor} ${rideData.vehicleMake} ${rideData.vehicleModel}`)
    console.log(`   Plate: ${rideData.licensePlate}`)
    console.log(`   ETA: ${rideData.etaMinutes} minutes`)

    const response: ApiResponse<RideData> = {
      status: 'success',
      message: 'Ride data updated',
      data: rideData
    }

    res.json(response)
  } catch (error) {
    console.error('❌ Error processing ride update:', error)
    res.status(500).json({
      status: 'error',
      error: 'Failed to process ride update'
    })
  }
})

/**
 * Drop the stored ride once it goes stale, so the glasses stop showing a card
 * for a trip that ended long ago. Terminal rides linger briefly; en-route rides
 * survive a quiet spell but not an indefinite one.
 */
function activeRide(): RideData | null {
  if (!currentRide) return null

  if (isRideStale(currentRide, Date.now(), lastUpdate?.getTime())) {
    console.log('🕓 Clearing stale ride data')
    currentRide = null
    lastUpdate = null
    return null
  }

  return currentRide
}

// Get current ride data (for debugging/testing)
app.get('/api/ride', (req: Request, res: Response) => {
  const ride = activeRide()

  if (!ride) {
    return res.status(404).json({
      status: 'no_data',
      message: 'No active ride'
    })
  }

  const response: ApiResponse<RideData> = {
    status: 'success',
    data: ride
  }

  res.json(response)
})

// Clear current ride (for testing)
app.post('/api/ride-clear', (req: Request, res: Response) => {
  currentRide = null
  lastUpdate = null

  res.json({
    status: 'success',
    message: 'Ride data cleared'
  })
})

// Get server status
app.get('/api/status', (req: Request, res: Response) => {
  const ride = activeRide()
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    hasActiveRide: !!ride,
    lastUpdate: lastUpdate?.toISOString() || null,
    currentRide: ride
  })
})

// Serve React app for all other routes
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
    if (err) {
      res.status(500).send('Error serving index.html')
    }
  })
})

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 Even Uber Display Server`)
  console.log(`📍 Running at http://127.0.0.1:${PORT}`)
  console.log(`\n📝 API Endpoints:`)
  console.log(`   POST /api/ride-update    ← iOS companion app sends data here`)
  console.log(`   GET  /api/ride           ← Get current ride data`)
  console.log(`   POST /api/ride-clear     ← Clear ride (testing)`)
  console.log(`   GET  /api/status         ← Server status`)
  console.log(`   GET  /health             ← Health check`)
  console.log(`\n💡 Test with mock data:`)
  console.log(`   curl -X POST http://127.0.0.1:${PORT}/api/ride-update \\`)
  console.log(`     -H "Content-Type: application/json" \\`)
  console.log(`     -d '{"driverName":"John D.","driverRating":4.9,"vehicleMake":"Toyota","vehicleModel":"Prius","vehicleColor":"Silver","licensePlate":"ABC123","etaMinutes":3,"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}'`)
  console.log(`\n🟢 Ready to receive ride data from iOS app\n`)
})
