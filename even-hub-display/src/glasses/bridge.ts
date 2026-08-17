import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'

/**
 * Acquiring the Even App bridge, safely.
 *
 * The SDK only works inside the Even App's WebView, where the host injects
 * `window.flutter_inappwebview.callHandler`. In an ordinary browser —
 * `npm run dev`, or the 576×288 preview — that object is absent and
 * `waitForEvenAppBridge()` waits for a `evenAppBridgeReady` event that will
 * never fire. So we feature-detect first and time out second; the display must
 * degrade to a plain web page rather than hang.
 */

declare global {
  interface Window {
    flutter_inappwebview?: { callHandler?: unknown }
  }
}

const BRIDGE_TIMEOUT_MS = 5000

/** True when running inside the Even App WebView. */
export function isEvenAppWebView(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.flutter_inappwebview?.callHandler !== 'undefined'
  )
}

/**
 * Resolve the bridge, or null when unavailable.
 *
 * Never throws and never hangs — callers treat null as "run as a web page".
 */
export async function acquireBridge(): Promise<EvenAppBridge | null> {
  if (!isEvenAppWebView()) {
    console.info('ℹ️ Not running in Even App WebView — glasses output disabled')
    return null
  }

  try {
    const { waitForEvenAppBridge } = await import('@evenrealities/even_hub_sdk')

    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), BRIDGE_TIMEOUT_MS)
    )

    const bridge = await Promise.race([waitForEvenAppBridge(), timeout])

    if (!bridge) {
      console.warn(`⚠️ Even App bridge did not become ready within ${BRIDGE_TIMEOUT_MS}ms`)
      return null
    }

    return bridge
  } catch (error) {
    console.warn('⚠️ Failed to load the Even Hub SDK:', error)
    return null
  }
}
