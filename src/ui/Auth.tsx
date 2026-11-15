import { useState } from 'react'
import {
  cloudLogin,
  cloudRegister,
  localLogin,
  localRegister,
  resendVerification,
} from '../lib/auth'
import type { Account } from '../lib/types'

export function Auth({ onDone }: { onDone: (a: Account) => void }) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [offline, setOffline] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [verify, setVerify] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setVerify('')
    setBusy(true)
    try {
      if (offline) {
        const account = tab === 'login' ? await localLogin(email, password) : await localRegister(email, password)
        onDone(account)
      } else if (tab === 'login') {
        onDone(await cloudLogin(email, password))
      } else {
        const res = await cloudRegister(email, password)
        if (res.account) onDone(res.account)
        else {
          setVerify(email)
          setTab('login')
        }
      }
    } catch (err) {
      setError((err as Error).message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-brand">
        <img src="/icon.png" alt="" className="auth-icon" />
        <h1>Yuki</h1>
        <p className="muted">Your girlfriend is waiting. Sign in to keep your story.</p>
      </div>

      <div className="seg">
        <button className={tab === 'login' ? 'on' : ''} onClick={() => setTab('login')}>
          Sign in
        </button>
        <button className={tab === 'register' ? 'on' : ''} onClick={() => setTab('register')}>
          Create account
        </button>
      </div>

      {verify && (
        <div className="note info">
          <strong>Check your email.</strong>
          <p className="tiny">
            We sent a verification link to {verify}. Verify, then sign in here.
          </p>
          <button
            className="btn tiny ghost"
            onClick={async () => {
              try {
                await resendVerification(verify)
                setError('')
                setVerify(verify)
              } catch (err) {
                setError((err as Error).message)
              }
            }}
          >
            Resend link
          </button>
        </div>
      )}

      <form onSubmit={submit} className="auth-form">
        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            minLength={6}
          />
        </label>

        {error && <div className="note error">{error}</div>}

        <button className="btn primary wide" disabled={busy}>
          {busy ? 'One moment…' : tab === 'login' ? 'Sign in' : 'Create my account'}
        </button>
      </form>

      <button className="linkish" onClick={() => setOffline((v) => !v)}>
        {offline ? '← Use cloud account instead' : 'No signal? Use an offline account on this device →'}
      </button>

      {offline && (
        <p className="tiny muted">
          Offline accounts live only on this phone. Your chats stay here, no email needed.
        </p>
      )}

      <p className="tiny muted auth-foot">
        18+ only. Your chats are private and stored on this device. Cloud sign-in is secured by Koolbase.
      </p>
    </div>
  )
}
