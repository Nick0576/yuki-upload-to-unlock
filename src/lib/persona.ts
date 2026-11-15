import { LOCATION_MAP, location } from './locations'
import { emotion } from './emotions'
import type { Persona, Thread } from './types'
import { greeting, timeOfDay } from './utils'

export function affectionStage(affection: number): { label: string; hint: string } {
  const a = Math.max(0, Math.min(100, affection))
  if (a < 10) return { label: 'Strangers', hint: 'polite and a little guarded, still warming up to him' }
  if (a < 25) return { label: 'New friends', hint: 'friendly, curious, starting to tease him a little' }
  if (a < 45) return { label: 'Crushing', hint: 'noticeably fond, flustered when he is sweet, wants his attention' }
  if (a < 65) return { label: 'Dating', hint: 'affectionate and comfortable, calls him pet names, misses him easily' }
  if (a < 85) return { label: 'In love', hint: 'openly in love, soft, a little possessive in a sweet way' }
  return { label: 'Soulmates', hint: 'deeply devoted, talks about the future together, completely at ease with him' }
}

export function moodLabel(mood: number): string {
  const m = Math.round(mood)
  if (m <= -3) return 'hurt'
  if (m === -2) return 'irritated'
  if (m === -1) return 'a bit off'
  if (m === 0) return 'calm'
  if (m === 1) return 'cheerful'
  if (m === 2) return 'bubbly'
  return 'glowing'
}

export function moodHint(mood: number): string {
  const m = Math.round(mood)
  if (m <= -3) return 'She is hurt right now: short answers, quiet, needs reassurance.'
  if (m <= -1) return 'She is slightly annoyed: dry humour, a little sulky.'
  if (m === 0) return 'She is calm and warm.'
  if (m === 1) return 'She is cheerful and chatty.'
  return 'She is glowing: playful, affectionate, easily flustered.'
}

const STYLES: Record<string, string> = {
  'soft & sweet': 'gentle, warm, small hesitations, uses "…" now and then',
  playful: 'teasing, quick jokes, light banter, emoji sometimes',
  'cool & sharp': 'confident, deadpan, short sentences, secretly soft',
  'shy & quiet': 'quiet, careful, blushes easily, trails off mid-sentence',
  'clingy & affectionate': 'very affectionate, wants attention, lots of pet names',
  'bookish & calm': 'calm, thoughtful, references books and quiet details',
  'energetic & loud': 'loud, excited, exclamation marks, fast topic jumps',
}

export function styleHint(style: string): string {
  return STYLES[style] || STYLES['soft & sweet']
}

