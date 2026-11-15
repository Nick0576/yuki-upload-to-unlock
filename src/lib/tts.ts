/** Anime-ish TTS: the phone's native voice inside the APK, Web Speech in a browser. */
let voices: SpeechSynthesisVoice[] = []

declare global {
  interface Window {
    __yukiSpeakEnd?: () => void
  }
}

function loadVoices(): void {
  if (typeof speechSynthesis === 'undefined') return
  voices = speechSynthesis.getVoices()
}
if (typeof speechSynthesis !== 'undefined') {
  loadVoices()
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices)
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  if (!voices.length) loadVoices()
  const score = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase()
    let s = 0
    if (v.lang.startsWith('ja')) s += 6
    if (v.lang.startsWith('en')) s += 2
    if (/(female|girl|woman|kyoko|nanami|samantha|zira|aria|ava|sara)/.test(n)) s += 4
    if (/(google|natural|neural|enhanced)/.test(n)) s += 2
    return s
  }
  return [...voices].sort((a, b) => score(b) - score(a))[0]
}

let current: SpeechSynthesisUtterance | null = null
let nativeOnEnd: (() => void) | undefined

function cleanText(text: string): string {
  return text
    .replace(/\*/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function nativeTts(): boolean {
  return typeof window !== 'undefined' && typeof window.__yukiSpeak === 'function'
}

export function speak(text: string, opts: { rate?: number; pitch?: number; onEnd?: () => void } = {}): void {
  const clean = cleanText(text)
  if (!clean) return

  if (nativeTts()) {
    stop()
    nativeOnEnd = opts.onEnd
    window.__yukiSpeakEnd = () => {
      const cb = nativeOnEnd
      nativeOnEnd = undefined
      cb?.()
    }
    window.__yukiSpeak!(clean.slice(0, 600), opts.rate ?? 1.02, opts.pitch ?? 1.3)
    return
  }

  if (typeof speechSynthesis === 'undefined') return
  stop()

  const utter = new SpeechSynthesisUtterance(clean.slice(0, 600))
  const v = pickVoice()
  if (v) utter.voice = v
  utter.lang = v?.lang || 'en-US'
  utter.rate = opts.rate ?? 1.06
  utter.pitch = opts.pitch ?? 1.35
  utter.volume = 1
  utter.onend = () => {
    current = null
    opts.onEnd?.()
  }
  current = utter
  speechSynthesis.speak(utter)
}

export function stop(): void {
  if (nativeTts()) window.__yukiStopSpeak?.()
  if (typeof speechSynthesis !== 'undefined') {
    try {
      speechSynthesis.cancel()
    } catch {
      /* ignore */
    }
  }
  nativeOnEnd = undefined
  current = null
}

export function speaking(): boolean {
  if (nativeTts()) return false
  return typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking
}
