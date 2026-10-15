import { describe, expect, it } from 'vitest'
import { RideData } from './RideData'
import { RideStore, StoredRide } from './rideStore'
import { RIDE_STALE_AFTER_MS, TERMINAL_RIDE_LINGER_MS, currentPosition, mapPoints } from './rideTiming'

const T0 = Date.parse('2026-10-15T12:00:00Z')

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

describe('RideStore', () => {
  it('rejects an en-route update with no driver', () => {
    const result = new RideStore().apply(ride({ driverName: '' }), T0)
    expect(result.status).toBe('invalid')
  })

  it('ignores a transition when no ride is active', () => {
    const store = new RideStore()
    const result = store.apply({ status: 'completed', timestamp: new Date(T0).toISOString() } as RideData, T0)
    expect(result.status).toBe('ignored')
    expect(store.current(T0)).toBeNull()
  })

  it('merges a bare transition onto the active ride', () => {
    const store = new RideStore()
    store.apply(ride(), T0)
    store.apply({ status: 'ontrip', destinationName: 'SFO', timestamp: new Date(T0).toISOString() } as RideData, T0)
    expect(store.current(T0)).toMatchObject({ status: 'ontrip', driverName: 'John D.', destinationName: 'SFO' })
  })

  it('expires rides by status, measured from when they were received', () => {
    const store = new RideStore()
    store.apply(ride(), T0)
    expect(store.current(T0 + RIDE_STALE_AFTER_MS - 1)).not.toBeNull()
    expect(store.current(T0 + RIDE_STALE_AFTER_MS + 1)).toBeNull()

    store.apply(ride(), T0)
    store.apply({ status: 'completed', timestamp: new Date(T0).toISOString() } as RideData, T0)
    expect(store.current(T0 + TERMINAL_RIDE_LINGER_MS + 1)).toBeNull()
  })

  it('reports every change so the phone can persist the ride', () => {
    const seen: Array<StoredRide | null> = []
    const store = new RideStore(null, (s) => seen.push(s))
    store.apply(ride(), T0)
    store.clear()
    expect(seen.map((s) => s?.ride.driverName ?? null)).toEqual(['John D.', null])
  })

  it('restores a persisted ride', () => {
    const store = new RideStore({ ride: ride({ status: 'ontrip' }), receivedAt: T0 })
    expect(store.current(T0 + 60_000)?.status).toBe('ontrip')
  })
})

describe('phone position', () => {
  it('beats the pickup point and the car', () => {
    const r = ride({ status: 'ontrip', phoneLat: 1, phoneLng: 2, driverLat: 3, driverLng: 4, requesterLat: 5, requesterLng: 6 })
    expect(currentPosition(r)).toEqual({ lat: 1, lng: 2 })
  })

  it('is "you" on the pickup map too', () => {
    const points = mapPoints(ride({ phoneLat: 1, phoneLng: 2, requesterLat: 5, requesterLng: 6, driverLat: 3, driverLng: 4 }))
    expect(points).toMatchObject({ youLat: 1, youLng: 2, targetLat: 3, targetLng: 4, targetLabel: 'Driver' })
  })
})
