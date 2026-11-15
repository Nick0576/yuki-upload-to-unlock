/**
 * Emotions. The eight (plus two private) with artwork are overlaid on the
 * location background. Anything without artwork falls back to an emoji badge
 * near her hair, upper-right.
 */
export interface EmotionMeta {
  id: string
  label: string
  emoji: string
  image?: string
  private?: boolean
  tint?: string
}

export const EMOTIONS: EmotionMeta[] = [
  { id: 'neutral', label: 'Neutral', emoji: '🙂', image: '/assets/emotions/neutral.png', tint: '#c9b8ff' },
  { id: 'happy', label: 'Happy', emoji: '😄', image: '/assets/emotions/happy.png', tint: '#ffd166' },
  { id: 'blush', label: 'Embarrassed', emoji: '😳', image: '/assets/emotions/blush.png', tint: '#ff9ec7' },
  { id: 'sad', label: 'Sad', emoji: '😢', image: '/assets/emotions/sad.png', tint: '#8fb8ff' },
  { id: 'angry', label: 'Angry', emoji: '😠', image: '/assets/emotions/angry.png', tint: '#ff7a7a' },
  { id: 'surprised', label: 'Surprised', emoji: '😲', image: '/assets/emotions/surprised.png', tint: '#a7f3d0' },
  { id: 'crying', label: 'Crying', emoji: '😭', image: '/assets/emotions/crying.png', tint: '#9ecbff' },
  { id: 'shy', label: 'Shy', emoji: '☺️', image: '/assets/emotions/shy.png', tint: '#ffc2d1' },

  { id: 'excited', label: 'Excited', emoji: '🤩' },
  { id: 'love', label: 'In love', emoji: '😍' },
  { id: 'laugh', label: 'Laughing', emoji: '😂' },
  { id: 'teasing', label: 'Teasing', emoji: '😏' },
  { id: 'wink', label: 'Wink', emoji: '😉' },
  { id: 'smirk', label: 'Smirk', emoji: '😼' },
  { id: 'pout', label: 'Pouting', emoji: '😤' },
  { id: 'annoyed', label: 'Annoyed', emoji: '😒' },
  { id: 'jealous', label: 'Jealous', emoji: '😖' },
  { id: 'thinking', label: 'Thinking', emoji: '🤔' },
  { id: 'sleepy', label: 'Sleepy', emoji: '😴' },
  { id: 'worried', label: 'Worried', emoji: '😟' },
  { id: 'scared', label: 'Scared', emoji: '😨' },
  { id: 'touched', label: 'Touched', emoji: '🥹' },
  { id: 'bored', label: 'Bored', emoji: '🥱' },

  {
    id: 'private-neutral',
    label: 'Undressed',
    emoji: '🫣',
    image: '/assets/emotions/private-neutral.png',
    private: true,
  },
  {
    id: 'private-moan',
    label: 'Close',
    emoji: '💗',
    image: '/assets/emotions/private-moan.png',
    private: true,
  },
]

export const EMOTION_MAP: Record<string, EmotionMeta> = Object.fromEntries(
  EMOTIONS.map((e) => [e.id, e])
)

export function emotion(id: string | undefined, spicy: boolean): EmotionMeta {
  const found = (id && EMOTION_MAP[id]) || EMOTION_MAP.neutral
  if (found.private && !spicy) return EMOTION_MAP.neutral
  return found
}

export function emotionImage(id: string | undefined, spicy: boolean): string | undefined {
  const e = emotion(id, spicy)
  return e.image
}
