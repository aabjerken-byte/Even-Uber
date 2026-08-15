/**
 * RideData model matching the iOS companion app + advanced features
 */
export interface RideData {
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
