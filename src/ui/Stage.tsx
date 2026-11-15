import { useMemo, useState } from 'react'
import { GIFTS, SCENARIOS } from '../lib/content'
import { EMOTIONS, emotion } from '../lib/emotions'
import { LOCATIONS, location } from '../lib/locations'
import { affectionStage, moodLabel } from '../lib/persona'
import { useApp } from '../store'
import { greeting } from '../lib/utils'
import { Sheet } from './Sheet'

export function Stage({ onChat }: { onChat: () => void }) {
  const { thread, db, setLocation, setEmotion, giveGift, takeSelfie, toast, createThread } = useApp()
  const [locOpen, setLocOpen] = useState(false)
  const [exprOpen, setExprOpen] = useState(false)
  const [giftOpen, setGiftOpen] = useState(false)

  const loc = location(thread?.locationId)
  const lastYuki = useMemo(() => [...(thread?.messages || [])].reverse().find((m) => m.role === 'yuki'), [thread])
  const expr = emotion(lastYuki?.emotion, db.settings.spicy)
  const stage = affectionStage(thread?.affection ?? 4)

  const line = useMemo(() => {
    if (!thread) return ''
    if (thread.messages.length <= 1) return 'She is waiting for you to say something.'
    const mood = moodLabel(thread.mood)
    return `${greeting()} — she is ${mood}, ${stage.label.toLowerCase()}.`
  }, [thread, stage.label])

  return (
    <div className="screen stage-screen">
      <div className="stage">
        <img className="stage-bg" src={loc.image} alt={loc.name} draggable={false} />
        <div className="stage-shade" />

        <div className="stage-top">
          <button className="glass pill-btn" onClick={() => setLocOpen(true)}>
            <span className="dot" />📷 {loc.name}
          </button>
          <button className="glass icon-btn" onClick={() => setExprOpen(true)} aria-label="Change her expression">
            {expr.emoji}
          </button>
        </div>

        <div className="stage-figure" key={expr.image || expr.id}>
          {expr.image ? (
            <img className="stage-yuki" src={expr.image} alt={db.persona.name} draggable={false} />
          ) : (
            <div className="stage-placeholder">
              <span className="placeholder-emoji">{expr.emoji}</span>
              <span className="placeholder-label">{expr.label}</span>
            </div>
          )}
          {!expr.image && (
            <div className="emoji-badge" aria-label={`Expression: ${expr.label}`}>
              {expr.emoji}
            </div>
          )}
        </div>

        <div className="stage-bottom">
          <h1 className="stage-name">
            {db.persona.name}
            <span className={`stage-chip ${expr.private ? 'spicy' : ''}`}>{expr.label}</span>
          </h1>
          <p className="stage-line">{line}</p>
        </div>
      </div>

      <div className="stage-panels">
        <div className="card meter-card">
          <div className="meter-head">
            <div>
              <span className="eyebrow">Affection</span>
              <strong>{stage.label}</strong>
            </div>
            <div className="streak" title="Daily check-in streak">
              🔥 <strong>{thread?.streak ?? 0}</strong>
              <span>day{thread?.streak === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div className="meter">
            <div className="meter-fill" style={{ width: `${Math.round(thread?.affection ?? 0)}%` }} />
          </div>
          <div className="meter-foot">
            <span>{Math.round(thread?.affection ?? 0)} / 100</span>
            <span className="muted">{moodLabel(thread?.mood ?? 0)}</span>
          </div>
        </div>

        <div className="quick-grid">
          <button className="quick primary" onClick={onChat}>
            <span>💬</span>
            Message
          </button>
          <button className="quick" onClick={() => setGiftOpen(true)}>
            <span>🎁</span>
            Gift
          </button>
          <button className="quick" onClick={() => takeSelfie()}>
            <span>🤳</span>
            Selfie
          </button>
          <button className="quick" onClick={() => setLocOpen(true)}>
            <span>📍</span>
            Go out
          </button>
        </div>

        <div className="section-head">
          <h2>Where should we go?</h2>
          <span className="muted tiny">She reacts to the place</span>
        </div>
        <div className="loc-strip">
          {LOCATIONS.map((l) => (
            <button
              key={l.id}
              className={`loc ${l.id === loc.id ? 'on' : ''}`}
              onClick={() => {
                setLocation(l.id)
                toast(`Moved to ${l.name}`)
                onChat()
              }}
            >
              <img src={l.image} alt="" loading="lazy" />
              <span>
                {l.emoji} {l.name}
              </span>
            </button>
          ))}
        </div>

        <div className="section-head">
          <h2>Scenes</h2>
          <span className="muted tiny">Start a new thread</span>
        </div>
        <div className="scene-list">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className="scene"
              onClick={() => {
                createThread({ scenarioId: s.id })
                onChat()
              }}
            >
              <span className="scene-emoji">{s.emoji}</span>
              <span className="scene-name">{s.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* location picker */}
      <Sheet open={locOpen} onClose={() => setLocOpen(false)} title="Choose a location" size="tall">
        <div className="loc-grid">
          {LOCATIONS.map((l) => (
            <button
              key={l.id}
              className={`loc-tile ${l.id === loc.id ? 'on' : ''}`}
              onClick={() => {
                setLocation(l.id)
                setLocOpen(false)
                toast(`You are at ${l.name}`)
              }}
            >
              <img src={l.image} alt="" loading="lazy" />
              <div className="loc-tile-text">
                <strong>
                  {l.emoji} {l.name}
                </strong>
                <span>{l.time}</span>
              </div>
            </button>
          ))}
        </div>
      </Sheet>

      {/* expression picker */}
      <Sheet open={exprOpen} onClose={() => setExprOpen(false)} title={`${db.persona.name}'s face`} size="tall">
        <p className="tiny muted">
          Eight expressions are drawn. The rest use an emoji badge next to her hair until art arrives.
        </p>
        <div className="expr-grid">
          {EMOTIONS.filter((e) => db.settings.spicy || !e.private).map((e) => (
            <button
              key={e.id}
              className={`expr-tile ${e.id === expr.id ? 'on' : ''}`}
              onClick={() => {
                setEmotion(e.id)
                setExprOpen(false)
              }}
            >
              {e.image ? <img src={e.image} alt={e.label} loading="lazy" /> : <span className="expr-emoji">{e.emoji}</span>}
              <span>
                {e.emoji} {e.label}
              </span>
            </button>
          ))}
        </div>
      </Sheet>

      {/* gifts */}
      <Sheet open={giftOpen} onClose={() => setGiftOpen(false)} title="Send her something" size="tall">
        <div className="gift-grid">
          {GIFTS.map((g) => (
            <button
              key={g.id}
              className="gift"
              onClick={() => {
                giveGift(g.id)
                setGiftOpen(false)
                onChat()
              }}
            >
              <span className="gift-emoji">{g.emoji}</span>
              <strong>{g.name}</strong>
              <span className="tiny muted">+{g.boost} affection</span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  )
}
