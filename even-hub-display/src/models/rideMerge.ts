import { RideData } from './RideData'

/**
 * Fold an incoming update onto the ride already on screen.
 *
 * Uber's notifications are incremental, and the terminal ones are the sparsest:
 * "Your driver has arrived" carries a status and nothing else. Replacing
 * wholesale would blank the driver card at the exact moment the user looks up
 * to find their car, so empty incoming fields defer to what we already know.
 * Status, ETA and timestamp always come from the newer message.
 */
export function mergeRide(previous: RideData | null, incoming: RideData): RideData {
  if (!previous) return incoming

  const preferIncoming = <T>(next: T | undefined, prev: T | undefined): T | undefined =>
    next === undefined || next === null || next === '' ? prev : next

  // A different driver means a different ride — don't carry anything over.
  if (
    incoming.driverName &&
    previous.driverName &&
    incoming.driverName !== previous.driverName
  ) {
    return incoming
  }

  return {
    ...previous,
    ...incoming,
    driverName: preferIncoming(incoming.driverName, previous.driverName) ?? '',
    driverRating: incoming.driverRating || previous.driverRating,
    vehicleMake: preferIncoming(incoming.vehicleMake, previous.vehicleMake) ?? '',
    vehicleModel: preferIncoming(incoming.vehicleModel, previous.vehicleModel) ?? '',
    vehicleColor: preferIncoming(incoming.vehicleColor, previous.vehicleColor) ?? '',
    licensePlate: preferIncoming(incoming.licensePlate, previous.licensePlate) ?? '',
    driverLat: preferIncoming(incoming.driverLat, previous.driverLat),
    driverLng: preferIncoming(incoming.driverLng, previous.driverLng),
    requesterLat: preferIncoming(incoming.requesterLat, previous.requesterLat),
    requesterLng: preferIncoming(incoming.requesterLng, previous.requesterLng),
    // An en-route update with no ETA keeps the previous one rather than
    // resetting the countdown to zero.
    etaMinutes: incoming.etaMinutes || previous.etaMinutes
  }
}
