import { ApiResponse, RideData } from './models/RideData'
import { ApplyResult, RideStore, StoredRide } from './models/rideStore'

/**
 * Where ride data lives.
 *
 * - **server** — the dev setup: `npm run dev` / `dev:glasses`, with Express
 *   receiving updates from curl, the iOS app or the Uber backend.
 * - **local** — the packaged .ehpk running on the phone. There is no server;
 *   the ride lives in this page, persisted so a reload doesn't lose it.
 *
 * Detected once at startup by asking for the dev server's health check. In
 * the packaged app that request has nothing behind it and fails, or comes back
 * as something other than our JSON — either way, local.
 */
export type SourceMode = 'server' | 'local'

const STORAGE_KEY = 'even_uber_active_ride'
const DETECT_TIMEOUT_MS = 2000

function load(): StoredRide | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredRide) : null
  } catch {
    return null
  }
}

function save(stored: StoredRide | null): void {
  try {
    if (stored) localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable; the ride just won't survive a reload.
  }
}

const localStore = new RideStore(load(), save)

export async function detectMode(): Promise<SourceMode> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DETECT_TIMEOUT_MS)
    const response = await fetch('/health', { signal: controller.signal })
    clearTimeout(timer)
    if (!response.ok) return 'local'
    const body = await response.json()
    return body?.status === 'ok' ? 'server' : 'local'
  } catch {
    return 'local'
  }
}

/** The active ride, or null. Throws only when the dev server is unreachable. */
export async function fetchRide(mode: SourceMode): Promise<RideData | null> {
  if (mode === 'local') return localStore.current()

  const response = await fetch('/api/ride')
  if (!response.ok) return null
  const body: ApiResponse<RideData> = await response.json()
  return body.data ?? null
}

/** Feed an update in — the same rules apply whichever side holds the ride. */
export async function applyUpdate(mode: SourceMode, update: RideData): Promise<ApplyResult> {
  if (mode === 'local') return localStore.apply(update)

  const response = await fetch('/api/ride-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update)
  })
  const body = await response.json()
  if (!response.ok) return { status: 'invalid', error: body.error ?? `HTTP ${response.status}` }
  if (body.status === 'ignored') return { status: 'ignored', reason: body.message }
  return { status: 'updated', ride: body.data }
}

export async function clearRide(mode: SourceMode): Promise<void> {
  if (mode === 'local') {
    localStore.clear()
    return
  }
  await fetch('/api/ride-clear', { method: 'POST' })
}
