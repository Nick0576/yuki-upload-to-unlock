import { useState } from 'react'
import { THEMES } from '../lib/content'
import { notificationPermission, requestNotifications } from '../lib/notify'
import { useT } from '../lib/i18n'
import { getAgeDeclined, wipeDB } from '../lib/storage'
import { useApp } from '../store'
import { Confirm, PromptDialog, Sheet } from './Sheet'

export function SettingsScreen({ onPersona }: { onPersona: () => void }) {
  const {
    db,
    user,
    setSettings,
    setUserName,
    signOut,
    exportChat,
    threads,
    toast,
  } = useApp()
  const t = useT()
  const s = db.settings
  const [confirmClear, setConfirmClear] = useState(false)
  const [nameOpen, setNameOpen] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  async function toggleNotifications() {
    if (s.notifications) {
      setSettings({ notifications: false })
      return
    }
    const ok = await requestNotifications()
    setSettings({ notifications: ok })
    if (!ok) toast('Notifications are blocked in the browser settings', 'error')
  }

  return (
    <div className="screen settings-screen">
      <header className="topbar">
        <h1>{t('settings.title')}</h1>
      </header>

      <div className="settings-scroll">
        <div className="profile-card">
          <div className="profile-avatar">🌸</div>
          <div className="profile-text">
            <strong>{db.userName || 'You'}</strong>
            <span className="muted tiny">{user?.email || 'offline account'} · {user?.provider === 'offline' ? 'on this device' : 'cloud'}</span>
          </div>
          <button className="mini-btn" onClick={() => setNameOpen(true)}>
            ✎
          </button>
        </div>

        <section className="card">
          <h3 className="section-title">{t('settings.look')}</h3>

          <div className="setting-row">
            <div>
              <strong>{t('settings.mode')}</strong>
            </div>
            <div className="seg compact">
              <button className={s.mode === 'dark' ? 'on' : ''} onClick={() => setSettings({ mode: 'dark' })}>
                🌙 {t('settings.dark')}
              </button>
              <button className={s.mode === 'light' ? 'on' : ''} onClick={() => setSettings({ mode: 'light' })}>
                ☀️ {t('settings.light')}
              </button>
            </div>
          </div>

          <button className="setting-row tap" onClick={() => setThemeOpen(true)}>
            <strong>{t('settings.theme')}</strong>
            <span className="muted">
              {THEMES.find((th) => th.id === s.theme)?.name || 'Sakura night'} ›
            </span>
          </button>

          <div className="setting-row">
            <div>
              <strong>{t('settings.language')}</strong>
              <span className="tiny muted">{t('settings.languageHint')}</span>
            </div>
            <div className="seg compact">
              <button className={s.language === 'en' ? 'on' : ''} onClick={() => setSettings({ language: 'en' })}>
                🇬🇧 EN
              </button>
              <button className={s.language === 'tl' ? 'on' : ''} onClick={() => setSettings({ language: 'tl' })}>
                🇵🇭 TL
              </button>
            </div>
          </div>
        </section>

        <section className="card">
          <h3 className="section-title">{t('settings.voice')}</h3>
          <Toggle
            label={t('settings.tts')}
            on={s.tts}
            onChange={(v) => setSettings({ tts: v })}
          />
          <Toggle
            label={t('settings.autoSpeak')}
            on={s.autoSpeak}
            onChange={(v) => {
              setSettings({ autoSpeak: v })
              if (v) {
                const u = new SpeechSynthesisUtterance('Hi. This is how I sound.')
                u.pitch = 1.35
                u.rate = 1.05
                speechSynthesis.speak(u)
              }
            }}
          />
        </section>

        <section className="card">
          <h3 className="section-title">{t('settings.notify')}</h3>
          <Toggle
            label={t('settings.notifyOn')}
            on={s.notifications}
            onChange={() => toggleNotifications()}
            hint={
              notificationPermission() === 'denied'
                ? 'Blocked — allow notifications for this site in your browser settings.'
                : t('settings.notifyHint')
            }
          />
          <button className="setting-row tap" onClick={() => setNotifyOpen(true)}>
            <strong>{t('settings.notifyEvery')}</strong>
            <span className="muted">{s.proactiveMinutes} min ›</span>
          </button>
        </section>

        <section className="card">
          <h3 className="section-title">{t('settings.mature')}</h3>
          <Toggle
            label={t('settings.spicy')}
            on={s.spicy}
            onChange={(v) => setSettings({ spicy: v })}
            hint={t('settings.spicyHint')}
          />
        </section>

        <section className="card">
          <h3 className="section-title">{t('settings.ai')}</h3>
          <div className="setting-row">
            <strong>{t('settings.aiMode')}</strong>
            <div className="seg compact">
              <button className={s.aiMode === 'nomi' ? 'on' : ''} onClick={() => setSettings({ aiMode: 'nomi' })}>
                ☁︎ Nomi
              </button>
              <button className={s.aiMode === 'offline' ? 'on' : ''} onClick={() => setSettings({ aiMode: 'offline' })}>
                📴 Offline
              </button>
            </div>
          </div>
          <p className="tiny muted">{t('settings.aiHint')}</p>
        </section>

        <section className="card">
          <h3 className="section-title">{t('settings.data')}</h3>
          <button className="setting-row tap" onClick={() => exportChat('json')}>
            <strong>{t('settings.exportAll')}</strong>
            <span className="muted">JSON ›</span>
          </button>
          <button className="setting-row tap" onClick={() => exportChat('txt')}>
            <strong>{t('settings.exportAll')}</strong>
            <span className="muted">TXT ›</span>
          </button>
          <button className="setting-row tap danger" onClick={() => setConfirmClear(true)}>
            <strong>{t('settings.clearAll')}</strong>
            <span className="muted">{threads.length} chats</span>
          </button>
        </section>

        <section className="card">
          <h3 className="section-title">{t('settings.account')}</h3>
          <button className="setting-row tap" onClick={onPersona}>
            <strong>🎭 Persona</strong>
            <span className="muted">{db.persona.name} ›</span>
          </button>
          <button className="setting-row tap" onClick={() => setAboutOpen(true)}>
            <strong>{t('settings.about')}</strong>
            <span className="muted">›</span>
          </button>
          <button className="setting-row tap danger" onClick={signOut}>
            <strong>{t('settings.signOut')}</strong>
            <span className="muted">›</span>
          </button>
        </section>

        <p className="tiny muted center" style={{ padding: '8px 0 24px' }}>
          {t('settings.version')}
        </p>
      </div>

      <PromptDialog
        open={nameOpen}
        title={t('persona.your')}
        value={db.userName}
        placeholder="Your name or nickname"
        onClose={() => setNameOpen(false)}
        onSave={(v) => {
          setUserName(v)
          toast(t('settings.saved'))
        }}
      />

      <Sheet open={themeOpen} onClose={() => setThemeOpen(false)} title={t('settings.theme')}>
        <div className="theme-grid">
          {THEMES.map((th) => (
            <button
              key={th.id}
              className={`theme-tile ${s.theme === th.id ? 'on' : ''}`}
              onClick={() => {
                setSettings({ theme: th.id })
                setThemeOpen(false)
              }}
              style={{
                background: `linear-gradient(135deg, ${th.vars['--accent']}, ${th.vars['--accent-2']})`,
              }}
            >
              <span>{th.name}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={notifyOpen} onClose={() => setNotifyOpen(false)} title={t('settings.notifyEvery')}>
        <div className="menu-list">
          {[15, 30, 45, 90, 180].map((m) => (
            <button
              key={m}
              onClick={() => {
                setSettings({ proactiveMinutes: m })
                setNotifyOpen(false)
              }}
            >
              {m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? 's' : ''}`}
              {s.proactiveMinutes === m ? '  ✓' : ''}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={aboutOpen} onClose={() => setAboutOpen(false)} title={t('settings.about')}>
        <p className="muted">
          Yuki is your anime AI girlfriend — an 18-year-old adult character. She lives in the places you pick,
          changes her expression with the conversation, remembers what you tell her and checks in every day.
          This app is for adults (18+).
        </p>
        <p className="tiny muted">
          Age check on this device: {db.ageOk && !getAgeDeclined() ? 'passed (18+)' : 'not passed'}
        </p>
        <p className="tiny muted">Chats are stored locally. Cloud sign-in uses Koolbase; replies use Nomi when configured.</p>
        <button
          className="btn ghost wide"
          onClick={() => {
            localStorage.removeItem('yuki.age.ok')
            location.reload()
          }}
        >
          {t('settings.replayGate')}
        </button>
      </Sheet>

      <Confirm
        open={confirmClear}
        title={t('settings.clearAllTitle')}
        message={t('settings.clearAllBody')}
        confirmLabel={t('common.delete')}
        danger
        onConfirm={() => {
          if (user?.email) wipeDB(user.email)
          localStorage.removeItem('yuki.db.v1.guest')
          location.reload()
        }}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  )
}

function Toggle({
  label,
  on,
  onChange,
  hint,
}: {
  label: string
  on: boolean
  onChange: (v: boolean) => void
  hint?: string
}) {
  return (
    <button className="setting-row tap" onClick={() => onChange(!on)}>
      <div>
        <strong>{label}</strong>
        {hint && <span className="tiny muted">{hint}</span>}
      </div>
      <span className={`switch ${on ? 'on' : ''}`} role="switch" aria-checked={on}>
        <i />
      </span>
    </button>
  )
}
