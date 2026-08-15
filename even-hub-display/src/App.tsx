import { useState, useEffect } from 'react'
import { RideData, ApiResponse } from './models/RideData'
import RideCard from './components/RideCard'
import StatusView from './components/StatusView'
import RideHistory from './components/RideHistory'
import SettingsPanel from './components/SettingsPanel'
import './App.css'

interface RideHistoryEntry {
  id: string
  data: RideData
  startTime: Date
  endTime?: Date
  duration?: number
}

type AppView = 'ride' | 'history' | 'settings'

const SERVER_URL = 'http://127.0.0.1:3000'
const POLL_INTERVAL = 2000
const STORAGE_KEY = 'even_uber_rides'
const THEME_KEY = 'even_uber_theme'

export default function App() {
  // Current ride state
  const [rideData, setRideData] = useState<RideData | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Ride history state
  const [rideHistory, setRideHistory] = useState<RideHistoryEntry[]>([])
  const [currentRideId, setCurrentRideId] = useState<string | null>(null)

  // UI state
  const [activeView, setActiveView] = useState<AppView>('ride')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY)
    return saved ? JSON.parse(saved) : false
  })

  // Settings state
  const [pollInterval, setPollInterval] = useState(POLL_INTERVAL)
  const [showNotifications, setShowNotifications] = useState(true)
  const [autoHideCompleted, setAutoHideCompleted] = useState(true)

  // Initialize theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem(THEME_KEY, JSON.stringify(isDarkMode))
  }, [isDarkMode])

  // Load ride history from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as RideHistoryEntry[]
        // Convert date strings back to Date objects
        const restored = parsed.map(entry => ({
          ...entry,
          startTime: new Date(entry.startTime),
          endTime: entry.endTime ? new Date(entry.endTime) : undefined
        }))
        setRideHistory(restored)
      }
    } catch (error) {
      console.error('Failed to load ride history:', error)
    }
  }, [])

  // Save ride history to storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rideHistory))
    } catch (error) {
      console.error('Failed to save ride history:', error)
    }
  }, [rideHistory])

  // Main polling effect
  useEffect(() => {
    console.log('🚀 Even Uber display app initializing...')
    setIsReady(true)
    setIsLoading(false)

    // Check server health on startup
    const checkHealth = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/health`)
        if (response.ok) {
          console.log('🟢 Connected to Even Hub server')
          setIsConnected(true)
          setConnectionError(null)
        } else {
          setIsConnected(false)
          setConnectionError(`Server returned ${response.status}`)
        }
      } catch (error) {
        console.warn('⚠️ Server not responding:', error)
        setIsConnected(false)
        setConnectionError('Cannot reach server at ' + SERVER_URL)
      }
    }

    checkHealth()

    // Set up polling interval
    const poll = setInterval(async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/ride`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })

        if (response.ok) {
          const apiResponse: ApiResponse<RideData> = await response.json()

          if (apiResponse.data) {
            const newRide = apiResponse.data
            setRideData(newRide)
            setLastUpdate(new Date())
            setIsConnected(true)
            setConnectionError(null)

            // Track ride in history
            if (!currentRideId || rideData?.driverName !== newRide.driverName) {
              const rideId = `ride_${Date.now()}`
              setCurrentRideId(rideId)
              setRideHistory(prev => [
                ...prev,
                {
                  id: rideId,
                  data: newRide,
                  startTime: new Date()
                }
              ])

              if (showNotifications) {
                console.log(`✅ New ride: ${newRide.driverName}`)
              }
            }
          }
        } else {
          // No active ride
          if (rideData && currentRideId) {
            // Mark ride as completed
            setRideHistory(prev =>
              prev.map(entry =>
                entry.id === currentRideId
                  ? {
                      ...entry,
                      endTime: new Date(),
                      duration: Date.now() - entry.startTime.getTime()
                    }
                  : entry
              )
            )

            if (autoHideCompleted) {
              setRideData(null)
              setCurrentRideId(null)
            }

            console.log('🛑 Ride completed')
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch ride data:', error)
        setIsConnected(false)
        setConnectionError('Polling error: ' + (error instanceof Error ? error.message : 'Unknown'))
      }
    }, pollInterval)

    return () => clearInterval(poll)
  }, [currentRideId, rideData, pollInterval, showNotifications, autoHideCompleted])

  // Handle view navigation
  const handleViewChange = (view: AppView) => {
    setActiveView(view)
  }

  // Clear ride history
  const handleClearHistory = () => {
    if (window.confirm('Clear all ride history?')) {
      setRideHistory([])
    }
  }

  return (
    <div className="app" data-theme={isDarkMode ? 'dark' : 'light'}>
      <header className="app-header">
        <div className="header-content">
          <h1>🚗 Even Uber</h1>
          <p>Real-time Uber tracking on G2 AR glasses</p>
        </div>
        <div className="header-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢' : '🔴'}
          </span>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="app-nav">
        <button
          className={`nav-btn ${activeView === 'ride' ? 'active' : ''}`}
          onClick={() => handleViewChange('ride')}
        >
          🚗 Ride
        </button>
        <button
          className={`nav-btn ${activeView === 'history' ? 'active' : ''}`}
          onClick={() => handleViewChange('history')}
        >
          📋 History ({rideHistory.length})
        </button>
        <button
          className={`nav-btn ${activeView === 'settings' ? 'active' : ''}`}
          onClick={() => handleViewChange('settings')}
        >
          ⚙️ Settings
        </button>
      </nav>

      {/* Main content area */}
      <main className="app-main">
        {isLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Initializing...</p>
          </div>
        ) : activeView === 'ride' ? (
          isReady && !rideData ? (
            <StatusView lastUpdate={lastUpdate} />
          ) : isReady && rideData ? (
            <RideCard data={rideData} />
          ) : (
            <div className="empty-state">
              <p>No active ride</p>
            </div>
          )
        ) : activeView === 'history' ? (
          <RideHistory rides={rideHistory} onClear={handleClearHistory} />
        ) : (
          <SettingsPanel
            isDarkMode={isDarkMode}
            onThemeChange={setIsDarkMode}
            pollInterval={pollInterval}
            onPollIntervalChange={setPollInterval}
            showNotifications={showNotifications}
            onNotificationsChange={setShowNotifications}
            autoHideCompleted={autoHideCompleted}
            onAutoHideChange={setAutoHideCompleted}
          />
        )}
      </main>

      {/* Footer with connection status */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="connection-status">
            <span className={`status-light ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              {connectionError && ` (${connectionError})`}
            </span>
          </div>
          {lastUpdate && (
            <div className="last-update">
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
      </footer>

      {/* Debug console for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-console">
          <details>
            <summary>🐛 Debug Info</summary>
            <pre>
              {JSON.stringify(
                {
                  connected: isConnected,
                  error: connectionError,
                  hasRideData: !!rideData,
                  currentRideId,
                  rideHistory: rideHistory.length,
                  pollInterval,
                  currentRide: rideData,
                  lastUpdate: lastUpdate?.toISOString()
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
