import { emotion } from '../lib/emotions'
import type { Message } from '../lib/types'
import { formatTime } from '../lib/utils'
import { useLongPress } from './Sheet'

export function MessageBubble({
  message,
  replyTo,
  selfieUrl,
  personaName,
  userName,
  spicy,
  streaming,
  selectionMode,
  selected,
  onLongPress,
  onToggleSelect,
  onSpeak,
  onJumpTo,
}: {
  message: Message
  replyTo?: Message
  selfieUrl?: string
  personaName: string
  userName: string
  spicy: boolean
  streaming?: string
  selectionMode?: boolean
  selected?: boolean
  onLongPress: () => void
  onToggleSelect: () => void
  onSpeak?: () => void
  onJumpTo?: (id: string) => void
}) {
  const press = useLongPress(() => (selectionMode ? onToggleSelect() : onLongPress()))
  const mine = message.role === 'user'
  const expr = emotion(message.emotion, spicy)

  if (message.deletedForMe) return null

  if (message.role === 'system') {
    return (
      <div className="sys-row">
        <span className="sys-chip">{message.kind === 'roleplay' ? '🎭' : '📍'} {message.text}</span>
      </div>
    )
  }

  const body = message.deletedForBoth ? (
    <em className="deleted-text">This message was deleted</em>
  ) : message.kind === 'sticker' ? (
    <span className="sticker">{message.meta?.sticker || message.text}</span>
  ) : message.kind === 'gift' ? (
    <span className="gift-line">
      <span className="gift-emoji-sm">{message.meta?.emoji}</span> Sent {message.text.replace(/^sent /, '')}
    </span>
  ) : message.kind === 'selfie' && selfieUrl ? (
    <span className="selfie-wrap">
      <img className="selfie" src={selfieUrl} alt="Selfie from her" />
      <span className="selfie-caption">{message.text}</span>
    </span>
  ) : (
    <span className="msg-text">
      {streaming ?? message.text}
      {streaming !== undefined && <span className="caret" />}
    </span>
  )

  return (
    <div
      className={`msg-row ${mine ? 'mine' : 'hers'} ${selected ? 'selected' : ''}`}
      {...press}
    >
      {!mine && (
        <div className="msg-avatar" style={{ borderColor: expr.tint }}>
          {expr.emoji}
        </div>
      )}

      <div className="msg-col">
        {!mine && <span className="msg-who">{personaName}</span>}
        {mine && <span className="msg-who right">{userName || 'You'}</span>}

        <div className={`bubble ${mine ? 'bubble-mine' : 'bubble-hers'} ${message.kind || ''}`}>
          {replyTo && (
            <button className="quote" onClick={() => onJumpTo?.(replyTo.id)}>
              <strong>{replyTo.role === 'user' ? userName || 'You' : personaName}</strong>
              <span>{replyTo.deletedForBoth ? 'deleted message' : replyTo.text.slice(0, 90)}</span>
            </button>
          )}
          {body}
        </div>

        <div className={`msg-meta ${mine ? 'right' : ''}`}>
          {message.pinned && <span title="Pinned">📌</span>}
          {message.bookmarked && <span title="Saved">🔖</span>}
          {message.editedAt && <span>edited</span>}
          <span>{formatTime(message.ts)}</span>
          {message.kind === 'voice' && onSpeak && (
            <button className="mini-btn" onClick={onSpeak} aria-label="Play voice">
              ▶︎
            </button>
          )}
          {!mine && onSpeak && message.kind !== 'voice' && (
            <button className="mini-btn" onClick={onSpeak} aria-label="Hear it">
              🔊
            </button>
          )}
        </div>

        {!!message.reactions?.length && (
          <div className={`reactions ${mine ? 'right' : ''}`}>
            {message.reactions.map((r, i) => (
              <span key={`${r.emoji}-${i}`} className={`reaction ${r.by}`}>
                {r.emoji}
              </span>
            ))}
          </div>
        )}
      </div>

      {selectionMode && (
        <button className={`tick ${selected ? 'on' : ''}`} onClick={onToggleSelect} aria-label="Select message">
          {selected ? '✓' : ''}
        </button>
      )}
    </div>
  )
}
