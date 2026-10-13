import { describe, expect, it } from 'vitest'
import { RideData } from '../models/RideData'
import { LIMITS, MAP_HEIGHT, MAP_WIDTH } from './constants'
import { buildPageLayout, validateLayout } from './layout'
import { diffText, formatIdle, formatRide, truncate } from './format'
import { toGrayscaleBytes } from './rasterize'

const T0 = Date.parse('2026-08-17T12:00:00Z')

function ride(overrides: Partial<RideData> = {}): RideData {
  return {
    driverName: 'John D.',
    driverRating: 4.9,
    vehicleMake: 'Toyota',
    vehicleModel: 'Prius',
    vehicleColor: 'Silver',
    licensePlate: 'ABC123',
    etaMinutes: 3,
    timestamp: new Date(T0).toISOString(),
    ...overrides
  }
}

describe('buildPageLayout', () => {
  it('satisfies every SDK constraint', () => {
    expect(validateLayout(buildPageLayout())).toEqual([])
  })

  it('stays inside the documented container limits', () => {
    const layout = buildPageLayout()
    expect(layout.textObject.length).toBeLessThanOrEqual(LIMITS.maxTextContainers)
    expect(layout.imageObject.length).toBeLessThanOrEqual(LIMITS.maxImageContainers)
    expect(layout.containerTotalNum).toBeLessThanOrEqual(LIMITS.maxContainers)
    expect(layout.containerTotalNum).toBeGreaterThanOrEqual(LIMITS.minContainers)
  })

  it('keeps the map within the 288x144 image ceiling', () => {
    const [map] = buildPageLayout().imageObject
    expect(map.width).toBeLessThanOrEqual(LIMITS.image.maxWidth)
    expect(map.height).toBeLessThanOrEqual(LIMITS.image.maxHeight)
    expect(map.width).toBe(MAP_WIDTH)
    expect(map.height).toBe(MAP_HEIGHT)
  })

  it('nominates exactly one event-capture container', () => {
    const captures = buildPageLayout().textObject.filter((t) => t.isEventCapture === 1)
    expect(captures).toHaveLength(1)
  })
})

describe('validateLayout', () => {
  it('catches too many text containers', () => {
    const layout = buildPageLayout()
    const extra = { ...layout.textObject[1] }
    layout.textObject = Array.from({ length: 9 }, (_, i) => ({
      ...extra,
      containerID: 100 + i,
      containerName: `t${i}`,
      zOrderIndex: 100 + i,
      isEventCapture: i === 0 ? 1 : 0
    }))
    layout.containerTotalNum = layout.textObject.length + layout.imageObject.length

    expect(validateLayout(layout).join(' ')).toContain('exceeds max 8')
  })

  it('catches a missing or duplicated event capture', () => {
    const none = buildPageLayout()
    none.textObject = none.textObject.map((t) => ({ ...t, isEventCapture: 0 }))
    expect(validateLayout(none).join(' ')).toContain('isEventCapture')

    const many = buildPageLayout()
    many.textObject = many.textObject.map((t) => ({ ...t, isEventCapture: 1 }))
    expect(validateLayout(many).join(' ')).toContain('isEventCapture')
  })

  it('catches duplicate container IDs and z-orders', () => {
    const dupId = buildPageLayout()
    dupId.textObject[1].containerID = dupId.textObject[0].containerID
    expect(validateLayout(dupId).join(' ')).toContain('containerID values must be unique')

    const dupZ = buildPageLayout()
    dupZ.textObject[1].zOrderIndex = dupZ.textObject[0].zOrderIndex
    expect(validateLayout(dupZ).join(' ')).toContain('zOrderIndex values must be unique')
  })

  it('catches an oversized image container', () => {
    const layout = buildPageLayout()
    layout.imageObject[0].height = 200 // over the 144 ceiling
    expect(validateLayout(layout).join(' ')).toContain('height 200 outside')
  })

  it('catches containers running off the panel', () => {
    const layout = buildPageLayout()
    layout.textObject[0].xPosition = 560
    layout.textObject[0].width = 200
    expect(validateLayout(layout).join(' ')).toContain('extends past')
  })

  it('catches a mismatched containerTotalNum', () => {
    const layout = buildPageLayout()
    layout.containerTotalNum = 99
    expect(validateLayout(layout).join(' ')).toContain('does not match')
  })
})

