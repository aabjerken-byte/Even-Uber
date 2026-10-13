import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { RideData } from '../models/RideData'
import { acquireBridge } from './bridge'
import { CONTAINERS, ContainerKey } from './constants'
import { GlassesText, diffText, formatIdle, formatRide } from './format'
import { buildPageLayout, validateLayout } from './layout'
import { renderMapBytes } from './rasterize'

/**
 * Pushes ride data to the G2 glasses.
 *
 * Lifecycle: `start()` once (creates the page), then `update()` on every ride
 * change, then `stop()` on teardown. Text is diffed so only changed lines cross
 * the Bluetooth link, and the map image is only re-sent when the coordinates or
 * ETA actually move.
 *
 * Every method is safe to call when there is no bridge — outside the Even App
 * this object quietly does nothing and the page behaves like a normal web app.
 */
export class GlassesRenderer {
  private bridge: EvenAppBridge | null = null
  private started = false
  private lastText: GlassesText = {}
  private lastMapKey = ''

  get isActive(): boolean {
    return this.started && this.bridge !== null
  }

  /** Create the glasses page. Returns false when running outside Even App. */
  async start(): Promise<boolean> {
    if (this.started) return this.isActive
    this.started = true

    this.bridge = await acquireBridge()
    if (!this.bridge) return false

    const layout = buildPageLayout()
    const errors = validateLayout(layout)
    if (errors.length > 0) {
      // Fail loudly here — the SDK would only answer `invalid`, with no detail.
      console.error('❌ Invalid glasses layout:', errors)
      this.bridge = null
      return false
    }

    try {
      // The SDK's methods take class instances, not the plain object literals
      // its README shows — they carry a `toJson` used on the way to native.
      // `layout.ts` stays SDK-free so it can be validated without a bridge; the
      // conversion happens here, at the boundary.
      const {
        CreateStartUpPageContainer,
        ImageContainerProperty,
        StartUpPageCreateResult,
        TextContainerProperty
      } = await import('@evenrealities/even_hub_sdk')

      const result = await this.bridge.createStartUpPageContainer(
        new CreateStartUpPageContainer({
          containerTotalNum: layout.containerTotalNum,
          textObject: layout.textObject.map((t) => new TextContainerProperty(t)),
          imageObject: layout.imageObject.map((i) => new ImageContainerProperty(i))
        })
      )

      if (result !== StartUpPageCreateResult.success) {
        console.error('❌ createStartUpPageContainer failed:', result)
        this.bridge = null
        return false
      }
    } catch (error) {
      console.error('❌ Could not create the glasses page:', error)
      this.bridge = null
      return false
    }

    console.info('🕶️ Glasses page created')
    // Force a full paint on the next update.
    this.lastText = {}
    await this.update(null)
    return true
  }

  /** Push a ride (or the idle screen when null). */
  async update(ride: RideData | null, now: number = Date.now()): Promise<void> {
    if (!this.bridge) return

    const next = ride ? formatRide(ride, now) : formatIdle()
    const changed = diffText(this.lastText, next)

    for (const key of Object.keys(changed) as ContainerKey[]) {
      const container = CONTAINERS[key]
      if (!container || key === 'map') continue

      try {
        const { TextContainerUpgrade } = await import('@evenrealities/even_hub_sdk')
        await this.bridge.textContainerUpgrade(
          new TextContainerUpgrade({
            containerID: container.id,
            containerName: container.name,
            content: changed[key] ?? ''
          })
        )
      } catch (error) {
        console.warn(`⚠️ Failed to update "${container.name}":`, error)
      }
    }

    this.lastText = next
    await this.updateMap(ride)
  }

  /**
   * Re-send the map only when its inputs change — it is by far the most
   * expensive thing we transmit.
   */
  private async updateMap(ride: RideData | null): Promise<void> {
    if (!this.bridge) return

    const key = ride
      ? [ride.requesterLat, ride.requesterLng, ride.driverLat, ride.driverLng, ride.etaMinutes].join(',')
      : 'idle'

    if (key === this.lastMapKey) return
    this.lastMapKey = key

    const bytes = ride
      ? renderMapBytes({
          requesterLat: ride.requesterLat,
          requesterLng: ride.requesterLng,
          driverLat: ride.driverLat,
          driverLng: ride.driverLng,
          etaMinutes: ride.etaMinutes
        })
      : null

    if (!bytes) return

    try {
      const { ImageRawDataUpdate, ImageRawDataUpdateResult } = await import(
        '@evenrealities/even_hub_sdk'
      )
      const result = await this.bridge.updateImageRawData(
        new ImageRawDataUpdate({
          containerID: CONTAINERS.map.id,
          containerName: CONTAINERS.map.name,
          imageData: bytes
        })
      )

      if (result !== ImageRawDataUpdateResult.success) {
        console.warn('⚠️ Map image update failed:', result)
      }
    } catch (error) {
      console.warn('⚠️ Map image update threw:', error)
    }
  }

  /** Close the glasses page. */
  async stop(): Promise<void> {
    if (this.bridge) {
      try {
        await this.bridge.shutDownPageContainer(0)
      } catch (error) {
        console.warn('⚠️ Failed to close the glasses page:', error)
      }
    }
    this.bridge = null
    this.started = false
    this.lastText = {}
    this.lastMapKey = ''
  }
}
