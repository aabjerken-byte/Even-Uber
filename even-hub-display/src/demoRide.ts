import { RideData } from './models/RideData'

/**
 * A scripted ride for trying the app with no Uber ride and no dev server —
 * the packaged .ehpk on the glasses has neither.
 *
 * Runs pickup → arriving → arrived → on trip → complete over about three
 * minutes. The drop-off is placed ~2 miles north of where you are, and no
 * route distance is sent, so the on-trip distance comes from the phone's live
 * GPS — walk around and it moves.
 */
const MILES_PER_DEGREE_LAT = 69.09

export interface DemoOrigin {
  lat: number
  lng: number
}

/** Downtown San Francisco, for when the phone hasn't given us a fix yet. */
const FALLBACK_ORIGIN: DemoOrigin = { lat: 37.7755, lng: -122.418 }

export function runDemoRide(
  apply: (update: RideData) => void,
  origin: DemoOrigin | null
): () => void {
  const here = origin ?? FALLBACK_ORIGIN
  const stamp = () => new Date().toISOString()

  const steps: Array<[number, () => RideData]> = [
    [0, () => ({
      status: 'enroute',
      driverName: 'Demo Driver',
      driverRating: 4.9,
      vehicleMake: 'Toyota',
      vehicleModel: 'Prius',
      vehicleColor: 'Silver',
      licensePlate: 'DEMO123',
      etaMinutes: 2,
      requesterLat: here.lat,
      requesterLng: here.lng,
      timestamp: stamp()
    })],
    [20_000, () => ({ status: 'arriving', timestamp: stamp() } as RideData)],
    [35_000, () => ({ status: 'arrived', timestamp: stamp() } as RideData)],
    [50_000, () => ({
      status: 'ontrip',
      destinationName: 'Demo drop-off',
      destinationLat: here.lat + 2 / MILES_PER_DEGREE_LAT,
      destinationLng: here.lng,
      tripEtaMinutes: 8,
      timestamp: stamp()
    } as RideData)],
    [170_000, () => ({ status: 'completed', timestamp: stamp() } as RideData)]
  ]

  const timers = steps.map(([delay, build]) => setTimeout(() => apply(build()), delay))
  return () => timers.forEach(clearTimeout)
}
