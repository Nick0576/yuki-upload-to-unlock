/**
 * Local on-device AI (llama.cpp + GGUF) behind the Android shell.
 *
 * This is a separate engine from the Nomi cloud integration: the JS side only
 * talks to the native `__yuki` bridge, and the model is downloaded and run
 * entirely on the phone. No keys, no servers, no subscriptions.
 */
import { useEffect, useState } from 'react'
import type { NativeShell } from './native'

export interface LocalModel {
  id: string
  name: string
  file: string
  url: string
  size: number
  sha256: string
  context: number
}

export interface LocalStatus {
  supported: boolean
  installed: boolean
  verified: boolean
  loading: boolean
  loaded: boolean
  modelId: string
  path: string
  size: number
  error: string
  free: number
  totalRam: number
  models: LocalModel[]
}

export interface DownloadProgress {
  id: string
  bytes: number
  total: number
}

export interface LocalShell extends NativeShell {
  aiStatus: () => string
  aiDownload: (id: string) => void
  aiCancelDownload: () => void
  aiDelete: (id: string) => void
  aiLoad: (id: string) => void
  aiUnload: () => void
  aiGenerate: (id: string, prompt: string, maxTokens: number, temp: number, topP: number, topK: number) => void
  aiCancel: (id: string) => void
  aiPrompt: (system: string, history: string) => string
}

declare global {
  interface Window {
    __yukiLocalStatus?: (json: string) => void
    __yukiLocalProgress?: (json: string) => void
    __yukiLocalToken?: (id: string, text: string) => void
    __yukiLocalEnd?: (id: string, ok: boolean, reason: string) => void
  }
}

function shell(): LocalShell | undefined {
  return typeof window !== 'undefined' ? (window.__yuki as LocalShell | undefined) : undefined
}

export function localSupported(): boolean {
  const s = shell()
  return Boolean(s && typeof s.aiStatus === 'function')
}

/* ------------------------------------------------------------------ status */

const listeners = new Set<() => void>()
let version = 0
let cached: LocalStatus = {
  supported: localSupported(),
  installed: false,
  verified: false,
  loading: false,
  loaded: false,
  modelId: '',
  path: '',
  size: 0,
  error: '',
  free: 0,
  totalRam: 0,
  models: [],
}

export function localStatus(): LocalStatus {
  if (!localSupported()) return { ...cached, supported: false }
  try {
    const raw = shell()!.aiStatus()
    cached = { ...cached, ...(JSON.parse(raw) as Partial<LocalStatus>), supported: true }
  } catch {
    /* keep last status */
  }
  return cached
}

if (typeof window !== 'undefined') {
  window.__yukiLocalStatus = (json) => {
    try {
      cached = { ...cached, ...(JSON.parse(json) as Partial<LocalStatus>) }
      version += 1
      listeners.forEach((l) => l())
    } catch {
      /* ignore */
    }
  }
  window.__yukiLocalProgress = (json) => {
    try {
      const p = JSON.parse(json) as DownloadProgress & { done?: boolean; ok?: boolean; error?: string }
      downloadState = p
      progressVersion += 1
      progressListeners.forEach((l) => l())
    } catch {
      /* ignore */
    }
  }
}

function subscribeStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** React hook: re-renders when the native model status changes. */
export function useLocalStatus(): LocalStatus {
  const [, force] = useState(0)
  useEffect(() => {
    const bump = () => force((n) => n + 1)
    const unsub = subscribeStatus(bump)
    bump()
    return () => {
      unsub()
    }
  }, [])
  return localStatus()
}

/* --------------------------------------------------------------- download */

let downloadState: DownloadProgress & { done?: boolean; ok?: boolean; error?: string } = {
  id: '',
  bytes: 0,
  total: 0,
}
const progressListeners = new Set<() => void>()
let progressVersion = 0

export function downloadProgress(): typeof downloadState {
  return downloadState
}

export function useDownloadProgress(): typeof downloadState {
  const [, force] = useState(0)
  useEffect(() => {
    const bump = () => force((n) => n + 1)
    progressListeners.add(bump)
    return () => {
      progressListeners.delete(bump)
    }
  }, [])
  void progressVersion
  return downloadState
}

/** Start the in-app download. Resolves true when the model is verified. */
export async function localDownload(id: string): Promise<boolean> {
  if (!localSupported()) return false
  downloadState = { id, bytes: 0, total: 0 }
  progressVersion += 1
  progressListeners.forEach((l) => l())

  return new Promise<boolean>((resolve) => {
    let settled = false
    const done = (ok: boolean) => {
      if (settled) return
      settled = true
      unsubscribe()
      resolve(ok)
    }
    const check = () => {
      const p = downloadState
      if (p.id === id && p.done) done(Boolean(p.ok))
    }
    const unsubscribe = subscribeStatus(() => {
      check()
      if (cached.installed && cached.modelId === id) done(true)
    })
    progressListeners.add(check)
    try {
      shell()!.aiDownload(id)
    } catch {
      done(false)
      return
    }
    // Safety net: if the bridge dies, resolve after a long timeout.
    window.setTimeout(() => done(false), 1000 * 60 * 30)
  })
}

