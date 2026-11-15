/**
 * Lightweight sentiment / intent detection. No model calls: fast, offline and
 * good enough to drive her expression, mood and affection.
 */
export interface Sentiment {
  emotion: string
  score: number
  affection: number
  intent: 'greeting' | 'question' | 'compliment' | 'insult' | 'gift' | 'sad' | 'angry' | 'flirty' | 'goodnight' | 'statement'
}

const RULES: Array<{ emotion: string; words: string[]; weight: number }> = [
  { emotion: 'love', words: ['love you', 'i love you', 'marry me', 'my girlfriend', 'mine forever', 'adore you'], weight: 3 },
  { emotion: 'happy', words: ['happy', 'yay', 'great', 'awesome', 'nice', 'good news', 'amazing', 'perfect', 'thank you', 'thanks', 'love it'], weight: 2 },
  { emotion: 'excited', words: ['excited', 'cant wait', "can't wait", 'lets go', "let's go", 'finally', 'omg'], weight: 2 },
  { emotion: 'laugh', words: ['haha', 'lol', 'lmao', 'funny', 'joke', 'hehe'], weight: 2 },
  { emotion: 'blush', words: ['cute', 'pretty', 'beautiful', 'adorable', 'kiss', 'hug', 'hold my hand', 'date', 'blush'], weight: 2 },
  { emotion: 'shy', words: ['shy', 'embarrassed', 'sorry', 'my bad'], weight: 1 },
  { emotion: 'sad', words: ['sad', 'miss you', 'lonely', 'tired', 'awful', 'bad day', 'cry', 'upset'], weight: -2 },
  { emotion: 'crying', words: ['crying', 'i cried', 'heartbroken', 'broke up', 'devastated'], weight: -3 },
  { emotion: 'angry', words: ['angry', 'mad', 'hate', 'annoying', 'stupid', 'shut up', 'idiot'], weight: -3 },
  { emotion: 'worried', words: ['worried', 'anxious', 'scared', 'nervous', 'exam', 'stress'], weight: -1 },
  { emotion: 'surprised', words: ['what?', 'really?', 'no way', 'seriously', 'wow', 'surprise'], weight: 1 },
  { emotion: 'sleepy', words: ['sleepy', 'good night', 'goodnight', 'bed', 'sleep', 'yawn'], weight: 0 },
  { emotion: 'jealous', words: ['other girl', 'ex', 'she is', 'she was'], weight: -1 },
  { emotion: 'teasing', words: ['tease', 'naughty', 'bad girl', 'brat'], weight: 1 },
  { emotion: 'pout', words: ['fine', 'whatever', 'okay whatever', 'hmph'], weight: -1 },
  { emotion: 'touched', words: ['proud of you', 'believe in you', 'here for you', 'always'], weight: 2 },
  { emotion: 'thinking', words: ['maybe', 'i think', 'wonder', 'hmm'], weight: 0 },
]

export function analyse(text: string): Sentiment {
  const t = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `
  let best: { emotion: string; weight: number } = { emotion: 'neutral', weight: 0 }
  let affection = 0
  for (const rule of RULES) {
    for (const w of rule.words) {
      if (t.includes(` ${w}`) || t.includes(`${w} `)) {
        affection += rule.weight
        if (Math.abs(rule.weight) >= Math.abs(best.weight)) best = { emotion: rule.emotion, weight: rule.weight }
        break
      }
    }
  }

  const question = /\?|^\s*(what|why|how|when|where|who|do you|are you|can you|will you|did you)\b/i.test(text)
  if (question && best.weight === 0) best = { emotion: 'thinking', weight: 0 }

  const intent: Sentiment['intent'] = /^(hi|hey|hello|yo|sup|morning|good morning|evening)\b/i.test(text.trim())
    ? 'greeting'
    : question
      ? 'question'
      : /(love you|you are (so )?(cute|pretty|beautiful)|adorable|amazing|i miss you)/i.test(text)
        ? 'compliment'
        : /(hate you|stupid|idiot|shut up)/i.test(text)
          ? 'insult'
          : /(gift|for you|bought|brought you)/i.test(text)
            ? 'gift'
            : /(good ?night|sleep well|gn)\b/i.test(text)
              ? 'goodnight'
              : /\b(hey|hi|hello)\b/i.test(text)
                ? 'greeting'
                : 'statement'

  const score = Math.max(-1, Math.min(1, best.weight / 3))
  return { emotion: best.emotion, score, affection: Math.max(-3, Math.min(4, affection)), intent }
}

/** Her expression after reading her own reply. */
export function replyEmotion(text: string, fallback: string): string {
  const t = text.toLowerCase()
  if (/[💗💕❤️😍]|love you|i love/.test(t)) return 'love'
  if (/[😳]|blush|embarrass|shy|pervert/.test(t)) return 'blush'
  if (/[😂🤣]|haha|lol/.test(t)) return 'laugh'
  if (/[😭]|cry|tears/.test(t)) return 'crying'
  if (/[😢]|sad|lonely/.test(t)) return 'sad'
  if (/[😠😤]|angry|annoy|hmph/.test(t)) return 'pout'
  if (/[😏😉]|tease|naughty/.test(t)) return 'teasing'
  if (/\?/.test(t) && t.length < 90) return 'thinking'
  if (/[🥰☺️✨]|happy|glad|yay/.test(t)) return 'happy'
  return fallback
}
