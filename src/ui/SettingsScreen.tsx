import { useState } from 'react'
import { THEMES } from '../lib/content'
import { notificationPermission, requestNotifications } from '../lib/notify'
import { useT } from '../lib/i18n'
import { getAgeDeclined, wipeDB } from '../lib/storage'
import {
  localCancelDownload,
  localDelete,
  localDownload,
  localStatus,
  useDownloadProgress,
  useLocalStatus,
} from '../lib/localai'
import { speak } from '../lib/tts'
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
              if (v) speak('Hi. This is how I sound.', { rate: 1.05, pitch: 1.35 })
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
                📴 {t('settings.aiOffline')}
              </button>
              <button className={s.aiMode === 'local' ? 'on' : ''} onClick={() => setSettings({ aiMode: 'local' })}>
                🧠 {t('settings.aiLocal')}
              </button>
            </div>
          </div>
          <p className="tiny muted">{t('settings.aiHint')}</p>
        </section>

        <LocalAICard onEnable={() => setSettings({ aiMode: 'local' })} />

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

const GB = 1024 * 1024 * 1024

function fmtBytes(n: number): string {
  if (!n) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log2(n) / 10))
  return `${(n / 2 ** (10 * i)).toFixed(i >= 3 ? 2 : 0)} ${units[i]}`
}

function LocalAICard({ onEnable }: { onEnable: () => void }) {
  const t = useT()
  const { toast, db } = useApp()
  const status = useLocalStatus()
  const progress = useDownloadProgress()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const model = status.models[0]
  const total = progress.total || model?.size || 0
  const percent = total > 0 ? Math.min(100, Math.round((progress.bytes / total) * 100)) : 0
  const downloading = Boolean(model && progress.id === model.id && total > 0 && progress.bytes < total)
  const installed = status.installed
  const lowStorage = status.free > 0 && status.free < 1.5 * GB
  const lowRam = status.totalRam > 0 && status.totalRam < 3.5 * GB

  async function download() {
    if (!model) return
    toast(t('ai.downloading'))
    const ok = await localDownload(model.id)
    if (ok) {
      toast(t('ai.installed'))
      onEnable()
    } else if (localStatus().error === 'checksum_mismatch') {
      toast(t('ai.checksum'), 'error')
    } else if (localStatus().error !== 'not_enough_storage' && localStatus().error !== 'download_cancelled') {
      toast(t('ai.failed'), 'error')
    }
  }

  if (!status.supported) {
    return (
      <section className="card local-ai-card">
        <h3 className="section-title">🧠 {t('ai.title')}</h3>
        <p className="tiny muted">{t('ai.subtitle')}</p>
        <p className="tiny muted">Available inside the Android app.</p>
      </section>
    )
  }

  return (
    <section className="card local-ai-card">
      <h3 className="section-title">🧠 {t('ai.title')}</h3>
      <p className="tiny muted">{t('ai.subtitle')}</p>

      <div className="setting-row">
        <div>
          <strong>{model?.name || 'Qwen 2.5 1.5B'}</strong>
          <span className="tiny muted">{t('ai.required')} · 1.1 GB</span>
        </div>
        <span className={`pill ${installed ? 'ok' : ''}`}>{installed ? '✓' : '—'}</span>
      </div>

      {installed ? (
        <>
          <p className="tiny muted ai-note">{status.loading ? t('ai.loading') : t('ai.installed')}</p>
          <div className="ai-meta">
            <span>{db.persona.name}</span>
            <span className="tiny muted">{t('ai.history')}</span>
          </div>
          <div className="row gap">
            {db.settings.aiMode !== 'local' && (
              <button className="btn primary grow" onClick={onEnable}>
                🧠 {t('settings.aiLocal')}
              </button>
            )}
            <button className="btn ghost grow" onClick={() => setConfirmDelete(true)}>
              {t('ai.delete')}
            </button>
          </div>
        </>
      ) : downloading ? (
        <>
          <div className="meter" style={{ margin: '6px 0 8px' }}>
            <div className="meter-fill" style={{ width: `${percent}%` }} />
          </div>
          <div className="ai-meta">
            <span>{t('ai.downloading')} {percent}%</span>
            <span className="tiny muted">
              {fmtBytes(progress.bytes)} / {fmtBytes(total)}
            </span>
          </div>
          <button className="btn ghost wide" onClick={localCancelDownload}>
            {t('ai.cancel')}
          </button>
        </>
      ) : (
        <>
          <button className="btn primary wide" onClick={download} disabled={lowStorage}>
            ⬇ {t('ai.download')} <span className="tiny">1.1 GB</span>
          </button>
          {status.error === 'not_enough_storage' && (
            <p className="tiny error-note">{t('ai.lowStorage')} · {fmtBytes(status.free)} free</p>
          )}
          {status.error === 'checksum_mismatch' && <p className="tiny error-note">{t('ai.checksum')}</p>}
          {status.error === 'download_failed' && (
            <button className="btn ghost wide" onClick={download}>
              {t('ai.retry')}
            </button>
          )}
        </>
      )}

      {lowRam && <p className="tiny muted">⚠ {t('ai.lowRam')}</p>}

      <Confirm
        open={confirmDelete}
        title={t('ai.delete')}
        message={t('settings.clearAllBody')}
        confirmLabel={t('common.delete')}
        danger
        onConfirm={() => {
          if (model) localDelete(model.id)
          toast(t('settings.saved'))
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </section>
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
