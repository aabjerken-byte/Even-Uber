import { useEffect, useRef, useState } from 'react'
import { RideData } from '../models/RideData'
import { GlassesRenderer } from './renderer'

/**
 * Mirror the current ride onto the G2 glasses.
 *
 * No-ops outside the Even App WebView, so the browser preview is unaffected.
 * Returns whether the glasses page is live, for the connection indicator.
 */
export function useGlasses(ride: RideData | null): boolean {
  const rendererRef = useRef<GlassesRenderer | null>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const renderer = new GlassesRenderer()
    rendererRef.current = renderer

    let cancelled = false
    renderer.start().then((ok) => {
      if (!cancelled) setActive(ok)
    })

    return () => {
      cancelled = true
      rendererRef.current = null
      void renderer.stop()
    }
  }, [])

  useEffect(() => {
    void rendererRef.current?.update(ride)
  }, [ride])

  return active
}
