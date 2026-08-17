import { describe, expect, it } from 'vitest'
import { RideData, RideStatus, isTerminalStatus } from './RideData'
import {
  ETA_GRACE_MINUTES,
  RIDE_STALE_AFTER_MS,
  TERMINAL_RIDE_LINGER_MS,
  computeEta,
  isRideStale
} from './rideTiming'
import { mergeRide } from './rideMerge'

const T0 = Date.parse('2026-08-17T12:00:00Z')
const MINUTE = 60_000

function ride(overrides: Partial<RideData> = {}): RideData {
  return {
    driverName: 'John D.',
    driverRating: 4.9,
    vehicleMake: 'Toyota',
    vehicleModel: 'Prius',
    vehicleColor: 'Silver',
    licensePlate: 'ABC123',
    etaMinutes: 5,
    timestamp: new Date(T0).toISOString(),
    ...overrides
  }
}

describe('computeEta', () => {
  it('counts down from the timestamp rather than from render time', () => {
    expect(computeEta(ride(), T0).minutesRemaining).toBe(5)
    expect(computeEta(ride(), T0 + 2 * MINUTE).minutesRemaining).toBe(3)
    expect(computeEta(ride(), T0 + 4 * MINUTE).minutesRemaining).toBe(1)
  })

  it('is stable regardless of how many times it is called', () => {
    const r = ride()
    const a = computeEta(r, T0 + MINUTE)
    const b = computeEta(r, T0 + MINUTE)
    expect(a).toEqual(b)
  })

  it('says ARRIVING once the estimate runs out, within the grace window', () => {
    const state = computeEta(ride(), T0 + 6 * MINUTE)
    expect(state.label).toBe('ARRIVING')
    expect(state.minutesRemaining).toBe(0)
    expect(state.overdue).toBe(false)
  })

  it('stops asserting a number past the grace window', () => {
    const past = T0 + (5 + ETA_GRACE_MINUTES + 1) * MINUTE
    const state = computeEta(ride(), past)
    expect(state.label).toBe('ETA UNKNOWN')
    expect(state.minutesRemaining).toBeNull()
    expect(state.overdue).toBe(true)
  })

  it('reports terminal statuses without inventing an ETA', () => {
    const cases: Array<[RideStatus, string, number | null]> = [
      ['arrived', 'ARRIVED', 0],
      ['completed', 'TRIP COMPLETE', null],
      ['cancelled', 'CANCELLED', null]
    ]

    for (const [status, label, minutes] of cases) {
      // Deliberately far past the ETA — status must win over the clock.
      const state = computeEta(ride({ status }), T0 + 90 * MINUTE)
      expect(state.label).toBe(label)
      expect(state.minutesRemaining).toBe(minutes)
    }
  })

  it('flags urgency near arrival', () => {
    expect(computeEta(ride(), T0 + 3 * MINUTE).label).toBe('ARRIVING SOON')
    expect(computeEta(ride(), T0).label).toBe('ON THE WAY')
  })
})

describe('isRideStale', () => {
  it('keeps an en-route ride through a quiet spell', () => {
    expect(isRideStale(ride(), T0 + 5 * MINUTE, T0)).toBe(false)
  })

  it('drops an en-route ride once it goes quiet for too long', () => {
    expect(isRideStale(ride(), T0 + RIDE_STALE_AFTER_MS + 1, T0)).toBe(true)
  })

  it('clears terminal rides quickly so the card comes off the glasses', () => {
    const finished = ride({ status: 'completed' })
    expect(isRideStale(finished, T0 + 30_000, T0)).toBe(false)
    expect(isRideStale(finished, T0 + TERMINAL_RIDE_LINGER_MS + 1, T0)).toBe(true)
  })

  it('falls back to the ride timestamp when no receipt time is given', () => {
    expect(isRideStale(ride(), T0 + RIDE_STALE_AFTER_MS + 1)).toBe(true)
  })
})

describe('isTerminalStatus', () => {
  it('classifies each status', () => {
    expect(isTerminalStatus('enroute')).toBe(false)
    expect(isTerminalStatus('arriving')).toBe(false)
    expect(isTerminalStatus('arrived')).toBe(true)
    expect(isTerminalStatus('completed')).toBe(true)
    expect(isTerminalStatus('cancelled')).toBe(true)
    expect(isTerminalStatus(undefined)).toBe(false)
  })
})

describe('mergeRide', () => {
  it('keeps driver details when a bare arrival notice comes in', () => {
    // This is the regression that motivated merging: "Your driver has arrived"
    // names nobody, and replacing wholesale blanked the card.
    const arrival: RideData = {
      status: 'arrived',
      driverName: '',
      driverRating: 0,
      vehicleMake: '',
      vehicleModel: '',
      vehicleColor: '',
      licensePlate: '',
      etaMinutes: 0,
      timestamp: new Date(T0 + 4 * MINUTE).toISOString()
    }

    const merged = mergeRide(ride(), arrival)

    expect(merged.status).toBe('arrived')
    expect(merged.driverName).toBe('John D.')
    expect(merged.vehicleMake).toBe('Toyota')
    expect(merged.licensePlate).toBe('ABC123')
    expect(merged.driverRating).toBe(4.9)
  })

  it('takes newer values when they are present', () => {
    const update = ride({ etaMinutes: 2, timestamp: new Date(T0 + MINUTE).toISOString() })
    const merged = mergeRide(ride(), update)
    expect(merged.etaMinutes).toBe(2)
    expect(merged.timestamp).toBe(update.timestamp)
  })

  it('preserves coordinates that a later update omits', () => {
    const withLocation = ride({ requesterLat: 37.7755, requesterLng: -122.418 })
    const merged = mergeRide(withLocation, ride({ etaMinutes: 2 }))
    expect(merged.requesterLat).toBe(37.7755)
    expect(merged.requesterLng).toBe(-122.418)
  })

  it('starts fresh when a different driver appears', () => {
    const other = ride({ driverName: 'Sarah M.', licensePlate: 'XYZ789', vehicleMake: 'Honda' })
    const merged = mergeRide(ride(), other)
    expect(merged.driverName).toBe('Sarah M.')
    expect(merged.licensePlate).toBe('XYZ789')
    expect(merged.vehicleMake).toBe('Honda')
  })

  it('returns the incoming ride when there is nothing to merge onto', () => {
    const r = ride()
    expect(mergeRide(null, r)).toBe(r)
  })

  it('does not resurrect a zero ETA over a known one', () => {
    const merged = mergeRide(ride({ etaMinutes: 4 }), ride({ etaMinutes: 0 }))
    expect(merged.etaMinutes).toBe(4)
  })
})