export function localCancelDownload(): void {
  shell()?.aiCancelDownload()
}

export function localDelete(id: string): void {
  shell()?.aiDelete(id)
  downloadState = { id: '', bytes: 0, total: 0 }
  progressListeners.forEach((l) => l())
}

export function localLoad(id: string): void {
  shell()?.aiLoad(id)
}

/**
 * Make sure the local model is installed and loaded.
 * Throws `not_installed`, `load_failed`, `load_timeout` or `unsupported`.
 */
export function ensureLocalModel(timeoutMs = 90_000): Promise<boolean> {
  const s = localStatus()
  if (!s.supported) return Promise.reject(new Error('unsupported'))
  if (!s.installed) return Promise.reject(new Error('not_installed'))
  if (s.loaded) return Promise.resolve(true)

  if (!s.loading) {
    const id = s.models[0]?.id || 'qwen2.5-1.5b'
    localLoad(id)
  }

  return new Promise<boolean>((resolve, reject) => {
    let timer = 0
    const unsub = subscribeStatus(() => {
      const st = localStatus()
      if (st.loaded) {
        cleanup()
        resolve(true)
      } else if (st.error) {
        cleanup()
        reject(new Error(st.error))
      }
    })
    const tick = () => {
      timer = window.setTimeout(() => {
        const st = localStatus()
        if (st.loaded) {
          cleanup()
          resolve(true)
        } else if (st.error) {
          cleanup()
          reject(new Error(st.error))
        } else if (Date.now() - started > timeoutMs) {
          cleanup()
          reject(new Error('load_timeout'))
        } else {
          tick()
        }
      }, 400)
    }
    const started = Date.now()
    const cleanup = () => {
      unsub()
      window.clearTimeout(timer)
    }
    tick()
  })
}

export function localUnload(): void {
  shell()?.aiUnload()
}

/* -------------------------------------------------------------- generate */

export interface LocalGenOptions {
  maxTokens?: number
  temperature?: number
  topP?: number
  topK?: number
  signal?: AbortSignal
}

/**
 * Run a prompt through the local model, yielding tokens as they are produced
 * by llama.cpp (real inference, streamed from the native thread).
 */
export async function* localGenerate(
  prompt: string,
  opts: LocalGenOptions = {},
): AsyncGenerator<string, { ok: boolean; reason: string }> {
  if (!localSupported()) {
    return { ok: false, reason: 'unsupported' }
  }

  const id = `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const queue: string[] = []
  let ended: { ok: boolean; reason: string } | null = null
  let wake: (() => void) | null = null

  const onToken = (tokenId: string, text: string) => {
    if (tokenId !== id) return
    queue.push(text)
    wake?.()
  }
  const onEnd = (tokenId: string, ok: boolean, reason: string) => {
    if (tokenId !== id) return
    ended = { ok, reason }
    wake?.()
  }

  const prevToken = window.__yukiLocalToken
  const prevEnd = window.__yukiLocalEnd
  window.__yukiLocalToken = onToken
  window.__yukiLocalEnd = onEnd

  try {
    shell()!.aiGenerate(
      id,
      prompt,
      opts.maxTokens ?? 160,
      opts.temperature ?? 0.8,
      opts.topP ?? 0.9,
      opts.topK ?? 40,
    )

    const abort = () => shell()?.aiCancel(id)
    opts.signal?.addEventListener('abort', abort, { once: true })

    try {
      while (true) {
        if (queue.length) {
          const chunk = queue.shift()!
          if (chunk) yield chunk
          continue
        }
        if (ended) break
        await new Promise<void>((resolve) => {
          wake = resolve
        })
        wake = null
      }
    } finally {
      opts.signal?.removeEventListener('abort', abort)
    }

    return ended ?? { ok: false, reason: 'stopped' }
  } finally {
    window.__yukiLocalToken = prevToken
    window.__yukiLocalEnd = prevEnd
  }
}

/* -------------------------------------------------------- chat formatting */

/** ChatML fallback so a prompt can be built before the model is loaded. */
export function buildChatPrompt(system: string, history: Array<[string, string]>): string {
  const s = [`<|im_start|>system`, system.trim(), `<|im_end|>`]
  for (const [role, text] of history) {
    s.push(`<|im_start|>${role}`, text.replace(/\n+/g, ' ').trim(), `<|im_end|>`)
  }
  s.push(`<|im_start|>assistant`, '')
  return s.join('\n')
}

/**
 * Format a chat with the model's own GGUF template when it is loaded.
 * `history` is `role\x1econtent\x1frole\x1econtent…`.
 */
export function nativeChatPrompt(system: string, history: string): string {
  try {
    const s = shell()
    if (!s || typeof s.aiPrompt !== 'function') return ''
    const out = s.aiPrompt(system, history)
    return out || ''
  } catch {
    return ''
  }
}

export function encodeHistory(history: Array<[string, string]>): string {
  return history
    .map(([role, text]) => `${role}\x1e${String(text).replace(/[\x1e\x1f]/g, ' ')}`)
    .join('\x1f')
}
