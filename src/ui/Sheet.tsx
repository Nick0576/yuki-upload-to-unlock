import React, { useEffect, useState } from 'react'

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'auto',
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'auto' | 'tall'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="sheet-wrap" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`sheet ${size === 'tall' ? 'sheet-tall' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip" />
        {title && (
          <div className="sheet-head">
            <h3>{title}</h3>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function Confirm({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="sheet-wrap center" onClick={onClose}>
      <div className="confirm" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {message && <p>{message}</p>}
        <div className="confirm-actions">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? 'danger' : 'primary'}`}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export interface ActionItem {
  label: string
  icon?: string
  danger?: boolean
  onClick: () => void
}

export function ActionSheet({
  open,
  onClose,
  title,
  items,
}: {
  open: boolean
  onClose: () => void
  title?: string
  items: ActionItem[]
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="action-list">
        {items.map((it, i) => (
          <button
            key={`${it.label}-${i}`}
            className={`action-item ${it.danger ? 'danger' : ''}`}
            onClick={() => {
              onClose()
              it.onClick()
            }}
          >
            {it.icon && <span className="action-icon">{it.icon}</span>}
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

export function PromptDialog({
  open,
  title,
  value,
  placeholder,
  confirmLabel = 'Save',
  multiline,
  onSave,
  onClose,
}: {
  open: boolean
  title: string
  value: string
  placeholder?: string
  confirmLabel?: string
  multiline?: boolean
  onSave: (v: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="row gap">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={() => {
              onSave(draft.trim())
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      {multiline ? (
        <textarea
          className="input area"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          autoFocus
        />
      ) : (
        <input
          className="input"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
        />
      )}
    </Sheet>
  )
}

/** Long-press helper for touch + mouse. */
export function useLongPress(onLongPress: () => void, ms = 450) {
  const timer = React.useRef<number | undefined>(undefined)
  const moved = React.useRef(false)

  const start = () => {
    moved.current = false
    timer.current = window.setTimeout(() => {
      if (!moved.current) onLongPress()
    }, ms)
  }
  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current)
  }
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button === 2) return
      start()
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerMove: () => {
      moved.current = true
      cancel()
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault()
      onLongPress()
    },
  }
}
