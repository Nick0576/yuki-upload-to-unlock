import { useMemo, useState } from 'react'
import { SCENARIOS } from '../lib/content'
import { emotion } from '../lib/emotions'
import { location } from '../lib/locations'
import { useApp } from '../store'
import type { Thread } from '../lib/types'
import { formatTime, dayLabel, shortText } from '../lib/utils'
import { ActionSheet, Confirm, Sheet } from './Sheet'

export function Chats({ onOpen, onPersona }: { onOpen: (id: string) => void; onPersona: () => void }) {
  const { db, threads, createThread, archiveThread, deleteThread, selectThread } = useApp()
  const [query, setQuery] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [threadActions, setThreadActions] = useState<Thread | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Thread | null>(null)

  const active = threads.filter((t) => !t.archived)
  const archived = threads.filter((t) => t.archived)

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out: Array<{ thread: Thread; text: string; ts: number; role: string }> = []
    for (const t of threads) {
      for (const m of t.messages) {
        if (m.deletedForBoth || m.deletedForMe) continue
        if (m.text.toLowerCase().includes(q)) {
          out.push({ thread: t, text: m.text, ts: m.ts, role: m.role })
        }
      }
    }
    return out.sort((a, b) => b.ts - a.ts).slice(0, 60)
  }, [query, threads])

  function preview(t: Thread): { text: string; ts: number; unread: number } {
    const last = [...t.messages].reverse().find((m) => !m.deletedForMe && m.role !== 'system')
    return {
      text: last ? shortText(last.text, 60) : 'No messages yet',
      ts: last?.ts || t.updatedAt,
      unread: t.unread,
    }
  }

  return (
    <div className="screen chats-screen">
      <header className="topbar">
        <h1>Chats</h1>
        <button className="btn small primary" onClick={() => setNewOpen(true)}>
          + New
        </button>
      </header>

      <div className="searchbar">
        <span>🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search every message…"
          inputMode="search"
        />
        {query && (
          <button className="icon-btn" onClick={() => setQuery('')} aria-label="Clear">
            ✕
          </button>
        )}
      </div>

      {query ? (
        <div className="results">
          <p className="tiny muted">{hits.length} result{hits.length === 1 ? '' : 's'}</p>
          {hits.map((h, i) => (
            <button
              key={`${h.thread.id}-${i}`}
              className="search-hit"
              onClick={() => {
                selectThread(h.thread.id)
                onOpen(h.thread.id)
                setQuery('')
              }}
            >
              <div className="hit-head">
                <strong>{h.thread.title}</strong>
                <span className="tiny muted">{dayLabel(h.ts)} · {formatTime(h.ts)}</span>
              </div>
              <span className="hit-text">{h.text}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="thread-list">
            {active.length === 0 && (
              <div className="empty">
                <p className="muted">No chats yet. Start one and she will text back.</p>
              </div>
            )}
            {active.map((t) => {
              const p = preview(t)
              const loc = location(t.locationId)
              const last = [...t.messages].reverse().find((m) => m.role === 'yuki')
              const expr = emotion(last?.emotion, db.settings.spicy)
              return (
                <button
                  key={t.id}
                  className="thread"
                  onClick={() => {
                    selectThread(t.id)
                    onOpen(t.id)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setThreadActions(t)
                  }}
                >
                  <span className="thread-avatar" style={{ borderColor: expr.tint }}>
                    {expr.image ? <img src={expr.image} alt="" /> : expr.emoji}
                  </span>
                  <span className="thread-body">
                    <span className="thread-top">
                      <strong>{t.title}</strong>
                      <span className="tiny muted">{p.ts ? formatTime(p.ts) : ''}</span>
                    </span>
                    <span className="thread-sub">
                      <span className="tiny muted">
                        {loc.emoji} {p.text}
                      </span>
                      {p.unread > 0 && <em className="badge">{p.unread}</em>}
                    </span>
                    <span className="thread-tags">
                      <em>{t.scenario}</em>
                      <em>🔥 {t.streak}</em>
                      <em>{Math.round(t.affection)}%</em>
                    </span>
                  </span>
                  <span className="thread-more" onClick={(e) => { e.stopPropagation(); setThreadActions(t) }}>
                    ⋯
                  </span>
                </button>
              )
            })}
          </div>

          {archived.length > 0 && (
            <>
              <div className="section-head">
                <h2>Archived</h2>
                <span className="muted tiny">{archived.length}</span>
              </div>
              <div className="thread-list">
                {archived.map((t) => (
                  <div key={t.id} className="thread archived">
                    <span className="thread-avatar">📦</span>
                    <span className="thread-body">
                      <span className="thread-top">
                        <strong>{t.title}</strong>
                        <span className="tiny muted">{dayLabel(t.updatedAt)}</span>
                      </span>
                      <span className="tiny muted">{t.messages.length} messages</span>
                    </span>
                    <button className="mini-btn" onClick={() => archiveThread(t.id, false)}>
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="section-head">
            <h2>Scenes</h2>
            <button className="linkish" onClick={onPersona}>
              Edit persona
            </button>
          </div>
          <div className="scene-grid">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                className="scene-card"
                onClick={() => {
                  const id = createThread({ scenarioId: s.id })
                  onOpen(id)
                }}
              >
                <span className="scene-emoji">{s.emoji}</span>
                <span className="scene-name">{s.name}</span>
                <span className="tiny muted">{location(s.locationId).name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <Sheet open={newOpen} onClose={() => setNewOpen(false)} title="Start a chat" size="tall">
        <button
          className="btn wide"
          onClick={() => {
            const id = createThread({ title: 'With Yuki', locationId: 'bedroom' })
            setNewOpen(false)
            onOpen(id)
          }}
        >
          💬 Just us
        </button>
        <h4 className="sub">Or pick a scene</h4>
        <div className="scene-grid">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className="scene-card"
              onClick={() => {
                const id = createThread({ scenarioId: s.id })
                setNewOpen(false)
                onOpen(id)
              }}
            >
              <span className="scene-emoji">{s.emoji}</span>
              <span className="scene-name">{s.name}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <ActionSheet
        open={Boolean(threadActions)}
        onClose={() => setThreadActions(null)}
        title={threadActions?.title}
        items={
          threadActions
            ? [
                {
                  label: 'Open',
                  icon: '💬',
                  onClick: () => {
                    selectThread(threadActions.id)
                    onOpen(threadActions.id)
                  },
                },
                { label: 'Archive', icon: '📦', onClick: () => archiveThread(threadActions.id, true) },
                { label: 'Delete', icon: '🗑', danger: true, onClick: () => setConfirmDelete(threadActions) },
              ]
            : []
        }
      />

      <Confirm
        open={Boolean(confirmDelete)}
        title="Delete this chat?"
        message="The whole conversation will be removed from this device."
        confirmLabel="Delete"
        danger
        onConfirm={() => confirmDelete && deleteThread(confirmDelete.id)}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  )
}
