import { useEffect, useState } from 'react'
import { RideData } from '../models/RideData'
import { computeEta } from '../models/rideTiming'

export interface ETADisplayProps {
  ride: RideData
}

/**
 * Estimated pickup time.
 *
 * The figure is recomputed from the ride's own timestamp rather than counted
 * down locally, so it survives re-renders and backgrounded tabs and reports
 * "ETA UNKNOWN" instead of inventing a number once the estimate has clearly
 * lapsed. The interval here only forces a re-render; it never mutates the value.
 */
function statusDetail(ride: RideData, overdue: boolean): string {
  switch (ride.status ?? 'enroute') {
    case 'arrived':
      return 'Driver is waiting at the pickup point'
    case 'completed':
      return 'Trip finished'
    case 'cancelled':
      return 'This ride was cancelled'
    case 'arriving':
      return 'Driver is pulling up now'
    default:
      return overdue
        ? 'No update from Uber recently'
        : 'Driver heading to your location'
  }
}

export default function ETADisplay({ ride }: ETADisplayProps) {
  const [eta, setEta] = useState(() => computeEta(ride))

  useEffect(() => {
    setEta(computeEta(ride))

    // Re-evaluate every 10s — the spec asks for the ETA to refresh on that
    // cadence, and it keeps the "arriving"/"unknown" transitions prompt.
    const timer = setInterval(() => setEta(computeEta(ride)), 10_000)
    return () => clearInterval(timer)
  }, [ride])

  const urgent = eta.minutesRemaining !== null && eta.minutesRemaining <= 2

  return (
    <div className={`eta-display eta-${urgent ? 'urgent' : 'normal'}`}>
      <div className="eta-time">
        {eta.minutesRemaining !== null ? (
          <>
            <span className="minutes">{eta.minutesRemaining}</span>
            <span className="label">MIN</span>
          </>
        ) : (
          <span className="label">--</span>
        )}
      </div>

      <div className="eta-status">
        <p className="status-text">{eta.label}</p>
        <p className="status-detail">{statusDetail(ride, eta.overdue)}</p>
      </div>
    </div>
  )
}
