export interface LocationMapProps {
  driverLat?: number
  driverLng?: number
  requesterLat?: number
  requesterLng?: number
}

/**
 * Simple location map showing driver vs requester position
 * Optimized for small 576x288 micro-LED display
 * Note: This is a simplified version; production would use a real map library
 */
export default function LocationMap({
  driverLat,
  driverLng,
  requesterLat,
  requesterLng
}: LocationMapProps) {
  const hasLocation = driverLat && driverLng && requesterLat && requesterLng

  if (!hasLocation) {
    return (
      <div className="location-map placeholder">
        <p>📍 Location data unavailable</p>
      </div>
    )
  }

  // Calculate simple distance (in degrees; not accurate but visual)
  const latDiff = Math.abs(driverLat - requesterLat)
  const lngDiff = Math.abs(driverLng - requesterLng)
  const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69 // Rough miles conversion

  // Position driver and requester on a simple 2D map
  // Normalize coordinates to fit in display area
  const mapWidth = 280
  const mapHeight = 120
  const padding = 10

  const minLat = Math.min(driverLat, requesterLat) - 0.01
  const maxLat = Math.max(driverLat, requesterLat) + 0.01
  const minLng = Math.min(driverLng, requesterLng) - 0.01
  const maxLng = Math.max(driverLng, requesterLng) + 0.01

  const normalizeX = (lng: number) => {
    return padding + ((lng - minLng) / (maxLng - minLng)) * (mapWidth - 2 * padding)
  }

  const normalizeY = (lat: number) => {
    return padding + ((maxLat - lat) / (maxLat - minLat)) * (mapHeight - 2 * padding)
  }

  const driverX = normalizeX(driverLng)
  const driverY = normalizeY(driverLat)
  const requesterX = normalizeX(requesterLng)
  const requesterY = normalizeY(requesterLat)

  return (
    <div className="location-map">
      <svg
        width={mapWidth}
        height={mapHeight}
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        className="map-svg"
      >
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#00FF00" strokeWidth="0.5" opacity="0.2" />
          </pattern>
        </defs>
        <rect width={mapWidth} height={mapHeight} fill="#000000" />
        <rect width={mapWidth} height={mapHeight} fill="url(#grid)" />

        {/* Connecting line */}
        <line
          x1={requesterX}
          y1={requesterY}
          x2={driverX}
          y2={driverY}
          stroke="#00FF00"
          strokeWidth="1"
          strokeDasharray="2,2"
          opacity="0.5"
        />

        {/* Requester (you) */}
        <circle cx={requesterX} cy={requesterY} r="4" fill="#00FF00" />
        <text x={requesterX + 6} y={requesterY - 4} fill="#00FF00" fontSize="8">
          You
        </text>

        {/* Driver */}
        <polygon
          points={`${driverX},${driverY - 5} ${driverX - 4},${driverY + 3} ${driverX + 4},${driverY + 3}`}
          fill="#00FF00"
        />
        <text x={driverX - 8} y={driverY + 12} fill="#00FF00" fontSize="8">
          Driver
        </text>
      </svg>

      <div className="map-info">
        <p className="distance">📏 {distance.toFixed(1)} mi away</p>
      </div>
    </div>
  )
}
