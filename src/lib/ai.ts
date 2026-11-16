import { offlineReply } from './engine'
import { apiFetch } from './native'
import { buildBrief, buildNomiBrief } from './persona'
import {
  buildChatPrompt,
  encodeHistory,
  ensureLocalModel,
  localGenerate,
  nativeChatPrompt,
} from './localai'
import type { Persona, Settings, Thread } from './types'

export interface AskArgs {
  message: string
  thread: Thread
  persona: Persona
  userName: string
  settings: Settings
  signal?: AbortSignal
}

export interface AskResult {
  text: string
  source: 'nomi' | 'offline' | 'local'
}

/** Roleplay threads keep *action* narration; normal chats get clean text. */
function isRoleplay(thread: Thread): boolean {
  return thread.messages.some((m) => Boolean(m.meta?.scenario))
}

/** Nomi likes long paragraphs — keep her replies feeling like texts. */
export function tidy(text: string, roleplay: boolean): string {
  let out = String(text || '').replace(/\r/g, '').trim()
  if (!roleplay) out = out.replace(/\*[^*]{0,400}\*/g, ' ')
  out = out
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ +([,.!?…])/g, '$1')
    .trim()
  if (out.length > 340) {
    const cut = out.slice(0, 340)
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '), cut.lastIndexOf('… '))
    out = end > 120 ? cut.slice(0, end + 1) : `${cut.trim()}…`
  }
  return out
}

/** Local llama.cpp engine: full prompt, no cloud, no length limit. */
async function askLocal(args: AskArgs): Promise<AskResult> {
  await ensureLocalModel()

  const { thread, persona, userName, settings } = args
  const brief = buildBrief({
    persona,
    thread,
    userName,
    spicy: settings.spicy,
    region: settings.region,
    language: settings.language,
  })

  const pairs: Array<[string, string]> = []
  for (const m of thread.messages.filter((x) => !x.deletedForBoth && !x.deletedForMe)) {
    if (m.role !== 'user' && m.role !== 'yuki') continue
    pairs.push([m.role === 'user' ? 'user' : 'assistant', m.text.slice(-400)])
    if (pairs.length >= 8) break
  }
  pairs.push(['user', args.message])

  const system = `${brief}\n\nReply as ${persona.name} in the first person, in ${
    settings.language === 'tl' ? 'casual Tagalog/Taglish' : 'English'
  }. Keep it short and natural.`

  const templated = nativeChatPrompt(system, encodeHistory(pairs))
  const prompt = templated || buildChatPrompt(system, pairs)

  let text = ''
  const gen = localGenerate(prompt, {
    maxTokens: 180,
    temperature: 0.85,
    topP: 0.9,
    topK: 40,
    signal: args.signal,
  })
  for await (const tok of gen) text += tok

  const clean = text.trim()
  if (!clean) throw new Error('empty_local_reply')
  return { text: tidy(clean, isRoleplay(thread)), source: 'local' }
}

export async function askYuki(args: AskArgs): Promise<AskResult> {
  const { settings } = args
  const MAX = 390

  if (settings.aiMode === 'local') {
    try {
      return await askLocal(args)
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err
      console.warn('[yuki] local AI failed', err)
      throw new Error(`local_${(err as Error)?.message || 'failed'}`)
    }
  }

  if (settings.aiMode === 'nomi') {
    const head = buildNomiBrief({
      persona: args.persona,
      thread: args.thread,
      userName: args.userName,
      language: settings.language,
    })
    const room = Math.max(60, MAX - head.length - 2)
    const prompt = `${head}\n${args.message.slice(0, room)}`.slice(0, MAX)

    try {
      const res = await apiFetch('/api/nomi/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomisId: settings.nomisId || undefined,
          messageText: prompt,
        }),
        signal: args.signal,
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.text) {
        return { text: tidy(String(data.text), isRoleplay(args.thread)), source: 'nomi' }
      }
      console.warn('[yuki] nomi failed', res.status, data)
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err
      console.warn('[yuki] nomi unreachable, using offline engine', err)
    }
  }

  // Offline engine — always available.
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 700))
  return {
    text: offlineReply({
      message: args.message,
      thread: args.thread,
      persona: args.persona,
      userName: args.userName,
      spicy: args.settings.spicy,
      language: args.settings.language,
    }),
    source: 'offline',
  }
}
