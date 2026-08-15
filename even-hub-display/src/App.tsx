import { useState, useEffect } from 'react'
import { RideData, ApiResponse } from './models/RideData'
import RideCard from './components/RideCard'
import StatusView from './components/StatusView'
import './App.css'

export default function App() {
  const [rideData, setRideData] = useState<RideData | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  /**
   * Poll the server for current ride data
   * Every 2 seconds, fetch /api/ride to see if there's an active ride
   */
  useEffect(() => {
    console.log('🚀 Even Uber display app initializing...')

    setIsReady(true)

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('http://127.0.0.1:3001/api/ride', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })

        if (response.ok) {
          const data: ApiResponse<RideData> = await response.json()

          if (data.data) {
            setRideData(data.data)
            setLastUpdate(new Date())
            setIsConnected(true)

            if (!rideData || rideData.driverName !== data.data.driverName) {
              console.log(`✅ Ride data updated: ${data.data.driverName}`)
            }
          }
        } else {
          // No active ride
          if (rideData) {
            console.log('🛑 Ride completed')
            setRideData(null)
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch ride data:', error)
        setIsConnected(false)
      }
    }, 2000) // Poll every 2 seconds

    // Also check server health on startup
    const checkHealth = async () => {
      try {
        const response = await fetch('http://127.0.0.1:3001/health')
        if (response.ok) {
          console.log('🟢 Connected to Even Hub server')
          setIsConnected(true)
        }
      } catch (error) {
        console.warn('⚠️ Server not responding')
        setIsConnected(false)
      }
    }

    checkHealth()

    return () => clearInterval(pollInterval)
  }, [rideData])

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚗 Even Uber</h1>
        <p>Real-time Uber tracking on G2 AR glasses</p>
      </header>

      <main className="app-main">
        {isReady && !rideData ? (
          <StatusView lastUpdate={lastUpdate} />
        ) : isReady && rideData ? (
          <RideCard data={rideData} />
        ) : (
          <div className="loading">
            <p>Initializing...</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          {lastUpdate && ` • Last update: ${lastUpdate.toLocaleTimeString()}`}
        </p>
      </footer>

      {/* Debug console for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-console">
          <details>
            <summary>Debug Info</summary>
            <pre>
              {JSON.stringify(
                {
                  isReady,
                  isConnected,
                  hasRideData: !!rideData,
                  lastUpdate: lastUpdate?.toISOString(),
                  currentRide: rideData
                },
                null,
                2
              )}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
