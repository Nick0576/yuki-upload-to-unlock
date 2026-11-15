import { useEffect, useMemo, useRef, useState } from 'react'
import { QUICK_REACTIONS } from '../lib/content'
import { emotion } from '../lib/emotions'
import { location } from '../lib/locations'
import { affectionStage, moodLabel } from '../lib/persona'
import { useApp } from '../store'
import { speak } from '../lib/tts'
import type { Message } from '../lib/types'
import { copyText, dayKey, dayLabel } from '../lib/utils'
import { ActionSheet, Confirm, PromptDialog, Sheet } from './Sheet'
import { Composer } from './Composer'
import { MessageBubble } from './MessageBubble'

export function Chat({ onBack, onSettings, onPersona }: { onBack: () => void; onSettings: () => void; onPersona: () => void }) {
  const {
    db,
    thread,
    typing,
    stream,
    send,
    regenerate,
    editMessage,
    deleteMessage,
    togglePin,
    toggleBookmark,
    react,
    bulk,
    stop,
    clearHistory,
    exportChat,
    archiveThread,
    createThread,
    giveGift,
    takeSelfie,
    toast,
  } = useApp()

  const [replyTo, setReplyTo] = useState<string | undefined>()
  const [actionFor, setActionFor] = useState<Message | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pinnedOpen, setPinnedOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [editing, setEditing] = useState<Message | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const nearBottom = useRef(true)

  const messages = thread?.messages || []
  const visible = useMemo(() => messages.filter((m) => !m.deletedForMe), [messages])
  const pinned = useMemo(() => messages.filter((m) => m.pinned && !m.deletedForBoth), [messages])
  const saved = useMemo(() => messages.filter((m) => m.bookmarked && !m.deletedForBoth), [messages])
  const loc = location(thread?.locationId)
  const stage = affectionStage(thread?.affection ?? 0)
  const lastYuki = [...messages].reverse().find((m) => m.role === 'yuki')
  const expr = emotion(lastYuki?.emotion, db.settings.spicy)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return messages.filter((m) => !m.deletedForBoth && !m.deletedForMe && m.text.toLowerCase().includes(q))
  }, [messages, query])

  const byId = useMemo(() => Object.fromEntries(messages.map((m) => [m.id, m])) as Record<string, Message>, [messages])

  useEffect(() => {
    if (nearBottom.current) bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [visible.length, stream?.text, typing])

  function onScroll() {
    const el = scrollerRef.current
    if (!el) return
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  function jumpTo(id: string) {
    const el = document.getElementById(`m-${id}`)
    if (!el) {
      toast('Message not in this chat')
      return
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlight(id)
    window.setTimeout(() => setHighlight(null), 1600)
  }

  function toggleSelect(id: string) {
    setSelecting(true)
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function exitSelection() {
    setSelecting(false)
    setSelected([])
  }

  async function copyMessage(m: Message) {
    try {
      await copyText(m.text)
      toast('Copied')
    } catch {
      toast('Could not copy', 'error')
    }
  }

  if (!thread) {
    return (
      <div className="screen">
        <header className="topbar">
          <button className="icon-btn" onClick={onBack}>
            ‹
          </button>
          <h1>Chat</h1>
        </header>
        <div className="empty">
          <p>No chat yet.</p>
          <button className="btn primary" onClick={() => createThread()}>
            Start one
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-screen">
      <header className="chat-head">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <button className="chat-who" onClick={onPersona}>
          <span className="chat-avatar" style={{ borderColor: expr.tint }}>
            {expr.image ? <img src={expr.image} alt="" /> : expr.emoji}
          </span>
          <span className="chat-who-text">
            <strong>{db.persona.name}</strong>
            <span className={typing ? 'status typing' : 'status'}>
              {typing ? 'typing…' : `${loc.emoji} ${loc.name} · ${moodLabel(thread.mood)}`}
            </span>
          </span>
        </button>
        <button className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
          🔍
        </button>
        <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="More">
          ⋯
        </button>
      </header>

      {pinned.length > 0 && (
        <button className="pinned-bar" onClick={() => setPinnedOpen(true)}>
          📌 <span>{pinned[pinned.length - 1].text.slice(0, 64)}</span>
          {pinned.length > 1 && <em>{pinned.length}</em>}
        </button>
      )}

      <div className="chat-scroll" ref={scrollerRef} onScroll={onScroll}>
        <div className="chat-intro">
          <span className="pill">{thread.scenario}</span>
          <span className="tiny muted">
            {stage.label} · {Math.round(thread.affection)}% affection · 🔥 {thread.streak}
          </span>
        </div>

        {visible.map((m, i) => {
          const prev = visible[i - 1]
          const showDay = !prev || dayKey(prev.ts) !== dayKey(m.ts)
          const reply = m.replyTo ? byId[m.replyTo] : undefined
          const selfie = m.kind === 'selfie' ? db.selfies.find((s) => s.id === m.meta?.selfieId) : undefined
          return (
            <div key={m.id} id={`m-${m.id}`} className={highlight === m.id ? 'flash' : ''}>
              {showDay && <div className="day-sep">{dayLabel(m.ts)}</div>}
              <MessageBubble
                message={m}
                replyTo={reply}
                selfieUrl={selfie?.dataUrl}
                personaName={db.persona.name}
                userName={db.userName}
                spicy={db.settings.spicy}
                streaming={
                  stream && stream.msgId === m.id ? stream.text : undefined
                }
                selectionMode={selecting}
                selected={selected.includes(m.id)}
                onLongPress={() => setActionFor(m)}
                onToggleSelect={() => toggleSelect(m.id)}
                onSpeak={() => speak(m.text)}
                onJumpTo={jumpTo}
              />
            </div>
          )
        })}

        {typing && (
          <div className="typing-row">
            <div className="msg-avatar" style={{ borderColor: expr.tint }}>
              {expr.emoji}
            </div>
            <div className="typing-bubble">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={bottomRef} className="bottom-space" />
      </div>

      {selecting ? (
        <div className="select-bar">
          <button className="icon-btn" onClick={exitSelection} aria-label="Cancel">
            ✕
          </button>
          <strong>{selected.length} selected</strong>
          <button className="icon-btn" onClick={() => selected.forEach((id) => togglePin(id))} aria-label="Pin">
            📌
          </button>
          <button className="icon-btn" onClick={() => bulk('copy', selected).then(exitSelection)} aria-label="Copy">
            ⧉
          </button>
          <button
            className="icon-btn danger"
            onClick={() => {
              bulk('delete', selected).then(exitSelection)
            }}
            aria-label="Delete"
          >
            🗑
          </button>
        </div>
      ) : (
        <div className="composer-wrap">
          <Composer
            busy={typing || Boolean(stream)}
            replyTo={replyTo ? byId[replyTo] : undefined}
            onCancelReply={() => setReplyTo(undefined)}
            onSend={(text) => {
              send(text, { replyTo })
              setReplyTo(undefined)
            }}
            onSticker={(emoji) => {
              send(emoji, { kind: 'sticker', sticker: emoji, replyTo })
              setReplyTo(undefined)
            }}
            onGift={(id) => giveGift(id)}
            onSelfie={() => takeSelfie()}
            onStop={stop}
          />
        </div>
      )}

      {/* message actions */}
      <ActionSheet
        open={Boolean(actionFor)}
        onClose={() => setActionFor(null)}
        title="Message"
        items={
          actionFor
            ? [
                { label: 'Reply', icon: '↩︎', onClick: () => setReplyTo(actionFor.id) },
                { label: 'Copy', icon: '⧉', onClick: () => copyMessage(actionFor) },
                { label: 'Save message', icon: '🔖', onClick: () => toggleBookmark(actionFor.id) },
                { label: actionFor.pinned ? 'Unpin' : 'Pin message', icon: '📌', onClick: () => togglePin(actionFor.id) },
                ...(actionFor.role === 'user'
                  ? [{ label: 'Edit & regenerate', icon: '✎', onClick: () => setEditing(actionFor) }]
                  : [{ label: 'Regenerate reply', icon: '↻', onClick: () => regenerate(actionFor.id) }]),
                { label: 'Select', icon: '☑︎', onClick: () => toggleSelect(actionFor.id) },
                { label: 'Delete for me', icon: '🗑', danger: true, onClick: () => deleteMessage(actionFor.id, 'me') },
                { label: 'Delete for both', icon: '🗑', danger: true, onClick: () => deleteMessage(actionFor.id, 'both') },
              ]
            : []
        }
      />

      {/* reactions on the action sheet */}
      <Sheet open={Boolean(actionFor)} onClose={() => setActionFor(null)}>
        {actionFor && (
          <div className="react-row">
            {QUICK_REACTIONS.map((r) => (
              <button
                key={r}
                onClick={() => {
                  react(actionFor.id, r)
                  setActionFor(null)
                }}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </Sheet>

      <PromptDialog
        open={Boolean(editing)}
        title="Edit message"
        value={editing?.text || ''}
        multiline
        confirmLabel="Save & regenerate"
        onClose={() => setEditing(null)}
        onSave={(v) => {
          if (editing && v) editMessage(editing.id, v)
        }}
      />

      {/* header menu */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={thread.title} size="tall">
        <div className="menu-list">
          <button onClick={() => { setMenuOpen(false); setSearchOpen(true) }}>🔍 Search messages</button>
          <button onClick={() => { setMenuOpen(false); setPinnedOpen(true) }}>📌 Pinned ({pinned.length})</button>
          <button onClick={() => { setMenuOpen(false); setSavedOpen(true) }}>🔖 Saved ({saved.length})</button>
          <button onClick={() => { setMenuOpen(false); exportChat('txt') }}>⬇︎ Export as text</button>
          <button onClick={() => { setMenuOpen(false); exportChat('json') }}>⬇︎ Export as JSON</button>
          <button onClick={() => { setMenuOpen(false); setSelecting(true) }}>☑︎ Select messages</button>
          <button onClick={() => { setMenuOpen(false); setConfirmArchive(true) }}>📦 Archive this chat</button>
          <button
            onClick={() => {
              setMenuOpen(false)
              createThread({ title: 'Fresh start', locationId: thread.locationId })
              toast('Fresh chat started')
            }}
          >
            ✨ Start fresh chat
          </button>
          <button onClick={() => { setMenuOpen(false); onPersona() }}>🎭 Persona & scenes</button>
          <button onClick={() => { setMenuOpen(false); onSettings() }}>⚙︎ Settings</button>
          <button className="danger" onClick={() => { setMenuOpen(false); setConfirmClear(true) }}>
            🗑 Clear chat history
          </button>
        </div>
      </Sheet>

      {/* pinned list */}
      <Sheet open={pinnedOpen} onClose={() => setPinnedOpen(false)} title="Pinned messages" size="tall">
        {pinned.length === 0 && <p className="muted">Nothing pinned yet. Long-press a message to pin it.</p>}
        {pinned.map((m) => (
          <button key={m.id} className="list-row" onClick={() => { setPinnedOpen(false); jumpTo(m.id) }}>
            <strong>{m.role === 'user' ? db.userName || 'You' : db.persona.name}</strong>
            <span>{m.text.slice(0, 120)}</span>
          </button>
        ))}
      </Sheet>

      {/* saved list */}
      <Sheet open={savedOpen} onClose={() => setSavedOpen(false)} title="Saved messages" size="tall">
        {saved.length === 0 && <p className="muted">No saved messages yet.</p>}
        {saved.map((m) => (
          <button key={m.id} className="list-row" onClick={() => { setSavedOpen(false); jumpTo(m.id) }}>
            <strong>{m.role === 'user' ? db.userName || 'You' : db.persona.name}</strong>
            <span>{m.text.slice(0, 120)}</span>
          </button>
        ))}
      </Sheet>

      {/* search */}
      <Sheet open={searchOpen} onClose={() => setSearchOpen(false)} title="Search this chat" size="tall">
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Words, emoji, anything…"
          autoFocus
        />
        <div className="search-results">
          {query && results.length === 0 && <p className="muted">Nothing found.</p>}
          {results.map((m) => (
            <button key={m.id} className="list-row" onClick={() => { setSearchOpen(false); jumpTo(m.id) }}>
              <strong>
                {m.role === 'user' ? db.userName || 'You' : db.persona.name} · {new Date(m.ts).toLocaleDateString()}
              </strong>
              <span>{m.text}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <Confirm
        open={confirmClear}
        title="Clear this chat?"
        message="Every message and everything she remembers from this conversation will be gone. This cannot be undone."
        confirmLabel="Clear chat"
        danger
        onConfirm={clearHistory}
        onClose={() => setConfirmClear(false)}
      />

      <Confirm
        open={confirmArchive}
        title="Archive this chat?"
        message="She will keep it safely. You can restore it from the Chats tab."
        confirmLabel="Archive"
        onConfirm={() => {
          archiveThread(thread.id, true)
          onBack()
        }}
        onClose={() => setConfirmArchive(false)}
      />
    </div>
  )
}
