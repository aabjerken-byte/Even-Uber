import { useEffect, useState } from 'react'
import { acquireBridge } from './bridge'
import { glassesLog } from './log'

export interface PhoneLocation {
  lat: number
  lng: number
  /** Epoch ms of the fix. */
  at: number
}

/**
 * Follow the phone's location through the Even App.
 *
 * The page runs inside the Even App, which owns the phone's GPS; the SDK hands
 * us fixes without any companion app. Medium accuracy with a distance filter
 * keeps it on wifi/cell positioning rather than holding GPS awake for a fix
 * every second. Returns null outside the Even App or until the first fix.
 */
export function usePhoneLocation(): PhoneLocation | null {
  const [location, setLocation] = useState<PhoneLocation | null>(null)

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | null = null
    let started = false

    void (async () => {
      const bridge = await acquireBridge()
      if (!bridge || cancelled) return

      const { AppLocationAccuracy } = await import('@evenrealities/even_hub_sdk')
      const accept = (fix: { latitude: number; longitude: number; timestamp?: number }) => {
        if (cancelled || !Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude)) return
        setLocation({ lat: fix.latitude, lng: fix.longitude, at: fix.timestamp ?? Date.now() })
      }

      try {
        unsubscribe = bridge.onAppLocationChanged(accept)
        started = await bridge.startAppLocationUpdates({
          accuracy: AppLocationAccuracy.Medium,
          distanceFilter: 25,
          intervalMs: 5000
        })
        glassesLog('info', started ? '📍 Location updates started' : '⚠️ Location updates refused')

        const first = await bridge.getAppLocation({ accuracy: AppLocationAccuracy.Medium, timeoutMs: 10_000 })
        if (first) accept(first)
      } catch (error) {
        glassesLog('warn', '⚠️ Location unavailable', error)
      }
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
      if (started) {
        void acquireBridge().then((bridge) => bridge?.stopAppLocationUpdates())
      }
    }
  }, [])

  return location
}
