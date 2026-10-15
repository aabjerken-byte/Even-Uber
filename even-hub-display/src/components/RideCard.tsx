import { RideData } from '../models/RideData'
import { formatTripDistance, mapPoints, rangeRingMinutes, tripDistance } from '../models/rideTiming'
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
  const points = mapPoints(data)
  const distance = tripDistance(data)
  const distanceCaption = distance
    ? `${formatTripDistance(distance)}${data.destinationName ? ` to ${data.destinationName}` : ''}`
    : undefined

  return (
    <div className="ride-card">
      <DriverInfo
        name={data.driverName}
        rating={data.driverRating}
        vehicle={`${data.vehicleColor} ${data.vehicleMake} ${data.vehicleModel}`}
        plate={data.licensePlate}
      />

      <ETADisplay ride={data} />

      <LocationMap
        driverLat={points.targetLat}
        driverLng={points.targetLng}
        requesterLat={points.youLat}
        requesterLng={points.youLng}
        targetLabel={points.targetLabel}
        distanceCaption={distanceCaption}
        rangeMinutes={rangeRingMinutes(data) ?? undefined}
        status={data.status}
      />
    </div>
  )
}
