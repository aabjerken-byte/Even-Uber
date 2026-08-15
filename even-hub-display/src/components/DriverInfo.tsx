export interface DriverInfoProps {
  name: string
  rating: number
  vehicle: string
  plate: string
}

/**
 * Display driver name, rating, vehicle info, and license plate
 * Optimized for 576x288 green monochrome display
 */
export default function DriverInfo({ name, rating, vehicle, plate }: DriverInfoProps) {
  return (
    <div className="driver-info">
      <div className="driver-name-rating">
        <h1>{name}</h1>
        <div className="rating">⭐ {rating.toFixed(1)}</div>
      </div>

      <div className="vehicle-info">
        <p className="vehicle-type">{vehicle}</p>
        <p className="license-plate">📋 {plate || 'N/A'}</p>
      </div>
    </div>
  )
}
