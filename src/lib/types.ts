export type Role = 'user' | 'yuki' | 'system'

export type MessageKind = 'text' | 'sticker' | 'gift' | 'selfie' | 'voice' | 'checkin' | 'roleplay'

export interface Reaction {
  emoji: string
  by: 'user' | 'yuki'
}

export interface Message {
  id: string
  role: Role
  text: string
  ts: number
  kind?: MessageKind
  editedAt?: number
  deletedForMe?: boolean
  deletedForBoth?: boolean
  replyTo?: string
  pinned?: boolean
  bookmarked?: boolean
  reactions?: Reaction[]
  emotion?: string
  meta?: Record<string, string | number | undefined>
}

export interface Memory {
  facts: string[]
  summary: string
}

export interface Thread {
  id: string
  title: string
  scenario: string
  locationId: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  affection: number
  mood: number
  archived: boolean
  memory: Memory
  streak: number
  lastCheckIn?: string
  unread: number
}

export interface Persona {
  name: string
  avatar: string
  personality: string
  speakingStyle: string
}

export interface Settings {
  theme: string
  mode: 'dark' | 'light'
  language: 'en' | 'tl'
  spicy: boolean
  tts: boolean
  autoSpeak: boolean
  notifications: boolean
  proactiveMinutes: number
  aiMode: 'nomi' | 'offline'
  nomisId: string
  region: 'ph' | 'jp'
}

export interface Account {
  email: string
  name?: string
  provider: 'koolbase' | 'offline'
  localId?: string
}

export interface Selfie {
  id: string
  dataUrl: string
  caption: string
  locationId: string
  ts: number
}

export interface DB {
  v: number
  ageOk: boolean
  account?: Account
  /** What Yuki calls the user. Editable any time. */
  userName: string
  persona: Persona
  settings: Settings
  threads: Thread[]
  activeThreadId?: string
  stickers: string[]
  selfies: Selfie[]
  createdAt: number
}
