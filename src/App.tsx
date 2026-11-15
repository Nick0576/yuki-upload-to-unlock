import { useEffect, useMemo, useRef, useState } from 'react'
import { THEME_MAP } from './lib/content'
import { setLanguage, useT } from './lib/i18n'
import { nativeApp } from './lib/native'
import { scheduleWhileVisible } from './lib/notify'
import { AppProvider, useApp } from './store'
import { AgeGate } from './ui/AgeGate'
import { Auth } from './ui/Auth'
import { Chat } from './ui/Chat'
import { Chats } from './ui/Chats'
import { Onboarding } from './ui/Onboarding'
import { PersonaScreen } from './ui/Persona'
import { SettingsScreen } from './ui/SettingsScreen'
import { Stage } from './ui/Stage'

type Tab = 'yuki' | 'chats' | 'persona' | 'settings'

function Root() {
  const { db, user, ageOk, ready, threads, signIn } = useApp()
  const [tab, setTab] = useState<Tab>('yuki')
  const [chatOpen, setChatOpen] = useState(false)
  const [needOnboarding, setNeedOnboarding] = useState(false)
  const decided = useRef(false)
  const t = useT()

  /* Android hardware back: close chat, then go to Yuki, then exit. */
  useEffect(() => {
    ;(window as any).__yukiBack = () => {
      if (chatOpen) {
        setChatOpen(false)
        return true
      }
      if (tab !== 'yuki') {
        setTab('yuki')
        return true
      }
      return false
    }
    return () => {
      delete (window as any).__yukiBack
    }
  }, [chatOpen, tab])

  const theme = THEME_MAP[db.settings.theme] || THEME_MAP.sakura
  const mode = db.settings.mode

  useEffect(() => {
    setLanguage(db.settings.language)
    const root = document.documentElement
    root.dataset.mode = mode
    root.dataset.theme = theme.id
    for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(k, v)
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', mode === 'light' ? '#fdf6f9' : String(theme.vars['--bg'] || '#140b16'))
  }, [db.settings.language, mode, theme])

  /* service worker + notification deep link */
  useEffect(() => {
    if ('serviceWorker' in navigator && !nativeApp()) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined)
      navigator.serviceWorker.addEventListener('message', (e) => {
        if ((e.data as any)?.type === 'open-chat') {
          setTab('yuki')
          setChatOpen(true)
        }
      })
    }
  }, [])

  /* Decide once, after the account's DB is loaded, so setting your name in
     step 1 of onboarding doesn't skip the rest of onboarding. */
  useEffect(() => {
    if (!user || !ready || decided.current) return
    decided.current = true
    if (!db.userName) setNeedOnboarding(true)
  }, [user, ready, db.userName])

  const needAuth = !user

  if (!ageOk) return <AgeGate />
  if (needAuth)
    return (
      <Auth
        onDone={(a) => {
          signIn(a)
        }}
      />
    )
  if (needOnboarding) return <Onboarding onDone={() => setNeedOnboarding(false)} />
  if (!ready) {
    return (
      <div className="boot">
        <div className="boot-heart">💗</div>
        <span className="muted">Waking Yuki up…</span>
      </div>
    )
  }

  return (
    <div className="app">
      <main className="app-main">
        {tab === 'yuki' && <Stage onChat={() => setChatOpen(true)} />}
        {tab === 'chats' && (
          <Chats
            onOpen={() => setChatOpen(true)}
            onPersona={() => setTab('persona')}
          />
        )}
        {tab === 'persona' && <PersonaScreen />}
        {tab === 'settings' && <SettingsScreen onPersona={() => setTab('persona')} />}
      </main>

      {chatOpen && (
        <div className="sheet-screen">
          <Chat
            onBack={() => setChatOpen(false)}
            onSettings={() => {
              setChatOpen(false)
              setTab('settings')
            }}
            onPersona={() => {
              setChatOpen(false)
              setTab('persona')
            }}
          />
        </div>
      )}

      <nav className="tabbar">
        <button className={tab === 'yuki' && !chatOpen ? 'on' : ''} onClick={() => { setTab('yuki'); setChatOpen(false) }}>
          <span>🌸</span>
          {t('nav.yuki')}
        </button>
        <button className={tab === 'chats' && !chatOpen ? 'on' : ''} onClick={() => { setTab('chats'); setChatOpen(false) }}>
          <span>💬</span>
          {t('nav.chats')}
          {threads.some((x: any) => x.unread > 0) && <i className="nav-dot" />}
        </button>
        <button className={tab === 'persona' && !chatOpen ? 'on' : ''} onClick={() => { setTab('persona'); setChatOpen(false) }}>
          <span>🎭</span>
          {t('nav.persona')}
        </button>
        <button className={tab === 'settings' && !chatOpen ? 'on' : ''} onClick={() => { setTab('settings'); setChatOpen(false) }}>
          <span>⚙︎</span>
          {t('nav.settings')}
        </button>
      </nav>

      <Toasts />
    </div>
  )
}

function Toasts() {
  const { toasts } = useApp()
  return (
    <div className="toasts">
      {toasts.map((x) => (
        <div key={x.id} className={`toast ${x.tone || ''}`}>
          {x.text}
        </div>
      ))}
    </div>
  )
}

function Scheduler() {
  const { db, proactive, thread } = useApp()
  const cb = useRef(proactive)
  cb.current = proactive

  useEffect(() => {
    if (!db.settings.notifications) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const handle = scheduleWhileVisible(db.settings.proactiveMinutes, () => cb.current())
    return () => handle.cancel()
  }, [db.settings.notifications, db.settings.proactiveMinutes, thread?.id])

  return null
}

export default function App() {
  return (
    <AppProvider>
      <Root />
      <Scheduler />
    </AppProvider>
  )
}
