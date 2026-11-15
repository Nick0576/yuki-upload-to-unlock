/**
 * Small i18n layer for the app chrome. Yuki's own voice is switched
 * separately: the AI brief and the offline engine both follow the language.
 */
import { useSyncExternalStore } from 'react'

export type Lang = 'en' | 'tl'

type Dict = Record<string, string>

const en: Dict = {
  'nav.yuki': 'Yuki',
  'nav.chats': 'Chats',
  'nav.persona': 'Persona',
  'nav.settings': 'Settings',

  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.close': 'Close',
  'common.back': 'Back',
  'common.done': 'Done',
  'common.on': 'On',
  'common.off': 'Off',
  'common.copy': 'Copy',
  'common.reply': 'Reply',
  'common.search': 'Search',
  'common.you': 'You',
  'common.today': 'Today',
  'common.yesterday': 'Yesterday',

  'age.q': 'Are you 18 years or older?',
  'age.yes': 'YES, I am 18 or older',
  'age.no': 'NO, I am under 18',
  'age.blurb':
    'Yuki contains romance and mature themes. This is a one-time check — your answer is remembered on this device.',
  'age.small': 'No ID, no documents, no accounts needed for this check.',
  'age.blockedTitle': 'Yuki is for adults only',
  'age.blockedBody': 'You must be 18 or older to continue. Nothing was saved and the app stays locked.',
  'age.mistake': 'I entered by mistake',
  'age.leave': 'Not for you? Please close the app.',

  'auth.signIn': 'Sign in',
  'auth.create': 'Create account',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.signInCta': 'Sign in',
  'auth.createCta': 'Create my account',
  'auth.offline': 'No signal? Use an offline account on this device →',
  'auth.online': '← Use cloud account instead',
  'auth.offlineNote': 'Offline accounts live only on this phone. Your chats stay here, no email needed.',
  'auth.foot': '18+ only. Your chats are private and stored on this device.',
  'auth.tagline': 'Your girlfriend is waiting. Sign in to keep your story.',

  'stage.where': 'Where should we go?',
  'stage.scenes': 'Scenes',
  'stage.reacts': 'She reacts to the place',
  'stage.startNew': 'Start a new thread',
  'stage.message': 'Message',
  'stage.gift': 'Gift',
  'stage.selfie': 'Selfie',
  'stage.goOut': 'Go out',
  'stage.affection': 'Affection',
  'stage.streakDays': 'days',
  'stage.streakDay': 'day',
  'stage.chooseLocation': 'Choose a location',
  'stage.face': "'s face",
  'stage.faceNote': 'Eight expressions are drawn. The rest use an emoji badge next to her hair until art arrives.',
  'stage.sendGift': 'Send her something',
  'stage.waiting': 'She is waiting for you to say something.',

  'chat.placeholder': 'Message Yuki…',
  'chat.typing': 'typing…',
  'chat.search': 'Search messages',
  'chat.pinned': 'Pinned',
  'chat.saved': 'Saved',
  'chat.exportTxt': 'Export as text',
  'chat.exportJson': 'Export as JSON',
  'chat.select': 'Select messages',
  'chat.archive': 'Archive this chat',
  'chat.fresh': 'Start fresh chat',
  'chat.persona': 'Persona & scenes',
  'chat.clear': 'Clear chat history',
  'chat.clearTitle': 'Clear this chat?',
  'chat.clearBody':
    'Every message and everything she remembers from this conversation will be gone. This cannot be undone.',
  'chat.deleteMe': 'Delete for me',
  'chat.deleteBoth': 'Delete for both',
  'chat.regenerate': 'Regenerate reply',
  'chat.editRegen': 'Edit & regenerate',
  'chat.pin': 'Pin message',
  'chat.unpin': 'Unpin',
  'chat.save': 'Save message',
  'chat.selected': 'selected',

  'chats.title': 'Chats',
  'chats.new': '+ New',
  'chats.searchAll': 'Search every message…',
  'chats.archived': 'Archived',
  'chats.restore': 'Restore',
  'chats.startTitle': 'Start a chat',
  'chats.justUs': 'Just us',
  'chats.orScene': 'Or pick a scene',
  'chats.empty': 'No chats yet. Start one and she will text back.',
  'chats.results': 'results',
  'chats.result': 'result',

  'persona.title': 'Persona',
  'persona.her': 'Her name',
  'persona.your': 'Your name',
  'persona.yourHint': 'What she calls you in chat.',
  'persona.face': 'Her face',
  'persona.personality': 'Personality',
  'persona.style': 'Speaking style',
  'persona.region': 'Where do you two live?',
  'persona.preview': 'She is waiting for you.',
  'persona.avatarNote': 'Used in the chat list and header.',

  'settings.title': 'Settings',
  'settings.look': 'Look',
  'settings.mode': 'Light / dark',
  'settings.dark': 'Dark',
  'settings.light': 'Light',
  'settings.theme': 'Chat theme',
  'settings.language': 'Language',
  'settings.languageHint': 'App labels and the language Yuki speaks.',
  'settings.voice': 'Voice & sound',
  'settings.tts': 'Anime voice replies',
  'settings.autoSpeak': 'Speak her replies automatically',
  'settings.notify': 'Notifications',
  'settings.notifyOn': 'Let her message you first',
  'settings.notifyEvery': 'She texts you every',
  'settings.notifyHint': 'Needs notification permission. Works while the app is open.',
  'settings.mature': 'Mature content',
  'settings.spicy': 'Private expressions (18+)',
  'settings.spicyHint': 'Adds two extra expression images and lets her tease more.',
  'settings.ai': 'Her brain',
  'settings.aiMode': 'Reply engine',
  'settings.aiNomi': 'Nomi AI (cloud)',
  'settings.aiOffline': 'Offline engine',
  'settings.aiHint': 'Offline works without signal and never leaves the phone.',
  'settings.data': 'Your data',
  'settings.exportAll': 'Export all chats',
  'settings.clearAll': 'Clear all chats',
  'settings.clearAllTitle': 'Delete everything?',
  'settings.clearAllBody': 'All chats, streaks and memories on this device will be deleted.',
  'settings.account': 'Account',
  'settings.signOut': 'Sign out',
  'settings.ageDone': 'Age check passed on this device',
  'settings.about': 'About',
  'settings.version': 'Yuki 1.0 · made for you',
  'settings.replayGate': 'Show the age check again',
  'settings.saved': 'Saved',

  'toast.moved': 'Moved to',
  'toast.copied': 'Copied',
  'toast.stopped': 'Stopped',
  'toast.newReply': 'New reply',
}

