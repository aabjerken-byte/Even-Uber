export interface LocationMapProps {
  driverLat?: number
  driverLng?: number
  requesterLat?: number
  requesterLng?: number
  /** Used to draw a range ring when the driver's coordinates are unknown. */
  etaMinutes?: number
}

const MAP_WIDTH = 280
const MAP_HEIGHT = 120
const PADDING = 12

/**
 * Average city driving speed (mph) used to turn an ETA into an approximate
 * distance. Only used for the range ring, never to place a driver pin.
 */
const ASSUMED_CITY_SPEED_MPH = 20

const EARTH_RADIUS_MILES = 3958.8

/** A coordinate of exactly 0 is valid (Gulf of Guinea) — don't treat it as absent. */
function isCoord(value?: number): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Great-circle distance in miles.
 *
 * The previous implementation treated a degree of longitude as equal to a
 * degree of latitude, which overstates east-west distance by ~21% at San
 * Francisco's latitude and by more the further from the equator you go.
 */
export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(a)))
}

function formatDistance(miles: number): string {
  if (miles < 0.1) return `${Math.round(miles * 5280)} ft`
  return `${miles.toFixed(1)} mi`
}

function GridBackground() {
  return (
    <>
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="#00FF00"
            strokeWidth="0.5"
            opacity="0.2"
          />
        </pattern>
      </defs>
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#000000" />
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#grid)" />
    </>
  )
}

/**
 * Location map for the G2 heads-up display.
 *
 * Renders one of three states depending on what data actually arrived:
 *
 * 1. **Driver + requester known** — both plotted, with the true distance.
 * 2. **Requester only** — you at centre, plus a ring at the distance implied
 *    by the ETA. This is the normal case for the notification pipeline, which
 *    never carries driver coordinates. No driver pin is drawn, because we do
 *    not know where they are and guessing on a HUD would be worse than
 *    admitting it.
 * 3. **Nothing** — placeholder.
 */
export default function LocationMap({
  driverLat,
  driverLng,
  requesterLat,
  requesterLng,
  etaMinutes
}: LocationMapProps) {
  const hasRequester = isCoord(requesterLat) && isCoord(requesterLng)
  const hasDriver = isCoord(driverLat) && isCoord(driverLng)

  // ── State 3: nothing to draw ────────────────────────────────────────────
  if (!hasRequester && !hasDriver) {
    return (
      <div className="location-map placeholder">
        <p>📍 Waiting for location…</p>
      </div>
    )
  }

  // ── State 1: both ends known ────────────────────────────────────────────
  if (hasRequester && hasDriver) {
    const distance = haversineMiles(requesterLat, requesterLng, driverLat, driverLng)

    // Pad the bounding box so neither marker sits on the edge, and keep a
    // floor so a driver a few metres away doesn't produce a degenerate extent.
    const latSpan = Math.max(Math.abs(driverLat - requesterLat), 0.002)
    const lngSpan = Math.max(Math.abs(driverLng - requesterLng), 0.002)

    const minLat = Math.min(driverLat, requesterLat) - latSpan * 0.3
    const maxLat = Math.max(driverLat, requesterLat) + latSpan * 0.3
    const minLng = Math.min(driverLng, requesterLng) - lngSpan * 0.3
    const maxLng = Math.max(driverLng, requesterLng) + lngSpan * 0.3

    const toX = (lng: number) =>
      PADDING + ((lng - minLng) / (maxLng - minLng)) * (MAP_WIDTH - 2 * PADDING)
    const toY = (lat: number) =>
      PADDING + ((maxLat - lat) / (maxLat - minLat)) * (MAP_HEIGHT - 2 * PADDING)

    const driverX = toX(driverLng)
    const driverY = toY(driverLat)
    const requesterX = toX(requesterLng)
    const requesterY = toY(requesterLat)

    return (
      <div className="location-map">
        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="map-svg">
          <GridBackground />

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

          <circle cx={requesterX} cy={requesterY} r="4" fill="#00FF00" />
          <text x={requesterX + 6} y={requesterY - 4} fill="#00FF00" fontSize="8">
            You
          </text>

          <polygon
            points={`${driverX},${driverY - 5} ${driverX - 4},${driverY + 3} ${driverX + 4},${driverY + 3}`}
            fill="#00FF00"
          />
          <text x={driverX - 8} y={driverY + 12} fill="#00FF00" fontSize="8">
            Driver
          </text>
        </svg>

        <div className="map-info">
          <p className="distance">📏 {formatDistance(distance)} away</p>
        </div>
      </div>
    )
  }

  // ── State 2: we know where you are, not where they are ──────────────────
  if (hasRequester) {
    const centerX = MAP_WIDTH / 2
    const centerY = MAP_HEIGHT / 2
    const maxRadius = Math.min(MAP_WIDTH, MAP_HEIGHT) / 2 - PADDING

    const estimatedMiles = isCoord(etaMinutes) && etaMinutes > 0
      ? (etaMinutes / 60) * ASSUMED_CITY_SPEED_MPH
      : null

    return (
      <div className="location-map">
        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="map-svg">
          <GridBackground />

          {estimatedMiles !== null && (
            <>
              {/* Inner reference ring at half the estimated distance */}
              <circle
                cx={centerX}
                cy={centerY}
                r={maxRadius / 2}
                fill="none"
                stroke="#00FF00"
                strokeWidth="0.5"
                strokeDasharray="2,3"
                opacity="0.3"
              />
              {/* The ETA ring — the driver is somewhere on or inside this */}
              <circle
                cx={centerX}
                cy={centerY}
                r={maxRadius}
                fill="none"
                stroke="#00FF00"
                strokeWidth="1"
                strokeDasharray="4,3"
                opacity="0.7"
              />
              <text
                x={centerX}
                y={centerY - maxRadius - 3}
                fill="#00FF00"
                fontSize="8"
                textAnchor="middle"
                opacity="0.8"
              >
                ~{formatDistance(estimatedMiles)}
              </text>
            </>
          )}

          <circle cx={centerX} cy={centerY} r="4" fill="#00FF00" />
          <text x={centerX + 6} y={centerY - 4} fill="#00FF00" fontSize="8">
            You
          </text>
        </svg>

        <div className="map-info">
          {estimatedMiles !== null ? (
            <p className="distance">
              📏 Driver within ~{formatDistance(estimatedMiles)}
            </p>
          ) : (
            <p className="distance">📍 Your position</p>
          )}
          <p className="map-note">Range estimated from ETA · exact position unavailable</p>
        </div>
      </div>
    )
  }

  // Driver known but not us — rare, but render what we have rather than
  // dropping to the placeholder.
  return (
    <div className="location-map">
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="map-svg">
        <GridBackground />
        <polygon
          points={`${MAP_WIDTH / 2},${MAP_HEIGHT / 2 - 5} ${MAP_WIDTH / 2 - 4},${MAP_HEIGHT / 2 + 3} ${MAP_WIDTH / 2 + 4},${MAP_HEIGHT / 2 + 3}`}
          fill="#00FF00"
        />
        <text x={MAP_WIDTH / 2 - 8} y={MAP_HEIGHT / 2 + 14} fill="#00FF00" fontSize="8">
          Driver
        </text>
      </svg>
      <div className="map-info">
        <p className="map-note">Your position unavailable — enable location on your phone</p>
      </div>
    </div>
  )
}
