import type { DB, Settings, Thread } from './types'

const AGE_KEY = 'yuki.age.ok'
const DB_VERSION = 1

export const DEFAULT_SETTINGS: Settings = {
  theme: 'sakura',
  mode: 'dark',
  language: 'en',
  spicy: false,
  tts: true,
  autoSpeak: false,
  notifications: false,
  proactiveMinutes: 45,
  aiMode: 'nomi',
  nomisId: '',
  region: 'ph',
}

export function getAgeOk(): boolean {
  try {
    const raw = localStorage.getItem(AGE_KEY)
    if (!raw) return false
    const data = JSON.parse(raw)
    return Boolean(data?.ok)
  } catch {
    return false
  }
}

export function setAgeOk(ok: boolean, declined = false): void {
  localStorage.setItem(AGE_KEY, JSON.stringify({ ok, declined, at: Date.now() }))
}

export function getAgeDeclined(): boolean {
  try {
    const data = JSON.parse(localStorage.getItem(AGE_KEY) || '{}')
    return Boolean(data?.declined)
  } catch {
    return false
  }
}

export function newThread(opts: {
  title?: string
  scenario?: string
  locationId?: string
  opener?: string
}): Thread {
  const now = Date.now()
  return {
    id: `t_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    title: opts.title || 'With Yuki',
    scenario: opts.scenario || 'Just us',
    locationId: opts.locationId || 'bedroom',
    messages: [],
    createdAt: now,
    updatedAt: now,
    affection: 4,
    mood: 1,
    archived: false,
    memory: { facts: [], summary: '' },
    streak: 0,
    unread: 0,
  }
}

export function defaultDB(email: string): DB {
  return {
    v: DB_VERSION,
    ageOk: true,
    account: undefined,
    userName: '',
    persona: {
      name: 'Yuki',
      avatar: 'happy',
      personality: 'sweet, playful, a little possessive, secretly soft-hearted',
      speakingStyle: 'soft & sweet',
    },
    settings: { ...DEFAULT_SETTINGS },
    threads: [],
    activeThreadId: undefined,
    stickers: [],
    selfies: [],
    createdAt: Date.now(),
    ...(email ? {} : {}),
  }
}

function keyFor(email: string | undefined): string {
  const id = (email || 'guest').toLowerCase().replace(/[^a-z0-9@._-]/g, '_')
  return `yuki.db.v1.${id}`
}

export function loadDB(email: string | undefined): DB {
  const key = keyFor(email)
  const fallback = defaultDB(email || '')
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<DB>
    return {
      ...fallback,
      ...parsed,
      persona: { ...fallback.persona, ...(parsed.persona || {}) },
      settings: { ...fallback.settings, ...(parsed.settings || {}) },
      threads: Array.isArray(parsed.threads) ? parsed.threads : [],
      stickers: Array.isArray(parsed.stickers) ? parsed.stickers : [],
      selfies: Array.isArray(parsed.selfies) ? parsed.selfies : [],
    }
  } catch {
    return fallback
  }
}

let saveTimer: number | undefined
export function saveDB(email: string | undefined, db: DB): void {
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(keyFor(email), JSON.stringify(db))
    } catch (err) {
      // Quota: drop oldest selfies and retry once.
      try {
        const trimmed: DB = { ...db, selfies: db.selfies.slice(-6) }
        localStorage.setItem(keyFor(email), JSON.stringify(trimmed))
      } catch {
        console.warn('[yuki] could not save', err)
      }
    }
  }, 250)
}

export function wipeDB(email: string | undefined): void {
  localStorage.removeItem(keyFor(email))
}