const tl: Dict = {
  'nav.yuki': 'Yuki',
  'nav.chats': 'Mga Chat',
  'nav.persona': 'Persona',
  'nav.settings': 'Settings',

  'common.save': 'I-save',
  'common.cancel': 'Kanselahin',
  'common.delete': 'Burahin',
  'common.close': 'Isara',
  'common.back': 'Bumalik',
  'common.done': 'Tapos',
  'common.on': 'Bukas',
  'common.off': 'Sarado',
  'common.copy': 'Kopyahin',
  'common.reply': 'Sagutin',
  'common.search': 'Maghanap',
  'common.you': 'Ikaw',
  'common.today': 'Ngayon',
  'common.yesterday': 'Kahapon',

  'age.q': 'Ikaw ba ay 18 taong gulang o mas matanda?',
  'age.yes': 'OO, 18 na ako o mas matanda',
  'age.no': 'HINDI, wala pa akong 18',
  'age.blurb':
    'May romansa at mature na tema ang Yuki. Isang beses lang ito — matatandaan ng device ang sagot mo.',
  'age.small': 'Walang ID, walang dokumento, walang account na kailangan para sa check na ito.',
  'age.blockedTitle': 'Para sa matatanda lang ang Yuki',
  'age.blockedBody': 'Kailangan mong 18 o mas matanda para magpatuloy. Walang na-save at naka-lock ang app.',
  'age.mistake': 'Napindot ko lang',
  'age.leave': 'Hindi para sa iyo? Isara na lang ang app.',

  'auth.signIn': 'Mag-sign in',
  'auth.create': 'Gumawa ng account',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.signInCta': 'Mag-sign in',
  'auth.createCta': 'Gawin ang account ko',
  'auth.offline': 'Walang signal? Gumamit ng offline account sa device na ito →',
  'auth.online': '← Gumamit ng cloud account',
  'auth.offlineNote': 'Ang offline account ay sa phone lang na ito. Dito lang mananatili ang chats, walang email.',
  'auth.foot': '18+ lang. Pribado ang chats mo at nasa device na ito.',
  'auth.tagline': 'Hinihintay ka ng girlfriend mo. Mag-sign in para ituloy ang kwento niyo.',

  'stage.where': 'Saan tayo pupunta?',
  'stage.scenes': 'Mga eksena',
  'stage.reacts': 'Nagre-react siya sa lugar',
  'stage.startNew': 'Magsimula ng bagong usapan',
  'stage.message': 'I-message',
  'stage.gift': 'Regalo',
  'stage.selfie': 'Selfie',
  'stage.goOut': 'Lumabas',
  'stage.affection': 'Pagmamahal',
  'stage.streakDays': 'araw',
  'stage.streakDay': 'araw',
  'stage.chooseLocation': 'Pumili ng lugar',
  'stage.face': ' ang mukha',
  'stage.faceNote': 'Walong ekspresyon ang iginuhit. Ang iba ay emoji badge sa tabi ng buhok niya hanggang may art.',
  'stage.sendGift': 'Bigyan mo siya ng regalo',
  'stage.waiting': 'Hinihintay niya ang sasabihin mo.',

  'chat.placeholder': 'I-message si Yuki…',
  'chat.typing': 'nagta-type…',
  'chat.search': 'Maghanap ng mensahe',
  'chat.pinned': 'Naka-pin',
  'chat.saved': 'Naka-save',
  'chat.exportTxt': 'I-export bilang text',
  'chat.exportJson': 'I-export bilang JSON',
  'chat.select': 'Pumili ng mensahe',
  'chat.archive': 'I-archive ang chat',
  'chat.fresh': 'Bagong chat',
  'chat.persona': 'Persona at eksena',
  'chat.clear': 'Burahin ang kasaysayan',
  'chat.clearTitle': 'Burahin ang chat na ito?',
  'chat.clearBody':
    'Mawawala lahat ng mensahe at lahat ng natatandaan niya sa usapang ito. Hindi na ito maibabalik.',
  'chat.deleteMe': 'Burahin para sa akin',
  'chat.deleteBoth': 'Burahin para sa dalawa',
  'chat.regenerate': 'Bagong sagot',
  'chat.editRegen': 'I-edit at bagong sagot',
  'chat.pin': 'I-pin',
  'chat.unpin': 'Tanggalin sa pin',
  'chat.save': 'I-save ang mensahe',
  'chat.selected': 'napili',

  'chats.title': 'Mga Chat',
  'chats.new': '+ Bago',
  'chats.searchAll': 'Hanapin sa lahat ng mensahe…',
  'chats.archived': 'Naka-archive',
  'chats.restore': 'Ibalik',
  'chats.startTitle': 'Magsimula ng chat',
  'chats.justUs': 'Tayong dalawa',
  'chats.orScene': 'O pumili ng eksena',
  'chats.empty': 'Wala pang chat. Magsimula at sasagot siya.',
  'chats.results': 'resulta',
  'chats.result': 'resulta',

  'persona.title': 'Persona',
  'persona.her': 'Pangalan niya',
  'persona.your': 'Pangalan mo',
  'persona.yourHint': 'Ang itatawag niya sa iyo sa chat.',
  'persona.face': 'Mukha niya',
  'persona.personality': 'Personalidad',
  'persona.style': 'Paraan ng pagsasalita',
  'persona.region': 'Saan kayo nakatira?',
  'persona.preview': 'Hinihintay ka niya.',
  'persona.avatarNote': 'Ginagamit sa listahan at header ng chat.',

  'settings.title': 'Settings',
  'settings.look': 'Itsura',
  'settings.mode': 'Maliwanag / madilim',
  'settings.dark': 'Madilim',
  'settings.light': 'Maliwanag',
  'settings.theme': 'Tema ng chat',
  'settings.language': 'Wika',
  'settings.languageHint': 'Mga label ng app at wika ni Yuki.',
  'settings.voice': 'Boses at tunog',
  'settings.tts': 'Boses anime',
  'settings.autoSpeak': 'Awtomatikong sabihin ang sagot niya',
  'settings.notify': 'Notipikasyon',
  'settings.notifyOn': 'Hayaan siyang mauna mag-message',
  'settings.notifyEvery': 'Nagte-text siya tuwing',
  'settings.notifyHint': 'Kailangan ng pahintay sa notipikasyon. Gumagana habang bukas ang app.',
  'settings.mature': 'Mature na nilalaman',
  'settings.spicy': 'Pribadong ekspresyon (18+)',
  'settings.spicyHint': 'Nagdadagdag ng dalawang larawan at mas malandi siya.',
  'settings.ai': 'Utak niya',
  'settings.aiMode': 'Engine ng sagot',
  'settings.aiNomi': 'Nomi AI (cloud)',
  'settings.aiOffline': 'Offline engine',
  'settings.aiHint': 'Gumagana ang offline kahit walang signal at hindi lumalabas ng phone.',
  'settings.data': 'Data mo',
  'settings.exportAll': 'I-export lahat ng chat',
  'settings.clearAll': 'Burahin lahat ng chat',
  'settings.clearAllTitle': 'Burahin lahat?',
  'settings.clearAllBody': 'Mabubura lahat ng chat, streak at alaala sa device na ito.',
  'settings.account': 'Account',
  'settings.signOut': 'Mag-sign out',
  'settings.ageDone': 'Nakapasa sa age check ang device na ito',
  'settings.about': 'Tungkol',
  'settings.version': 'Yuki 1.0 · para sa iyo',
  'settings.replayGate': 'Ipakita ulit ang age check',
  'settings.saved': 'Na-save',

  'toast.moved': 'Lumipat sa',
  'toast.copied': 'Nakopya',
  'toast.stopped': 'Hinto',
  'toast.newReply': 'Bagong sagot',
}

export const DICTS: Record<Lang, Dict> = { en, tl }

let activeLang: Lang = 'en'
let version = 0
const listeners = new Set<() => void>()

export function setLanguage(lang: Lang): void {
  if (activeLang === lang) return
  activeLang = lang
  version += 1
  listeners.forEach((l) => l())
}

function subscribeLang(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export function getLanguage(): Lang {
  return activeLang
}

export function t(key: string, lang?: Lang): string {
  const dict = DICTS[lang || activeLang] || en
  return dict[key] ?? en[key] ?? key
}

export function useT(): (key: string) => string {
  useSyncExternalStore(subscribeLang, () => version)
  return (key: string) => t(key)
}
