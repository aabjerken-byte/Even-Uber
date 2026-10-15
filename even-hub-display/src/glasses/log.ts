/**
 * Glasses diagnostics that reach the dev machine.
 *
 * Inside the Even App the WebView's console is invisible, so in dev-server mode
 * every glasses log line is also POSTed to the display server
 * (`/api/debug-log`), which prints it. The packaged app has no server, so the
 * relay stays off there. Lines logged before the mode is known are held and
 * flushed (or dropped) once it is. Fire-and-forget: logging must never break
 * rendering.
 */

type Level = 'info' | 'warn' | 'error'

interface Line {
  level: Level
  message: string
  detail: string
}

let relay: boolean | null = null
const held: Line[] = []

function describe(detail: unknown): string {
  if (detail === undefined) return ''
  if (detail instanceof Error) return `${detail.name}: ${detail.message}`
  try {
    return typeof detail === 'string' ? detail : JSON.stringify(detail)
  } catch {
    return String(detail)
  }
}

function send(line: Line): void {
  if (typeof fetch === 'undefined') return
  void fetch('/api/debug-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(line)
  }).catch(() => {})
}

/** Turn the relay on (dev server present) or off (packaged app). */
export function setLogRelay(enabled: boolean): void {
  relay = enabled
  const pending = held.splice(0)
  if (enabled) pending.forEach(send)
}

export function glassesLog(level: Level, message: string, detail?: unknown): void {
  if (detail === undefined) console[level](message)
  else console[level](message, detail)

  const line = { level, message, detail: describe(detail) }
  if (relay === true) send(line)
  else if (relay === null && held.length < 50) held.push(line)
}
