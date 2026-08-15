import { RideData } from '../models/RideData'
import DriverInfo from './DriverInfo'
import ETADisplay from './ETADisplay'
import LocationMap from './LocationMap'

export interface RideCardProps {
  data: RideData
}

/**
 * Main ride card component - displays driver info, ETA, and location on G2
 * Optimized for 576x288 monochrome green micro-LED display
 */
export default function RideCard({ data }: RideCardProps) {
  return (
    <div className="ride-card">
      <DriverInfo
        name={data.driverName}
        rating={data.driverRating}
        vehicle={`${data.vehicleColor} ${data.vehicleMake} ${data.vehicleModel}`}
        plate={data.licensePlate}
      />

      <ETADisplay minutes={data.etaMinutes} />

      <LocationMap
        driverLat={data.driverLat}
        driverLng={data.driverLng}
        requesterLat={data.requesterLat}
        requesterLng={data.requesterLng}
      />
    </div>
  )
}
