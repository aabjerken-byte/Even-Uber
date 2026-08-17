import { MAP_HEIGHT, MAP_WIDTH } from './constants'

/**
 * Turning the map into something the glasses can display.
 *
 * The React `LocationMap` is an SVG in the DOM — the glasses never see it. The
 * SDK takes an image container's contents as bytes via `updateImageRawData`,
 * so the map has to be rasterised first.
 *
 * ⚠️ Unverified against hardware. The SDK's README annotates `imageData` as
 * "grayscale bytes", which is what `toGrayscaleBytes` produces (one byte per
 * pixel, row-major). But `ImageRawDataUpdateResult` also has an
 * `imageToGray4Failed` case, implying the host does its own conversion from an
 * encoded image and would rather receive PNG bytes. `encodeAsPng` covers that
 * reading. Both are implemented; switch with `RASTER_FORMAT` after a device
 * test rather than guessing.
 */
export type RasterFormat = 'grayscale' | 'png'

export const RASTER_FORMAT: RasterFormat = 'grayscale'

export interface MapRenderInput {
  requesterLat?: number
  requesterLng?: number
  driverLat?: number
  driverLng?: number
  etaMinutes?: number
}

function isCoord(value?: number): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Draw the map to a canvas.
 *
 * Deliberately a direct canvas draw rather than rendering the SVG component —
 * serialising SVG through an `Image` needs a data-URL round trip that is slower
 * and silently fails under some CSP settings. The shapes mirror `LocationMap`:
 * you at centre, driver plotted when known, otherwise an ETA range ring.
 */
export function drawMap(
  ctx: CanvasRenderingContext2D,
  input: MapRenderInput,
  width = MAP_WIDTH,
  height = MAP_HEIGHT
): void {
  const cx = width / 2
  const cy = height / 2

  // The panel is monochrome green; render white-on-black and let the host map
  // it to the display's single colour.
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#FFFFFF'
  ctx.fillStyle = '#FFFFFF'
  ctx.lineWidth = 1

  // Bind to locals so the narrowing survives into the branches below.
  const rLat = input.requesterLat
  const rLng = input.requesterLng
  const dLat = input.driverLat
  const dLng = input.driverLng

  const hasRequester = isCoord(rLat) && isCoord(rLng)
  const hasDriver = isCoord(dLat) && isCoord(dLng)

  if (isCoord(rLat) && isCoord(rLng) && isCoord(dLat) && isCoord(dLng)) {
    // Both known: place them on a padded bounding box.
    const pad = 16
    const latSpan = Math.max(Math.abs(dLat - rLat), 0.002)
    const lngSpan = Math.max(Math.abs(dLng - rLng), 0.002)

    const minLat = Math.min(dLat, rLat) - latSpan * 0.3
    const maxLat = Math.max(dLat, rLat) + latSpan * 0.3
    const minLng = Math.min(dLng, rLng) - lngSpan * 0.3
    const maxLng = Math.max(dLng, rLng) + lngSpan * 0.3

    const toX = (lng: number) => pad + ((lng - minLng) / (maxLng - minLng)) * (width - pad * 2)
    const toY = (lat: number) => pad + ((maxLat - lat) / (maxLat - minLat)) * (height - pad * 2)

    const dx = toX(dLng)
    const dy = toY(dLat)
    const rx = toX(rLng)
    const ry = toY(rLat)

    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(rx, ry)
    ctx.lineTo(dx, dy)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.beginPath()
    ctx.arc(rx, ry, 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(dx, dy - 6)
    ctx.lineTo(dx - 5, dy + 4)
    ctx.lineTo(dx + 5, dy + 4)
    ctx.closePath()
    ctx.fill()
    return
  }

  if (hasRequester && !hasDriver) {
    // Only our own position: ring at the ETA-implied distance. No driver pin —
    // see NOTIFICATION_ACCESS.md for why we refuse to guess one.
    const maxRadius = Math.min(width, height) / 2 - 12

    if (isCoord(input.etaMinutes) && input.etaMinutes > 0) {
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(cx, cy, maxRadius / 2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  // Nothing to draw.
  ctx.setLineDash([2, 2])
  ctx.strokeRect(8, 8, width - 16, height - 16)
  ctx.setLineDash([])
}

function createCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/**
 * Rec. 601 luma, one byte per pixel, row-major.
 */
export function toGrayscaleBytes(image: ImageData): Uint8Array {
  const { data, width, height } = image
  const out = new Uint8Array(width * height)

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    out[p] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
  }

  return out
}

/** Render the map and return bytes ready for `updateImageRawData`. */
export function renderMapBytes(input: MapRenderInput): Uint8Array | null {
  const canvas = createCanvas(MAP_WIDTH, MAP_HEIGHT)
  if (!canvas) return null

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  drawMap(ctx, input)

  if (RASTER_FORMAT === 'png') {
    return encodeAsPng(canvas)
  }

  return toGrayscaleBytes(ctx.getImageData(0, 0, MAP_WIDTH, MAP_HEIGHT))
}

/** PNG bytes, for the "host converts the image itself" reading of the API. */
export function encodeAsPng(canvas: HTMLCanvasElement): Uint8Array | null {
  const dataUrl = canvas.toDataURL('image/png')
  const base64 = dataUrl.split(',')[1]
  if (!base64) return null

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}
