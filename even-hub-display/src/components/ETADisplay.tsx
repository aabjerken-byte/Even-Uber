import { useState, useEffect } from 'react'

export interface ETADisplayProps {
  minutes: number
}

/**
 * Display estimated time of arrival with countdown
 * Highlights urgency as driver approaches
 */
export default function ETADisplay({ minutes }: ETADisplayProps) {
  const [displayMinutes, setDisplayMinutes] = useState(minutes)

  /**
   * Simulate countdown (in production, this would be more sophisticated)
   */
  useEffect(() => {
    setDisplayMinutes(minutes)

    if (minutes <= 0) {
      return
    }

    const timer = setInterval(() => {
      setDisplayMinutes((prev) => Math.max(0, prev - 1))
    }, 60000) // Decrement every minute

    return () => clearInterval(timer)
  }, [minutes])

  const getStatus = () => {
    if (displayMinutes === 0) return 'ARRIVING'
    if (displayMinutes <= 2) return 'ARRIVING SOON'
    return 'ON THE WAY'
  }

  return (
    <div className={`eta-display eta-${displayMinutes <= 2 ? 'urgent' : 'normal'}`}>
      <div className="eta-time">
        <span className="minutes">{displayMinutes}</span>
        <span className="label">MIN</span>
      </div>

      <div className="eta-status">
        <p className="status-text">{getStatus()}</p>
        <p className="status-detail">Driver heading to your location</p>
      </div>
    </div>
  )
}