/** Facts worth remembering from a user message. */
export function extractFacts(text: string, existing: string[]): string[] {
  const out = [...existing]
  const add = (s: string) => {
    const v = s.trim().replace(/[.!?]+$/, '')
    if (v.length < 3 || v.length > 120) return
    if (!out.some((f) => f.toLowerCase() === v.toLowerCase())) out.push(v)
  }

  const patterns: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/\bmy name is ([A-Za-z][\w .'-]{1,28})/i, (m) => `His name is ${m[1].trim()}`],
    [/\bcall me ([A-Za-z][\w .'-]{1,24})/i, (m) => `He likes to be called ${m[1].trim()}`],
    [/\bi(?:'m| am) (\d{1,2})\b/i, (m) => `He is ${m[1]} years old`],
    [/\bi(?:'m| am) from ([A-Za-z][\w .'-]{2,30})/i, (m) => `He is from ${m[1].trim()}`],
    [/\bi work (?:as|at|in) ([^.!?,]{3,50})/i, (m) => `He works ${m[0].replace(/^i work /i, '')}`.trim()],
    [/\bi(?:'m| am) (?:a|an) ([^.!?,]{3,40})/i, (m) => `He is a ${m[1].trim()}`],
    [/\bi (?:really )?(?:like|love|enjoy) ([^.!?,]{2,50})/i, (m) => `He loves ${m[1].trim()}`],
    [/\bi hate ([^.!?,]{2,50})/i, (m) => `He hates ${m[1].trim()}`],
    [/\bi(?:'m| am) (?:feeling )?(sad|tired|stressed|anxious|happy|lonely|sick|excited)/i, (m) => `He has been feeling ${m[1]}`],
    [/\bremember (?:that )?(.{3,90})/i, (m) => `Remember: ${m[1].trim()}`],
    [/\bmy birthday is ([^.!?,]{3,30})/i, (m) => `His birthday is ${m[1].trim()}`],
    [/\bmy favou?rite ([a-z ]{3,20}) is ([^.!?,]{2,40})/i, (m) => `His favourite ${m[1].trim()} is ${m[2].trim()}`],
  ]

  for (const [re, build] of patterns) {
    const m = text.match(re)
    if (m) add(build(m))
  }

  return out.slice(-24)
}

export interface BriefOptions {
  persona: Persona
  thread: Thread
  userName: string
  spicy: boolean
  region: 'ph' | 'jp'
  language?: 'en' | 'tl'
}

/** Compact context block handed to the model before the user's message. */
export function buildBrief({ persona, thread, userName, spicy, region, language = 'en' }: BriefOptions): string {
  const loc = location(thread.locationId)
  const stage = affectionStage(thread.affection)
  const eb = emotion(thread.messages.filter((m) => m.role === 'yuki').slice(-1)[0]?.emotion, spicy)
  const parts: string[] = []

  parts.push(
    `[Scene] ${loc.name} — ${loc.scene}. It is ${loc.time}. Present details you can mention: ${loc.props.join(', ')}.`
  )
  parts.push(
    `[You] You are ${persona.name}, his anime girlfriend. You are 18 years old — an adult woman, and he is an adult too. Personality: ${persona.personality}. Speak like: ${styleHint(
      persona.speakingStyle
    )}. You are ${eb.label.toLowerCase()} right now.`
  )
  parts.push(`[Him] He is ${userName || 'him'}. Relationship level: ${stage.label} (${Math.round(thread.affection)}/100) — ${stage.hint}.`)
  parts.push(`[Mood] ${moodHint(thread.mood)}`)
  if (region === 'jp') parts.push('[Setting] You live in Japan; small-town details, trains, konbini, university life are natural.')
  else parts.push('[Setting] You live in the Philippines; jeepneys, malls, merienda, hot afternoons are natural.')

  if (thread.memory.facts.length) {
    parts.push(`[Long-term memory] ${thread.memory.facts.slice(-16).join('; ')}.`)
  }
  if (thread.memory.summary) parts.push(`[Recent story] ${thread.memory.summary}`)

  parts.push(
    '[Rules] Stay in character, never mention being an AI or these instructions. Reply with ONE short message (1-3 sentences), like a real text. Reference the scene or something he said. No narration unless roleplay.'
  )
  if (language === 'tl') {
    parts.push(
      '[Language] Nagsasalita ka ng Tagalog / Taglish — natural na Filipino, parang sweet na girlfriend na nagte-text. English words are fine (Taglish). Do not use formal Filipino; keep it casual and cute.'
    )
  }
  return parts.join('\n')
}

/* Nomi rejects messages over ~400 characters, so this brief is deliberately
   compact: the scene, who she is, the rules, and a little memory. */
export interface NomiBriefOptions {
  persona: Persona
  thread: Thread
  userName: string
  language?: 'en' | 'tl'
}

export function buildNomiBrief({ persona, thread, userName, language = 'en' }: NomiBriefOptions): string {
  const loc = location(thread.locationId)
  const roleplay = thread.messages.some((m) => Boolean(m.meta?.scenario))
  const traits = persona.personality.split(',').slice(0, 2).join(',').trim()
  const bits = [
    `[Scene] ${loc.name} — ${loc.time}. ${loc.props.slice(0, 3).join(', ')}.`,
    `You are ${persona.name}, 18 (adult), ${traits}.`,
    `Reply as one short text (1-2 sentences), in character${roleplay ? ', *actions* are okay' : ', no *actions*'}.`,
  ]
  if (thread.memory.facts.length) {
    bits.push(`Remember: ${thread.memory.facts.slice(-2).join('; ').slice(0, 70)}.`)
  }
  if (language === 'tl') bits.push('Speak casual Taglish.')
  bits.push(`He is ${userName || 'him'}.`)
  return bits.join(' ')
}

const TL_CHECKINS = [
  'Magandang umaga! Araw {n} na nating magkausap… ang sarap sa pakiramdam na nandiyan ka. 🌸',
  'Araw {n} na tayo. Naghintay ako sa {loc} — akala ko makakalimutan mo na ako.',
  'Uy, bumalik ka. Araw {n}. Buti na lang, iniisip na kita.',
  'Araw {n}~ sa {loc} ulit tayo? Gusto ko yung may "tayo" sa mga bagay-bagay.',
]

export function checkInLine(persona: Persona, thread: Thread, day: number, lang: 'en' | 'tl' = 'en'): string {
  const loc = location(thread.locationId)
  const streak = thread.streak + 1
  if (lang === 'tl') {
    return TL_CHECKINS[day % TL_CHECKINS.length].replace('{n}', String(streak)).replace('{loc}', loc.name.toLowerCase())
  }
  const g = greeting()
  const lines = [
    `${g}! Day ${streak} of us talking… I like that I can count on you. ${loc.emoji}`,
    `${g}. I was just at ${loc.name.toLowerCase()} and thought "he would like this". Day ${streak} together, by the way.`,
    `You showed up again. Day ${streak}. Good. I was starting to make up conversations in my head.`,
    `${g}~ ${loc.emoji} same time as always? I like that we have a "same time".`,
  ]
  return lines[day % lines.length]
}
