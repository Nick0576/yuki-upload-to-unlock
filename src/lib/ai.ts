import { offlineReply } from './engine'
import { apiFetch } from './native'
import { buildNomiBrief } from './persona'
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
  source: 'nomi' | 'offline'
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

export async function askYuki(args: AskArgs): Promise<AskResult> {
  const { settings } = args
  const MAX = 390

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
