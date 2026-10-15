import { useState, useEffect, useMemo, useRef } from 'react'
import { RideData } from './models/RideData'
import { SourceMode, applyUpdate, detectMode, fetchRide } from './rideSource'
import { runDemoRide } from './demoRide'
import { usePhoneLocation } from './glasses/usePhoneLocation'
import { setLogRelay } from './glasses/log'
import RideCard from './components/RideCard'
import PasteFromUber from './components/PasteFromUber'
import StatusView from './components/StatusView'
import RideHistory from './components/RideHistory'
import SettingsPanel from './components/SettingsPanel'
import { useGlasses } from './glasses/useGlasses'
import './App.css'

interface RideHistoryEntry {
  id: string
  data: RideData
  startTime: Date
  endTime?: Date
  duration?: number
}

type AppView = 'ride' | 'history' | 'settings'

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
  const [mode, setMode] = useState<SourceMode | null>(null)

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
  // Mirror the current ride onto the G2 glasses. No-ops outside the Even App
  // WebView, so the browser preview is unaffected.
  //
  // The phone's live GPS is layered on at display time rather than stored, so
  // it never fights with whatever the ride source holds.
  const phoneLocation = usePhoneLocation()
  const displayRide = useMemo<RideData | null>(
    () => (rideData && phoneLocation
      ? { ...rideData, phoneLat: phoneLocation.lat, phoneLng: phoneLocation.lng }
      : rideData),
    [rideData, phoneLocation]
  )
  const glassesActive = useGlasses(displayRide)

  const stopDemo = useRef<(() => void) | null>(null)
  useEffect(() => () => stopDemo.current?.(), [])
  const startDemo = () => {
    if (!mode) return
    stopDemo.current?.()
    stopDemo.current = runDemoRide(
      (update) => void applyUpdate(mode, update),
      phoneLocation
    )
  }

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

  // Work out where ride data lives: the dev server, or this page (.ehpk)
  useEffect(() => {
    console.log('🚀 Even Uber display app initializing...')
    detectMode().then((detected) => {
      console.log(`📡 Ride source: ${detected}`)
      setLogRelay(detected === 'server')
      setMode(detected)
      setIsReady(true)
      setIsLoading(false)
    })
  }, [])

  // Main polling effect
  useEffect(() => {
    if (!mode) return

    const tick = async () => {
      try {
        const newRide = await fetchRide(mode)
        setIsConnected(true)
        setConnectionError(null)

        if (newRide) {
          setRideData(newRide)
          setLastUpdate(new Date())

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
        } else if (rideData && currentRideId) {
          // No active ride any more — mark it completed
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
      } catch (error) {
        console.error('❌ Failed to fetch ride data:', error)
        setIsConnected(false)
        setConnectionError('Polling error: ' + (error instanceof Error ? error.message : 'Unknown'))
      }
    }

    void tick()
    const poll = setInterval(tick, pollInterval)
    return () => clearInterval(poll)
  }, [mode, currentRideId, rideData, pollInterval, showNotifications, autoHideCompleted])

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
            <>
              {mode && <PasteFromUber mode={mode} currentRide={null} />}
              <StatusView lastUpdate={lastUpdate} onSimulate={startDemo} />
            </>
          ) : isReady && rideData ? (
            <>
              {mode && <PasteFromUber mode={mode} currentRide={rideData} />}
              <RideCard data={displayRide ?? rideData} />
            </>
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
              {mode === 'local' ? '📱 Running on phone' : isConnected ? '🟢 Connected' : '🔴 Disconnected'}
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
                  glassesActive,
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
