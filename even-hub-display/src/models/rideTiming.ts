import { RideData, RideStatus, isTerminalStatus } from './RideData'

/**
 * How long a ride stays on the display after we last heard about it.
 *
 * Uber sends notifications sporadically, so some silence is normal — but past
 * this point we have no idea whether the ride is still happening, and a stale
 * card on a HUD is worse than no card.
 */
export const RIDE_STALE_AFTER_MS = 15 * 60 * 1000

/** Terminal rides linger briefly so the user sees the outcome, then clear. */
export const TERMINAL_RIDE_LINGER_MS = 60 * 1000

/**
 * Grace period past the promised ETA before we stop trusting the number.
 * Traffic makes ETAs slip; being a couple of minutes over is not a reason to
 * discard the estimate.
 */
export const ETA_GRACE_MINUTES = 3

export interface EtaState {
  /** Minutes remaining, or null when we can no longer justify a number. */
  minutesRemaining: number | null
  /** Short status label for the display. */
  label: string
  /** True when the ETA has run out and we're past the grace period. */
  overdue: boolean
}

function minutesSince(timestamp: string, now: number): number {
  const sent = Date.parse(timestamp)
  if (!Number.isFinite(sent)) return 0
  return Math.max(0, (now - sent) / 60000)
}

/**
 * Work out what to show for the ETA.
 *
 * The previous implementation started from the reported figure and decremented
 * it by one every 60 seconds with `setInterval`, regardless of what had
 * actually happened — after the first notification the number on screen was
 * invented by a timer. This derives it from the timestamp on the data instead,
 * so it stays correct across re-renders, tab sleeps and reconnects, and it
 * admits when it no longer knows.
 */
export function computeEta(ride: RideData, now: number = Date.now()): EtaState {
  const status: RideStatus = ride.status ?? 'enroute'

  if (status === 'arrived') {
    return { minutesRemaining: 0, label: 'ARRIVED', overdue: false }
  }
  if (status === 'completed') {
    return { minutesRemaining: null, label: 'TRIP COMPLETE', overdue: false }
  }
  if (status === 'cancelled') {
    return { minutesRemaining: null, label: 'CANCELLED', overdue: false }
  }

  const elapsed = minutesSince(ride.timestamp, now)
  const remaining = ride.etaMinutes - elapsed

  if (remaining <= 0) {
    // Past the promise. Within the grace window say "arriving"; beyond it stop
    // asserting a number we can't stand behind.
    const overdue = remaining < -ETA_GRACE_MINUTES
    return {
      minutesRemaining: overdue ? null : 0,
      label: overdue ? 'ETA UNKNOWN' : 'ARRIVING',
      overdue
    }
  }

  const minutesRemaining = Math.ceil(remaining)
  return {
    minutesRemaining,
    label: minutesRemaining <= 2 ? 'ARRIVING SOON' : 'ON THE WAY',
    overdue: false
  }
}

/**
 * Whether a ride should still be shown at all.
 *
 * `receivedAt` is when the server accepted the payload; it falls back to the
 * ride's own timestamp for producers that don't supply one.
 */
export function isRideStale(
  ride: RideData,
  now: number = Date.now(),
  receivedAt?: number
): boolean {
  const reference = receivedAt ?? Date.parse(ride.timestamp)
  if (!Number.isFinite(reference)) return false

  const age = now - reference
  if (isTerminalStatus(ride.status)) {
    return age > TERMINAL_RIDE_LINGER_MS
  }
  return age > RIDE_STALE_AFTER_MS
}
