import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { askYuki } from './lib/ai'
import { GIFTS, SCENARIOS } from './lib/content'
import { emotion, emotionImage } from './lib/emotions'
import { giftLine, proactiveLine } from './lib/engine'
import { location } from './lib/locations'
import { showNotification } from './lib/notify'
import { affectionStage, checkInLine, extractFacts, moodLabel } from './lib/persona'
import { makeSelfie } from './lib/selfie'
import { analyse, replyEmotion } from './lib/sentiment'
import { getAgeOk, loadDB, newThread, saveDB, setAgeOk as persistAge } from './lib/storage'
import { speak } from './lib/tts'
import type { Account, DB, Message, MessageKind, Persona, Settings, Thread } from './lib/types'
import { clamp, dayKey, download, sleep, uid } from './lib/utils'

export interface SendOptions {
  kind?: MessageKind
  meta?: Record<string, string | number | undefined>
  replyTo?: string
  emotion?: string
  silent?: boolean
  sticker?: string
}

export interface Toast {
  id: string
  text: string
  tone?: 'info' | 'error'
}

interface Ctx {
  db: DB
  user: Account | null
  ageOk: boolean
  ready: boolean
  threads: Thread[]
  thread?: Thread
  typing: boolean
  stream: { threadId: string; msgId: string; text: string } | null
  toasts: Toast[]
  toast: (text: string, tone?: 'info' | 'error') => void
  anon: (ok: boolean) => void
  signIn: (account: Account) => void
  signOut: () => void
  setPersona: (p: Partial<Persona>) => void
  setUserName: (name: string) => void
  setSettings: (s: Partial<Settings>) => void
  createThread: (opts?: { scenarioId?: string; title?: string; locationId?: string }) => string
  selectThread: (id: string) => void
  archiveThread: (id: string, archived: boolean) => void
  deleteThread: (id: string) => void
  setLocation: (locationId: string) => void
  setEmotion: (emotionId: string) => void
  clearHistory: () => void
  exportChat: (format: 'txt' | 'json') => void
  send: (text: string, opts?: SendOptions) => Promise<void>
  regenerate: (msgId?: string) => Promise<void>
  editMessage: (msgId: string, text: string) => Promise<void>
  deleteMessage: (msgId: string, mode: 'me' | 'both') => void
  togglePin: (msgId: string) => void
  toggleBookmark: (msgId: string) => void
  react: (msgId: string, emoji: string) => void
  bulk: (mode: 'delete' | 'copy', ids: string[]) => Promise<void>
  stop: () => void
  giveGift: (giftId: string) => Promise<void>
  takeSelfie: () => Promise<void>
  saveSticker: (emoji: string) => void
  checkIn: () => void
  proactive: () => void
  roleplay: (prompt: string) => Promise<void>
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ageOk, setAgeOk] = useState<boolean>(() => getAgeOk())
  const [user, setUser] = useState<Account | null>(null)
  const [db, setDb] = useState<DB>(() => loadDB(undefined))
  const [ready, setReady] = useState(false)
  const [typing, setTyping] = useState(false)
  const [stream, setStream] = useState<Ctx['stream']>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const stopRef = useRef(false)
  const busyRef = useRef(false)
  const dbRef = useRef(db)
  dbRef.current = db

  const toast = useCallback((text: string, tone: 'info' | 'error' = 'info') => {
    const t: Toast = { id: uid('t'), text, tone }
    setToasts((prev) => [...prev.slice(-2), t])
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 2600)
  }, [])

  /* ------------------------------------------------------------- persist */
  useEffect(() => {
    if (!ready) return
    saveDB(user?.email, db)
  }, [db, ready, user?.email])

  /* ------------------------------------------------------------ bootstrap */
  useEffect(() => {
    const loaded = loadDB(user?.email)
    if (!loaded.threads.length) {
      const t = newThread({ title: 'With Yuki', scenario: 'Just us', locationId: 'bedroom' })
      t.messages.push({
        id: uid('m'),
        role: 'yuki',
        text: 'You actually came. I was starting to rehearse things to say… hi. 💗',
        ts: Date.now(),
        emotion: 'shy',
      })
      loaded.threads = [t]
      loaded.activeThreadId = t.id
    }
    if (!loaded.activeThreadId) loaded.activeThreadId = loaded.threads[0]?.id
    setDb(loaded)
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email])

  const thread = useMemo(
    () => db.threads.find((t) => t.id === db.activeThreadId),
    [db.threads, db.activeThreadId]
  )

  const threads = useMemo(
    () => [...db.threads].sort((a, b) => Number(a.archived) - Number(b.archived) || b.updatedAt - a.updatedAt),
    [db.threads]
  )

  /* --------------------------------------------------------------- utils */
  const patchThread = useCallback((id: string, updater: (t: Thread) => Thread) => {
    setDb((prev) => ({
      ...prev,
      threads: prev.threads.map((t) => (t.id === id ? updater(t) : t)),
    }))
  }, [])

  const patchMessage = useCallback(
    (threadId: string, msgId: string, patch: (m: Message) => Message) => {
      patchThread(threadId, (t) => ({
        ...t,
        messages: t.messages.map((m) => (m.id === msgId ? patch(m) : m)),
      }))
    },
    [patchThread]
  )

  const pushMessage = useCallback(
    (threadId: string, msg: Message) => {
      patchThread(threadId, (t) => ({
        ...t,
        messages: [...t.messages, msg],
        updatedAt: msg.ts,
        unread: msg.role === 'yuki' ? t.unread + 1 : 0,
      }))
    },
    [patchThread]
  )

  /* ---------------------------------------------------------------- auth */
  const anon = useCallback((ok: boolean) => {
    persistAge(ok, !ok)
    setAgeOk(ok)
  }, [])

  const signIn = useCallback((account: Account) => {
    setDb((prev) => ({ ...prev, account }))
    setUser(account)
  }, [])

  const signOut = useCallback(() => {
    setDb((prev) => ({ ...prev, account: undefined }))
    setUser(null)
  }, [])

  /* ------------------------------------------------------------- persona */
  const setPersona = useCallback((p: Partial<Persona>) => {
    setDb((prev) => ({ ...prev, persona: { ...prev.persona, ...p } }))
  }, [])

  const setUserName = useCallback((name: string) => {
    setDb((prev) => ({ ...prev, userName: name.slice(0, 24) }))
  }, [])

  const setSettings = useCallback((s: Partial<Settings>) => {
    setDb((prev) => ({ ...prev, settings: { ...prev.settings, ...s } }))
  }, [])

  /* ------------------------------------------------------------- threads */
  const createThread = useCallback(
    (opts?: { scenarioId?: string; title?: string; locationId?: string }) => {
      const sc = opts?.scenarioId ? SCENARIOS.find((s) => s.id === opts.scenarioId) : undefined
      const t = newThread({
        title: sc?.name || opts?.title || 'New chat',
        scenario: sc?.name || 'Just us',
        locationId: opts?.locationId || sc?.locationId || 'bedroom',
      })
      if (sc) {
        t.messages.push({
          id: uid('m'),
          role: 'yuki',
          text: sc.opener,
          ts: Date.now(),
          emotion: 'shy',
          kind: 'roleplay',
          meta: { scenario: sc.id },
        })
      }
      setDb((prev) => ({ ...prev, threads: [t, ...prev.threads], activeThreadId: t.id }))
      return t.id
    },
    []
  )

  const selectThread = useCallback((id: string) => {
    setDb((prev) => ({
      ...prev,
      activeThreadId: id,
      threads: prev.threads.map((t) => (t.id === id ? { ...t, unread: 0 } : t)),
    }))
  }, [])

  const archiveThread = useCallback(
    (id: string, archived: boolean) => {
      patchThread(id, (t) => ({ ...t, archived }))
      toast(archived ? 'Chat archived' : 'Chat restored')
    },
    [patchThread, toast]
  )

  const deleteThread = useCallback(
    (id: string) => {
      setDb((prev) => {
        const threads = prev.threads.filter((t) => t.id !== id)
        return { ...prev, threads, activeThreadId: prev.activeThreadId === id ? threads[0]?.id : prev.activeThreadId }
      })
      toast('Chat deleted')
    },
    [toast]
  )

  const setLocation = useCallback(
    (locationId: string) => {
      setDb((prev) => ({
        ...prev,
        threads: prev.threads.map((t) =>
          t.id === prev.activeThreadId
            ? {
                ...t,
                locationId,
                messages: [
                  ...t.messages,
                  {
                    id: uid('m'),
                    role: 'system',
                    text: `You moved to ${location(locationId).name}.`,
                    ts: Date.now(),
                  },
                ],
              }
            : t
        ),
      }))
    },
    []
  )

  const setEmotion = useCallback(
    (emotionId: string) => {
      const t = dbRef.current.threads.find((x) => x.id === dbRef.current.activeThreadId)
      if (!t) return
      const last = [...t.messages].reverse().find((m) => m.role === 'yuki')
      if (last) patchMessage(t.id, last.id, (m) => ({ ...m, emotion: emotionId }))
    },
    [patchMessage]
  )

  const clearHistory = useCallback(() => {
    const id = dbRef.current.activeThreadId
    if (!id) return
    patchThread(id, (t) => ({ ...t, messages: [], memory: { facts: [], summary: '' } }))
    toast('Chat cleared')
  }, [patchThread, toast])

  const exportChat = useCallback(
    (format: 'txt' | 'json') => {
      const t = dbRef.current.threads.find((x) => x.id === dbRef.current.activeThreadId)
      if (!t) return
      const stamp = dayKey()
      if (format === 'json') {
        download(`yuki-chat-${stamp}.json`, JSON.stringify(t, null, 2), 'application/json')
        return
      }
      const lines = t.messages
        .filter((m) => !m.deletedForMe && !m.deletedForBoth)
        .map((m) => {
          const who = m.role === 'user' ? dbRef.current.userName || 'You' : m.role === 'yuki' ? dbRef.current.persona.name : '—'
          const time = new Date(m.ts).toLocaleString()
          return `[${time}] ${who}: ${m.text}`
        })
      download(
        `yuki-chat-${stamp}.txt`,
        `Yuki — ${t.title}\nScene: ${location(t.locationId).name}\n\n${lines.join('\n')}\n`
      )
      toast('Chat exported')
    },
    [toast]
  )

  /* -------------------------------------------------------------- stream */
  const reveal = useCallback(
    async (threadId: string, msgId: string, full: string, emotionId: string) => {
      const words = full.split(/(\s+)/).filter((w) => w.length)
      let out = ''
      setStream({ threadId, msgId, text: '' })
      for (let i = 0; i < words.length; i++) {
        if (stopRef.current) break
        out += words[i]
        if (words[i].trim()) setStream({ threadId, msgId, text: out })
        if (words[i].trim()) await sleep(22 + Math.random() * 34)
      }
      const finalText = out.trim() || full
      patchMessage(threadId, msgId, (m) => ({ ...m, text: finalText, emotion: emotionId }))
      setStream(null)
      return finalText
    },
    [patchMessage]
  )

  const generate = useCallback(
    async (threadId: string, userText: string, replaceId?: string) => {
      const current = dbRef.current
      const t = current.threads.find((x) => x.id === threadId)
      if (!t) return
      const persona = current.persona
      const settings = current.settings

      setTyping(true)
      stopRef.current = false
      busyRef.current = true

      let text = ''
      let source: 'nomi' | 'offline' = 'offline'
      try {
        const res = await askYuki({
          message: userText,
          thread: t,
          persona,
          userName: current.userName,
          settings,
        })
        text = res.text
        source = res.source
      } catch (err) {
        console.warn('[yuki] reply failed', err)
        text = 'Sorry… I lost my train of thought. Say that again?'
      }
      setTyping(false)
      if (stopRef.current) {
        busyRef.current = false
        return
      }

      const senti = analyse(userText)
      const expr = replyEmotion(text, senti.emotion)
      const msg: Message = {
        id: replaceId || uid('m'),
        role: 'yuki',
        text: '',
        ts: Date.now(),
        emotion: expr,
        meta: { source },
      }

      if (replaceId) {
        patchMessage(threadId, replaceId, (m) => ({ ...msg, reactions: m.reactions }))
      } else {
        pushMessage(threadId, msg)
      }

      const finalText = await reveal(threadId, msg.id, text, expr)

      const affDelta = clamp(senti.affection + 1, -2, 4)
      patchThread(threadId, (th) => {
        const facts = extractFacts(userText, th.memory.facts)
        const recent = th.messages.filter((m) => m.role === 'user').slice(-4).map((m) => m.text)
        const summary = recent.join(' / ').slice(0, 300)
        return {
          ...th,
          affection: clamp(th.affection + affDelta, 0, 100),
          mood: clamp(th.mood + senti.score * 1.6, -5, 5),
          memory: { facts, summary },
          updatedAt: Date.now(),
        }
      })

      if (settings.autoSpeak && settings.tts) speak(finalText)
      busyRef.current = false
    },
    [patchMessage, patchThread, pushMessage, reveal]
  )

  const send = useCallback(
    async (raw: string, opts: SendOptions = {}) => {
      const text = raw.trim()
      const t = dbRef.current.threads.find((x) => x.id === dbRef.current.activeThreadId)
      if (!t) return
      if (!text && opts.kind !== 'selfie' && opts.kind !== 'gift' && opts.kind !== 'voice') return
      if (busyRef.current) {
        toast('She is still typing…', 'info')
        return
      }

      const senti = analyse(text || '')
      const msg: Message = {
        id: uid('m'),
        role: 'user',
        text,
        ts: Date.now(),
        kind: opts.kind || 'text',
        replyTo: opts.replyTo,
        emotion: opts.emotion,
        meta: { ...(opts.meta || {}), ...(opts.sticker ? { sticker: opts.sticker } : {}) },
      }

      patchThread(t.id, (th) => ({
        ...th,
        messages: [...th.messages, msg],
        updatedAt: msg.ts,
        unread: 0,
        affection: clamp(th.affection + clamp(senti.affection, -2, 3), 0, 100),
        mood: clamp(th.mood + senti.score, -5, 5),
      }))

      if (opts.silent) return
      await generate(t.id, text || '(a gift)')
    },
    [generate, patchThread, toast]
  )

  const regenerate = useCallback(
    async (msgId?: string) => {
      const t = dbRef.current.threads.find((x) => x.id === dbRef.current.activeThreadId)
      if (!t || busyRef.current) return
      const messages = t.messages.filter((m) => !m.deletedForBoth && !m.deletedForMe)
      let index = -1
      if (msgId) {
        index = messages.findIndex((m) => m.id === msgId)
      } else {
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'yuki') {
            index = i
            break
          }
        }
      }
      if (index < 0) return
      const target = messages[index]
      if (!target || target.role !== 'yuki') return

      const priorUser = [...messages.slice(0, index)].reverse().find((m) => m.role === 'user')
      patchMessage(t.id, target.id, (m) => ({ ...m, text: '', reactions: [] }))
      await generate(t.id, priorUser?.text || 'say something new', target.id)
      toast('New reply')
    },
    [generate, patchMessage, toast]
  )

  const editMessage = useCallback(
    async (msgId: string, text: string) => {
      const t = dbRef.current.threads.find((x) => x.id === dbRef.current.activeThreadId)
      if (!t) return
      patchMessage(t.id, msgId, (m) => ({ ...m, text, editedAt: Date.now() }))
      if (busyRef.current) return

      // Editing a user message regenerates the AI reply that followed it.
      const idx = t.messages.findIndex((m) => m.id === msgId)
      if (idx < 0) return
      const after = t.messages.slice(idx + 1).filter((m) => !m.deletedForBoth && !m.deletedForMe)
      const nextYuki = after.find((m) => m.role === 'yuki')
      if (nextYuki) {
        patchMessage(t.id, nextYuki.id, (m) => ({ ...m, text: '', reactions: [] }))
        await generate(t.id, text, nextYuki.id)
      } else {
        await generate(t.id, text)
      }
    },
    [generate, patchMessage]
  )

  const deleteMessage = useCallback(
    (msgId: string, mode: 'me' | 'both') => {
      const id = dbRef.current.activeThreadId
      if (!id) return
      patchMessage(id, msgId, (m) => (mode === 'me' ? { ...m, deletedForMe: true } : { ...m, deletedForBoth: true }))
      toast(mode === 'me' ? 'Deleted for you' : 'Deleted for both')
    },
    [patchMessage, toast]
  )

  const togglePin = useCallback(
    (msgId: string) => {
      const id = dbRef.current.activeThreadId
      if (!id) return
      let pinned = false
      patchMessage(id, msgId, (m) => {
        pinned = !m.pinned
        return { ...m, pinned: !m.pinned }
      })
      toast(pinned ? 'Pinned' : 'Unpinned')
    },
    [patchMessage, toast]
  )

  const toggleBookmark = useCallback(
    (msgId: string) => {
      const id = dbRef.current.activeThreadId
      if (!id) return
      let on = false
      patchMessage(id, msgId, (m) => {
        on = !m.bookmarked
        return { ...m, bookmarked: !m.bookmarked }
      })
      toast(on ? 'Saved' : 'Removed from saved')
    },
    [patchMessage, toast]
  )

  const react = useCallback(
    (msgId: string, emoji: string) => {
      const id = dbRef.current.activeThreadId
      if (!id) return
      patchMessage(id, msgId, (m) => {
        const list = m.reactions || []
        const mine = list.find((r) => r.by === 'user' && r.emoji === emoji)
        return {
          ...m,
          reactions: mine ? list.filter((r) => !(r.by === 'user' && r.emoji === emoji)) : [...list, { emoji, by: 'user' }],
        }
      })
    },
    [patchMessage]
  )

  const bulk = useCallback(
    async (mode: 'delete' | 'copy', ids: string[]) => {
      const t = dbRef.current.threads.find((x) => x.id === dbRef.current.activeThreadId)
      if (!t) return
      if (mode === 'delete') {
        const set = new Set(ids)
        patchThread(t.id, (th) => ({
          ...th,
          messages: th.messages.map((m) => (set.has(m.id) ? { ...m, deletedForMe: true } : m)),
        }))
        toast(`${ids.length} messages deleted`)
        return
      }
      const text = t.messages
        .filter((m) => ids.includes(m.id))
        .map((m) => `${m.role === 'user' ? dbRef.current.userName || 'You' : dbRef.current.persona.name}: ${m.text}`)
        .join('\n')
      try {
        await navigator.clipboard.writeText(text)
        toast(`${ids.length} messages copied`)
      } catch {
        toast('Could not copy', 'error')
      }
    },
    [patchThread, toast]
  )

  const stop = useCallback(() => {
    stopRef.current = true
    setTyping(false)
    setStream(null)
    toast('Stopped')
  }, [toast])

  /* -------------------------------------------------------------- extras */
  const giveGift = useCallback(
    async (giftId: string) => {
      const gift = GIFTS.find((g) => g.id === giftId)
      const t = dbRef.current.threads.find((x) => x.id === dbRef.current.activeThreadId)
      if (!gift || !t || busyRef.current) return
      pushMessage(t.id, {
        id: uid('m'),
        role: 'user',
        text: `sent ${gift.emoji} ${gift.name}`,
        ts: Date.now(),
        kind: 'gift',
        meta: { gift: gift.id, emoji: gift.emoji },
      })
      patchThread(t.id, (th) => ({ ...th, affection: clamp(th.affection + gift.boost, 0, 100), mood: clamp(th.mood + 1, -5, 5) }))
      busyRef.current = true
      setTyping(true)
      await sleep(700)
      setTyping(false)
      const line = giftLine(gift.name, gift.boost, t, dbRef.current.settings.language)
      const msg: Message = { id: uid('m'), role: 'yuki', text: line, ts: Date.now(), emotion: 'blush' }
      pushMessage(t.id, msg)
      await reveal(t.id, msg.id, line, 'blush')
      patchThread(t.id, (th) => ({ ...th, affection: clamp(th.affection + 1, 0, 100) }))
      if (dbRef.current.settings.tts && dbRef.current.settings.autoSpeak) speak(line)
      busyRef.current = false
    },
    [patchThread, pushMessage, reveal]
  )

  const takeSelfie = useCallback(async () => {
    const t = dbRef.current.threads.find((x) => x.id === dbRef.current.activeThreadId)
    if (!t) return
    const last = [...t.messages].reverse().find((m) => m.role === 'yuki')
    const exprId = emotion(last?.emotion, dbRef.current.settings.spicy).id
    toast('Yuki is taking a selfie…')
    try {
      const caption = `At ${location(t.locationId).name.toLowerCase()} — wish you were here.`
      const dataUrl = await makeSelfie({ locationId: t.locationId, emotionId: exprId, caption })
      const selfie = { id: uid('s'), dataUrl, caption, locationId: t.locationId, ts: Date.now() }
      setDb((prev) => ({ ...prev, selfies: [...prev.selfies, selfie].slice(-24) }))
      pushMessage(t.id, {
        id: uid('m'),
        role: 'yuki',
        text: caption,
        ts: Date.now(),
        kind: 'selfie',
        emotion: exprId,
        meta: { selfieId: selfie.id },
      })
      toast('New selfie')
    } catch (err) {
      console.warn(err)
      toast('Could not make a selfie', 'error')
    }
  }, [pushMessage, toast])

  const saveSticker = useCallback((emoji: string) => {
    setDb((prev) => ({ ...prev, stickers: [...new Set([emoji, ...prev.stickers])].slice(0, 40) }))
  }, [])

  const checkIn = useCallback(() => {
    const today = dayKey()
    const id = dbRef.current.activeThreadId
    const t = dbRef.current.threads.find((x) => x.id === id)
    if (!t || t.lastCheckIn === today) return
    const streak = t.lastCheckIn ? t.streak + 1 : 1
    pushMessage(t.id, {
      id: uid('m'),
      role: 'yuki',
      text: checkInLine(dbRef.current.persona, t, Math.max(0, streak - 1), dbRef.current.settings.language),
      ts: Date.now(),
      kind: 'checkin',
      emotion: 'happy',
    })
    patchThread(t.id, (th) => ({
      ...th,
      streak,
      lastCheckIn: today,
      affection: clamp(th.affection + 2, 0, 100),
      mood: clamp(th.mood + 1, -5, 5),
    }))
    showNotification(dbRef.current.persona.name, 'Day ' + streak + ' streak — I checked in first this time.')
  }, [patchThread, pushMessage])

  const proactive = useCallback(() => {
    if (busyRef.current || typing) return
    const t = dbRef.current.threads.find((x) => x.id === dbRef.current.activeThreadId)
    if (!t) return
    const last = t.messages[t.messages.length - 1]
    if (last && Date.now() - last.ts < 4 * 60_000) return
    const text = proactiveLine(t, dbRef.current.persona, dbRef.current.settings.language)
    pushMessage(t.id, { id: uid('m'), role: 'yuki', text, ts: Date.now(), emotion: 'happy' })
    showNotification(dbRef.current.persona.name, text)
  }, [pushMessage, typing])

  const roleplay = useCallback(
    async (prompt: string) => {
      const t = dbRef.current.threads.find((x) => x.id === dbRef.current.activeThreadId)
      if (!t) return
      pushMessage(t.id, {
        id: uid('m'),
        role: 'system',
        text: prompt,
        ts: Date.now(),
        kind: 'roleplay',
      })
      await generate(t.id, prompt)
    },
    [generate, pushMessage]
  )

  /* ------------------------------------------------------------- autosave */
  useEffect(() => {
    const t = thread
    if (!t || t.lastCheckIn === dayKey() || !ready) return
    const timer = window.setTimeout(() => checkIn(), 1400)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.id, ready])

  const value: Ctx = {
    db,
    user,
    ageOk,
    ready,
    threads,
    thread,
    typing,
    stream,
    toasts,
    toast,
    anon,
    signIn,
    signOut,
    setPersona,
    setUserName,
    setSettings,
    createThread,
    selectThread,
    archiveThread,
    deleteThread,
    setLocation,
    setEmotion,
    clearHistory,
    exportChat,
    send,
    regenerate,
    editMessage,
    deleteMessage,
    togglePin,
    toggleBookmark,
    react,
    bulk,
    stop,
    giveGift,
    takeSelfie,
    saveSticker,
    checkIn,
    proactive,
    roleplay,
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

export { affectionStage, moodLabel }
