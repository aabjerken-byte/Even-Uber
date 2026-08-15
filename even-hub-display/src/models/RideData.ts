/**
 * RideData model matching the iOS companion app
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
