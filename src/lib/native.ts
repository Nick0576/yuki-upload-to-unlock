/**
 * Bridge to the Android shell.
 *
 * In a browser this module is a thin pass-through to `fetch`. Inside the Yuki
 * APK the same calls go through a native HTTP bridge: the API keys stay in the
 * app, CORS does not apply, and the app works without a local server.
 */

type HttpBridge = (id: string, method: string, path: string, headers: string, body: string) => void

interface NativeShell {
  http: HttpBridge
  speak: (text: string, rate: number, pitch: number) => void
  stopSpeak: () => void
  toast: (text: string) => void
  notify: (title: string, body: string) => void
  requestNotify: () => void
}

declare global {
  interface Window {
    __yuki?: NativeShell
    __yukiHttp?: HttpBridge
    __yukiHttpResult?: (id: string, status: number, text: string) => void
    __yukiSpeak?: (text: string, rate: number, pitch: number) => void
    __yukiStopSpeak?: () => void
    __yukiNotify?: (title: string, body: string) => void
    __yukiRequestNotify?: () => void
  }
}

/* Alias the Java interface to the small set of globals the app uses. */
if (typeof window !== 'undefined' && window.__yuki) {
  const shell = window.__yuki
  window.__yukiHttp = (...a) => shell.http(...a)
  window.__yukiSpeak = (t, r, p) => shell.speak(t, r, p)
  window.__yukiStopSpeak = () => shell.stopSpeak()
  window.__yukiNotify = (t, b) => shell.notify(t, b)
  window.__yukiRequestNotify = () => shell.requestNotify()
}

const pending = new Map<string, (r: { status: number; text: string }) => void>()
let seq = 0

export function nativeApp(): boolean {
  return typeof window !== 'undefined' && typeof window.__yukiHttp === 'function'
}

export function nativeNotifications(): boolean {
  return typeof window !== 'undefined' && typeof window.__yukiNotify === 'function'
}

export function askNativeNotificationPermission(): void {
  window.__yukiRequestNotify?.()
}

export function nativeNotify(title: string, body: string): void {
  window.__yukiNotify?.(title, body)
}

if (typeof window !== 'undefined') {
  window.__yukiHttpResult = (id, status, text) => {
    const done = pending.get(id)
    if (!done) return
    pending.delete(id)
    done({ status, text })
  }
}

function headerObject(h?: HeadersInit): Record<string, string> {
  if (!h) return {}
  if (typeof Headers !== 'undefined' && h instanceof Headers) {
    const out: Record<string, string> = {}
    h.forEach((v, k) => {
      out[k] = v
    })
    return out
  }
  if (Array.isArray(h)) return Object.fromEntries(h)
  return h as Record<string, string>
}

/** Drop-in replacement for `fetch` for the app's own /api routes. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!nativeApp()) return fetch(path, init)

  if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const id = `r${++seq}`
  const body = typeof init.body === 'string' ? init.body : ''

  const result = await new Promise<{ status: number; text: string }>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error('Request timed out'))
    }, 130_000)

    pending.set(id, (r) => {
      clearTimeout(timer)
      resolve(r)
    })

    init.signal?.addEventListener?.('abort', () => {
      clearTimeout(timer)
      pending.delete(id)
      reject(new DOMException('Aborted', 'AbortError'))
    })

    try {
      window.__yukiHttp!(id, (init.method || 'GET').toUpperCase(), path, JSON.stringify(headerObject(init.headers)), body)
    } catch (err) {
      clearTimeout(timer)
      pending.delete(id)
      reject(err)
    }
  })

  return new Response(result.text, {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