describe('formatRide', () => {
  it('builds the ride lines', () => {
    const text = formatRide(ride(), T0)
    expect(text.driver).toBe('John D. ★4.9')
    expect(text.vehicle).toBe('Silver Toyota Prius')
    expect(text.plate).toBe('Plate ABC123')
    expect(text.eta).toBe('3 MIN')
    expect(text.status).toBe('ON THE WAY')
  })

  it('omits a rating when there is none', () => {
    expect(formatRide(ride({ driverRating: 0 }), T0).driver).toBe('John D.')
  })

  it('collapses gaps left by missing vehicle fields', () => {
    const text = formatRide(ride({ vehicleMake: '', vehicleModel: '' }), T0)
    expect(text.vehicle).toBe('Silver')
  })

  it('falls back rather than showing an empty line', () => {
    const text = formatRide(ride({ vehicleColor: '', vehicleMake: '', vehicleModel: '' }), T0)
    expect(text.vehicle).toBe('Vehicle details pending')
  })

  it('reflects terminal statuses', () => {
    expect(formatRide(ride({ status: 'arrived' }), T0).status).toBe('ARRIVED')
    expect(formatRide(ride({ status: 'cancelled' }), T0).eta).toBe('--')
  })

  it('shows -- instead of a stale number once the ETA lapses', () => {
    const text = formatRide(ride(), T0 + 20 * 60_000)
    expect(text.eta).toBe('--')
    expect(text.status).toBe('ETA UNKNOWN')
  })

  it('never exceeds the per-line character budget', () => {
    const long = ride({
      driverName: 'Bartholomew Fitzgerald-Windsor',
      vehicleColor: 'Metallic Champagne',
      vehicleMake: 'Mercedes-Benz',
      vehicleModel: 'S-Class Maybach'
    })
    const text = formatRide(long, T0)
    expect(text.driver!.length).toBeLessThanOrEqual(24)
    expect(text.vehicle!.length).toBeLessThanOrEqual(26)
  })
})

describe('truncate', () => {
  it('leaves short strings alone', () => {
    expect(truncate('short', 10)).toBe('short')
  })

  it('adds an ellipsis when cutting', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…')
    expect(truncate('abcdefghij', 5)).toHaveLength(5)
  })
})

describe('diffText', () => {
  it('returns only what changed', () => {
    const before = formatRide(ride(), T0)
    const after = formatRide(ride({ etaMinutes: 9 }), T0)
    const changed = diffText(before, after)

    expect(changed).toHaveProperty('eta')
    expect(changed).not.toHaveProperty('driver')
    expect(changed).not.toHaveProperty('plate')
  })

  it('is empty when nothing moved', () => {
    const text = formatRide(ride(), T0)
    expect(diffText(text, text)).toEqual({})
  })

  it('emits an empty string when a line clears', () => {
    expect(diffText({ plate: 'Plate ABC123' }, {})).toEqual({ plate: '' })
  })

  it('picks up the transition to idle', () => {
    const changed = diffText(formatRide(ride(), T0), formatIdle())
    expect(changed.driver).toBe('Even Uber')
    expect(changed.vehicle).toBe('No active ride')
  })
})

describe('toGrayscaleBytes', () => {
  it('produces one byte per pixel', () => {
    const width = 4
    const height = 2
    const data = new Uint8ClampedArray(width * height * 4)
    const image = { data, width, height, colorSpace: 'srgb' } as ImageData

    expect(toGrayscaleBytes(image)).toHaveLength(width * height)
  })

  it('maps pure white and pure black to the extremes', () => {
    const data = new Uint8ClampedArray([
      255, 255, 255, 255,
      0, 0, 0, 255
    ])
    const image = { data, width: 2, height: 1, colorSpace: 'srgb' } as ImageData

    const bytes = toGrayscaleBytes(image)
    expect(bytes[0]).toBe(255)
    expect(bytes[1]).toBe(0)
  })

  it('weights green most, per Rec. 601', () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255
    ])
    const image = { data, width: 3, height: 1, colorSpace: 'srgb' } as ImageData

    const [r, g, b] = toGrayscaleBytes(image)
    expect(g).toBeGreaterThan(r)
    expect(r).toBeGreaterThan(b)
    expect(g).toBe(150) // 0.587 * 255
  })
})
