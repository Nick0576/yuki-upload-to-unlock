import { useState } from 'react'
import { EMOTIONS, emotionImage } from '../lib/emotions'
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

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { db, setPersona, setUserName, setSettings } = useApp()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(db.userName || '')
  const [pName, setPName] = useState(db.persona.name || 'Yuki')
  const [avatar, setAvatar] = useState(db.persona.avatar || 'happy')
  const [personality, setPersonality] = useState(db.persona.personality)
  const [style, setStyle] = useState(db.persona.speakingStyle)
  const [region, setRegion] = useState(db.settings.region)

  const expr = emotionImage(avatar, true) || '/assets/emotions/happy.png'

  return (
    <div className="onboard">
      <div className="onboard-stage">
        <img src={expr} alt="" />
        <div className="onboard-glow" />
      </div>

      {step === 0 && (
        <div className="onboard-card">
          <span className="pill">First things first</span>
          <h2>What should she call you?</h2>
          <p className="muted">You can change this any time in Persona.</p>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name or nickname"
            maxLength={24}
            autoFocus
          />
          <div className="chips">
            {['Babe', 'Senpai', 'Love', 'Onii-chan'].map((n) => (
              <button key={n} className="chip" onClick={() => setName(n)}>
                {n}
              </button>
            ))}
          </div>
          <button
            className="btn primary wide"
            onClick={() => {
              setUserName(name.trim() || 'Babe')
              setStep(1)
            }}
          >
            Continue
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="onboard-card">
          <span className="pill">Make her yours</span>
          <h2>Who is she?</h2>

          <label className="field">
            <span>Her name</span>
            <input className="input" value={pName} onChange={(e) => setPName(e.target.value)} maxLength={16} />
          </label>

          <div className="field">
            <span>Her face</span>
            <div className="expr-row">
              {EMOTIONS.filter((e) => e.image && !e.private)
                .slice(0, 8)
                .map((e) => (
                  <button
                    key={e.id}
                    className={`expr-pick ${avatar === e.id ? 'on' : ''}`}
                    onClick={() => setAvatar(e.id)}
                    title={e.label}
                  >
                    <img src={e.image} alt={e.label} loading="lazy" />
                  </button>
                ))}
            </div>
          </div>

          <div className="field">
            <span>Personality</span>
            <div className="chips wrap">
              {PERSONALITIES.map((p) => (
                <button
                  key={p}
                  className={`chip ${personality === p ? 'on' : ''}`}
                  onClick={() => setPersonality(p)}
                >
                  {p.split(',')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Speaking style</span>
            <div className="chips wrap">
              {STYLES.map((s) => (
                <button key={s} className={`chip ${style === s ? 'on' : ''}`} onClick={() => setStyle(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Where do you two live?</span>
            <div className="seg">
              <button className={region === 'ph' ? 'on' : ''} onClick={() => setRegion('ph')}>
                Philippines
              </button>
              <button className={region === 'jp' ? 'on' : ''} onClick={() => setRegion('jp')}>
                Japan
              </button>
            </div>
          </div>

          <div className="row gap">
            <button className="btn ghost" onClick={() => setStep(0)}>
              Back
            </button>
            <button
              className="btn primary grow"
              onClick={() => {
                setPersona({ name: pName.trim() || 'Yuki', avatar, personality, speakingStyle: style })
                setSettings({ region })
                onDone()
              }}
            >
              Start with {pName.trim() || 'Yuki'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
