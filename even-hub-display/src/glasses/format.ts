import { RideData } from '../models/RideData'
import { computeEta } from '../models/rideTiming'
import { ContainerKey } from './constants'

/**
 * The text shown in each container, keyed by container.
 *
 * Pure: `RideData` in, strings out. This is what makes the glasses output
 * testable without a device — the renderer only diffs and ships these.
 */
export type GlassesText = Partial<Record<ContainerKey, string>>

/**
 * Rough character budget per line.
 *
 * The panel is 576 px wide and the host picks the font, so this is a
 * conservative guess rather than a measurement. Truncating here is much better
 * than letting the host clip mid-glyph, but the numbers deserve a look on real
 * hardware.
 */
const MAX_CHARS = {
  driver: 24,
  vehicle: 26,
  plate: 26,
  eta: 12,
  status: 26
} as const

export function truncate(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  if (max <= 1) return trimmed.slice(0, max)
  return `${trimmed.slice(0, max - 1)}…`
}

/** Collapse repeated whitespace left by empty vehicle fields. */
function tidy(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function formatRide(ride: RideData, now: number = Date.now()): GlassesText {
  const eta = computeEta(ride, now)

  const rating = ride.driverRating > 0 ? ` ★${ride.driverRating.toFixed(1)}` : ''
  const driver = tidy(`${ride.driverName}${rating}`)

  const vehicle = tidy(`${ride.vehicleColor} ${ride.vehicleMake} ${ride.vehicleModel}`)

  return {
    driver: truncate(driver || 'Driver', MAX_CHARS.driver),
    vehicle: truncate(vehicle || 'Vehicle details pending', MAX_CHARS.vehicle),
    plate: truncate(ride.licensePlate ? `Plate ${ride.licensePlate}` : '', MAX_CHARS.plate),
    eta: truncate(
      eta.minutesRemaining !== null ? `${eta.minutesRemaining} MIN` : '--',
      MAX_CHARS.eta
    ),
    status: truncate(eta.label, MAX_CHARS.status)
  }
}

/** Text shown when there is no active ride. */
export function formatIdle(): GlassesText {
  return {
    driver: 'Even Uber',
    vehicle: 'No active ride',
    plate: '',
    eta: '',
    status: 'Order a ride to begin'
  }
}

/**
 * Only the entries whose value changed.
 *
 * Every update crosses a Bluetooth link to the glasses, so pushing all five
 * lines on every 2-second poll would be wasteful and visibly laggy.
 */
export function diffText(previous: GlassesText, next: GlassesText): GlassesText {
  const changed: GlassesText = {}
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]) as Set<ContainerKey>

  for (const key of keys) {
    const before = previous[key] ?? ''
    const after = next[key] ?? ''
    if (before !== after) changed[key] = after
  }

  return changed
}
