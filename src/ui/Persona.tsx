import { useState } from 'react'
import { EMOTIONS, emotionImage } from '../lib/emotions'
import { useT } from '../lib/i18n'
import { styleHint } from '../lib/persona'
import { useApp } from '../store'

const PERSONALITIES = [
  'sweet, playful, a little possessive, secretly soft-hearted',
  'calm and gentle, quietly funny, loves quiet places',
  'confident and teasing, secretly a huge softie',
  'shy and clumsy, blushes easily, very loyal',
  'energetic and loud, always dragging you into adventures',
  'bookish and thoughtful, soft-spoken, notices everything',
]

const STYLES = ['soft & sweet', 'playful', 'cool & sharp', 'shy & quiet', 'clingy & affectionate', 'bookish & calm', 'energetic & loud']

export function PersonaScreen() {
  const { db, setPersona, setUserName, setSettings, toast } = useApp()
  const t = useT()
  const p = db.persona
  const [name, setName] = useState(p.name)
  const [you, setYou] = useState(db.userName)
  const [personality, setPersonality] = useState(p.personality)
  const [style, setStyle] = useState(p.speakingStyle)

  const avatarImg = emotionImage(p.avatar, db.settings.spicy)

  function save() {
    setPersona({ name: name.trim() || 'Yuki', personality, speakingStyle: style })
    setUserName(you.trim())
    toast(t('settings.saved'))
  }

  return (
    <div className="screen persona-screen">
      <header className="topbar">
        <h1>{t('persona.title')}</h1>
        <button className="btn small primary" onClick={save}>
          {t('common.save')}
        </button>
      </header>

      <div className="persona-scroll">
        <div className="persona-preview">
          <div className="persona-glow" />
          {avatarImg ? <img src={avatarImg} alt={p.name} /> : <span>{p.avatar}</span>}
          <div className="persona-preview-text">
            <strong>{name || 'Yuki'}</strong>
            <span>{styleHint(style)}</span>
          </div>
        </div>

        <label className="field">
          <span>{t('persona.her')}</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={16} />
        </label>

        <label className="field">
          <span>{t('persona.your')}</span>
          <input className="input" value={you} onChange={(e) => setYou(e.target.value)} maxLength={24} placeholder="Babe" />
          <span className="tiny muted">{t('persona.yourHint')}</span>
        </label>

        <div className="field">
          <span>{t('persona.face')}</span>
          <div className="expr-row">
            {EMOTIONS.filter((e) => e.image && (db.settings.spicy || !e.private)).map((e) => (
              <button
                key={e.id}
                className={`expr-pick ${p.avatar === e.id ? 'on' : ''}`}
                onClick={() => setPersona({ avatar: e.id })}
                title={e.label}
              >
                <img src={e.image} alt={e.label} loading="lazy" />
              </button>
            ))}
          </div>
          <span className="tiny muted">{t('persona.avatarNote')}</span>
        </div>

        <div className="field">
          <span>{t('persona.personality')}</span>
          <div className="chips wrap">
            {PERSONALITIES.map((x) => (
              <button key={x} className={`chip ${personality === x ? 'on' : ''}`} onClick={() => setPersonality(x)}>
                {x.split(',')[0]}
              </button>
            ))}
          </div>
          <textarea
            className="input area"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            rows={3}
            maxLength={240}
          />
        </div>

        <div className="field">
          <span>{t('persona.style')}</span>
          <div className="chips wrap">
            {STYLES.map((x) => (
              <button key={x} className={`chip ${style === x ? 'on' : ''}`} onClick={() => setStyle(x)}>
                {x}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>{t('persona.region')}</span>
          <div className="seg">
            <button className={db.settings.region === 'ph' ? 'on' : ''} onClick={() => setSettings({ region: 'ph' })}>
              🇵🇭 Philippines
            </button>
            <button className={db.settings.region === 'jp' ? 'on' : ''} onClick={() => setSettings({ region: 'jp' })}>
              🇯🇵 Japan
            </button>
          </div>
        </div>

        <button className="btn primary wide" onClick={save}>
          {t('common.save')}
        </button>
        <div className="bottom-space" />
      </div>
    </div>
  )
}
