/**
 * Glasses diagnostics that reach the dev machine.
 *
 * Inside the Even App the WebView's console is invisible, so every glasses log
 * line is also POSTed to the display server (`/api/debug-log`), which prints
 * it. Fire-and-forget: logging must never break rendering.
 */

type Level = 'info' | 'warn' | 'error'

function describe(detail: unknown): string {
  if (detail === undefined) return ''
  if (detail instanceof Error) return `${detail.name}: ${detail.message}`
  try {
    return typeof detail === 'string' ? detail : JSON.stringify(detail)
  } catch {
    return String(detail)
  }
}

export function glassesLog(level: Level, message: string, detail?: unknown): void {
  if (detail === undefined) console[level](message)
  else console[level](message, detail)

  if (typeof fetch === 'undefined') return
  void fetch('/api/debug-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, message, detail: describe(detail) })
  }).catch(() => {})
}
