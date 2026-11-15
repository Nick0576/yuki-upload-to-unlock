import { useEffect, useRef, useState } from 'react'
import { EMOJI_PALETTE, GIFTS, STICKER_SETS } from '../lib/content'
import type { Message } from '../lib/types'
import { useApp } from '../store'
import { Sheet } from './Sheet'

export function Composer({
  busy,
  replyTo,
  onCancelReply,
  onSend,
  onSticker,
  onGift,
  onSelfie,
  onStop,
}: {
  busy: boolean
  replyTo?: Message
  onCancelReply: () => void
  onSend: (text: string) => void
  onSticker: (emoji: string) => void
  onGift: (id: string) => void
  onSelfie: () => void
  onStop: () => void
}) {
  const { db, saveSticker, toast } = useApp()
  const [text, setText] = useState('')
  const [open, setOpen] = useState<'none' | 'emoji' | 'stickers' | 'gifts'>('none')
  const ref = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(120, el.scrollHeight)}px`
  }, [text])

  function submit() {
    const t = text.trim()
    if (!t || busy) return
    setText('')
    onSend(t)
  }

  function startVoice() {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      toast('Voice input is not available in this browser', 'error')
      return
    }
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    let finalText = ''
    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      setText(finalText + interim)
    }
    rec.onerror = () => toast('Could not hear you', 'error')
    try {
      rec.start()
    } catch {
      toast('Microphone busy', 'error')
    }
  }

  return (
    <>
      {replyTo && (
        <div className="reply-bar">
          <div>
            <strong>Replying to {replyTo.role === 'user' ? db.userName || 'yourself' : db.persona.name}</strong>
            <span>{replyTo.text.slice(0, 80)}</span>
          </div>
          <button className="icon-btn" onClick={onCancelReply} aria-label="Cancel reply">
            ✕
          </button>
        </div>
      )}

      <div className="composer">
        <button
          className={`icon-btn round ${open === 'emoji' ? 'on' : ''}`}
          onClick={() => setOpen(open === 'emoji' ? 'none' : 'emoji')}
          aria-label="Emoji"
        >
          😊
        </button>
        <button
          className={`icon-btn round ${open === 'stickers' ? 'on' : ''}`}
          onClick={() => setOpen(open === 'stickers' ? 'none' : 'stickers')}
          aria-label="Stickers"
        >
          ✨
        </button>

        <textarea
          ref={ref}
          className="composer-input"
          value={text}
          placeholder={busy ? 'She is typing…' : 'Message Yuki…'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          rows={1}
        />

        {text.trim() ? (
          <button className="send-btn" onClick={submit} disabled={busy} aria-label="Send">
            ➤
          </button>
        ) : busy ? (
          <button className="stop-btn" onClick={onStop} aria-label="Stop generation">
            ■
          </button>
        ) : (
          <button className="icon-btn round" onClick={startVoice} aria-label="Voice message">
            🎙️
          </button>
        )}
      </div>

      <div className="composer-sub">
        <button className="ghost-chip" onClick={() => setOpen(open === 'gifts' ? 'none' : 'gifts')}>
          🎁 Gift
        </button>
        <button className="ghost-chip" onClick={onSelfie}>
          🤳 Selfie
        </button>
        <button className="ghost-chip" onClick={startVoice}>
          🎙️ Voice note
        </button>
      </div>

      {open === 'emoji' && (
        <div className="emoji-panel">
          {EMOJI_PALETTE.map((e, i) => (
            <button
              key={`${e}-${i}`}
              onClick={() => {
                setText((t) => t + e)
                ref.current?.focus()
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <Sheet open={open === 'stickers'} onClose={() => setOpen('none')} title="Stickers" size="tall">
        {db.stickers.length > 0 && (
          <>
            <h4 className="sub">Your stickers</h4>
            <div className="sticker-grid">
              {db.stickers.map((s, i) => (
                <button
                  key={`${s}-${i}`}
                  onClick={() => {
                    onSticker(s)
                    setOpen('none')
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
        {Object.entries(STICKER_SETS).map(([name, set]) => (
          <div key={name}>
            <h4 className="sub">{name}</h4>
            <div className="sticker-grid">
              {set.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onSticker(s)
                    setOpen('none')
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
        <h4 className="sub">All emoji — tap to send, long-press to save</h4>
        <div className="sticker-grid small">
          {EMOJI_PALETTE.slice(0, 160).map((s, i) => (
            <button
              key={`${s}-${i}`}
              onClick={() => {
                onSticker(s)
                setOpen('none')
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                saveSticker(s)
                toast('Sticker saved')
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={open === 'gifts'} onClose={() => setOpen('none')} title="Send a gift" size="tall">
        <div className="gift-grid">
          {GIFTS.map((g) => (
            <button
              key={g.id}
              className="gift"
              onClick={() => {
                onGift(g.id)
                setOpen('none')
              }}
            >
              <span className="gift-emoji">{g.emoji}</span>
              <strong>{g.name}</strong>
              <span className="tiny muted">+{g.boost}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  )
}
