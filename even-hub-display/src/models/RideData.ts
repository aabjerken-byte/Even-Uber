/**
 * Lifecycle of a ride, so the display knows when to stop showing a card.
 *
 * Without this the last ride stayed on screen forever — a HUD confidently
 * reporting "1 MIN · ARRIVING" long after the trip ended.
 */
export type RideStatus =
  | 'enroute'    // driver on the way, ETA meaningful
  | 'arriving'   // pulling up now
  | 'arrived'    // waiting at the pickup point
  | 'completed'  // trip finished
  | 'cancelled'  // ride cancelled

/** Statuses after which the card should be cleared rather than kept alive. */
export const TERMINAL_RIDE_STATUSES: readonly RideStatus[] = [
  'arrived',
  'completed',
  'cancelled'
]

export function isTerminalStatus(status?: RideStatus): boolean {
  return status !== undefined && TERMINAL_RIDE_STATUSES.includes(status)
}

/**
 * RideData model matching the iOS companion app + advanced features
 */
export interface RideData {
  /** Defaults to 'enroute' when a producer omits it. */
  status?: RideStatus
  driverName: string
  driverRating: number
  vehicleMake: string
  vehicleModel: string
  vehicleColor: string
  licensePlate: string
  etaMinutes: number
  driverLat?: number
  driverLng?: number
  requesterLat?: number
  requesterLng?: number
  timestamp: string
  // Advanced features
  driverPhone?: string
  driverAvatar?: string
  vehiclePhoto?: string
  driverFullName?: string
  totalRides?: number
  acceptanceRate?: number
  cancellationRate?: number
}

/**
 * Chat message interface for driver communication
 */
export interface ChatMessage {
  id: string
  sender: 'driver' | 'user'
  message: string
  timestamp: Date
  read: boolean
}

/**
 * API request/response types
 */
export interface RideUpdateRequest extends RideData {
  // Same structure as RideData
}

export interface ApiResponse<T> {
  status: string
  data?: T
  error?: string
  message?: string
}

export interface HealthResponse {
  status: string
  uptime?: number
  timestamp?: string
}
