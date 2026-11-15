import type { Account } from './types'
import { apiFetch } from './native'

const TOKEN_KEY = 'yuki.session'
const USERS_KEY = 'yuki.users'

interface LocalUser {
  id: string
  email: string
  salt: string
  hash: string
  createdAt: number
}

function b64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function fromB64(s: string): Uint8Array {
  return new Uint8Array(atob(s).split('').map((c) => c.charCodeAt(0)))
}

async function hashPassword(password: string, saltB64?: string): Promise<{ salt: string; hash: string }> {
  const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 120_000, hash: 'SHA-256' },
    key,
    256
  )
  return { salt: b64(salt.buffer as ArrayBuffer), hash: b64(bits) }
}

function readUsers(): LocalUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as LocalUser[]) : []
  } catch {
    return []
  }
}

function writeUsers(users: LocalUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

/* --------------------------------------------------------------- offline */

export async function localRegister(email: string, password: string): Promise<Account> {
  const e = email.trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(e)) throw new Error('Enter a valid email address.')
  if (password.length < 6) throw new Error('Password needs at least 6 characters.')
  const users = readUsers()
  if (users.some((u) => u.email === e)) throw new Error('That email already has an offline account here.')
  const { salt, hash } = await hashPassword(password)
  const user: LocalUser = { id: `local_${Date.now().toString(36)}`, email: e, salt, hash, createdAt: Date.now() }
  users.push(user)
  writeUsers(users)
  return { email: e, provider: 'offline', localId: user.id }
}

export async function localLogin(email: string, password: string): Promise<Account> {
  const e = email.trim().toLowerCase()
  const users = readUsers()
  const user = users.find((u) => u.email === e)
  if (!user) throw new Error('No offline account for that email. Create one instead.')
  const { hash } = await hashPassword(password, user.salt)
  if (hash !== user.hash) throw new Error('Wrong password.')
  return { email: e, provider: 'offline', localId: user.id }
}

/* -------------------------------------------------------------- koolbase */

async function post(path: string, body: unknown, token?: string): Promise<{ status: number; data: any }> {
  const res = await apiFetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function kbError(status: number, data: any): string {
  const code = data?.code || data?.error
  const map: Record<string, string> = {
    invalid_credentials: 'Wrong email or password.',
    email_not_verified: 'Verify your email first — check your inbox for the link.',
    contact_not_verified: 'Verify your email first — check your inbox for the link.',
    email_taken: 'That email is already registered. Try signing in.',
    user_disabled: 'This account has been disabled.',
    auth_not_configured: 'Cloud sign-in is not configured on this server. Use an offline account.',
    nomi_not_configured: 'Nomi is not configured on this server.',
  }
  if (code && map[code]) return map[code]
  if (status === 0) return 'No connection.'
  return data?.message || data?.error || 'Something went wrong. Try again.'
}

export async function cloudRegister(email: string, password: string): Promise<{ verify: boolean; account?: Account }> {
  const { status, data } = await post('/api/auth/register', { email: email.trim(), password })
  if (status === 201 || status === 200) {
    if (data?.token) {
      setToken(data.token)
      return { verify: false, account: { email: data.user?.email || email, provider: 'koolbase' } }
    }
    return { verify: true }
  }
  const code = data?.code || data?.error
  if (code === 'email_taken') return { verify: false, account: await cloudLogin(email, password) }
  throw new Error(kbError(status, data))
}

export async function cloudLogin(email: string, password: string): Promise<Account> {
  const { status, data } = await post('/api/auth/login', { email: email.trim(), password })
  if (status === 200 && data?.token) {
    setToken(data.token)
    return { email: data.user?.email || email.trim(), provider: 'koolbase' }
  }
  throw new Error(kbError(status, data))
}

export async function cloudMe(): Promise<Account | null> {
  const token = getToken()
  if (!token) return null
  try {
    const res = await apiFetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    const data = await res.json()
    return { email: data.email, provider: 'koolbase' }
  } catch {
    return null
  }
}

export async function cloudLogout(): Promise<void> {
  try {
    await post('/api/auth/logout', {}, getToken() || undefined)
  } catch {
    /* ignore */
  }
  setToken(null)
}

export async function resendVerification(email: string): Promise<void> {
  const { status, data } = await post('/api/auth/resend', { email: email.trim() })
  if (status >= 400) throw new Error(kbError(status, data))
}
