import { useState } from 'react'
import { RideData } from '../models/RideData'
import '../styles/CallDriver.css'

interface CallDriverProps {
  driver: RideData
}

export default function CallDriver({ driver }: CallDriverProps) {
  const [isCalling, setIsCalling] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  const handleCall = () => {
    if (!driver.driverPhone) {
      alert('Driver phone number not available')
      return
    }

    setIsCalling(true)

    // Simulate call start
    console.log(`📞 Calling ${driver.driverName}...`)

    // In production, this would integrate with Twilio or similar
    // For now, we'll simulate the call
    const callInterval = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)

    // Auto-end call after 30 seconds for demo
    setTimeout(() => {
      endCall(callInterval)
    }, 30000)
  }

  const endCall = (interval: NodeJS.Timeout) => {
    clearInterval(interval)
    setIsCalling(false)
    setCallDuration(0)
    console.log('📞 Call ended')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="call-driver">
      {!isCalling ? (
        <button
          className="call-btn"
          onClick={handleCall}
          disabled={!driver.driverPhone}
          title={driver.driverPhone ? 'Call driver' : 'Phone number not available'}
        >
          <span className="icon">📞</span>
          <span className="label">Call {driver.driverName.split(' ')[0]}</span>
        </button>
      ) : (
        <div className="call-active">
          <div className="call-info">
            <h4>📞 Connected</h4>
            <p>{driver.driverName}</p>
            <div className="call-timer">{formatTime(callDuration)}</div>
          </div>
          <button className="end-call-btn" onClick={() => endCall(setInterval(() => {}, 1000))}>
            End Call
          </button>
        </div>
      )}

      <p className="call-hint">
        {!driver.driverPhone
          ? '⚠️ Phone number not available'
          : 'Call to confirm your location or ask questions'}
      </p>
    </div>
  )
}
