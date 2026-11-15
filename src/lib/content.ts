export interface ThemeMeta {
  id: string
  name: string
  vars: Record<string, string>
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'sakura',
    name: 'Sakura night',
    vars: {
      '--bg': '#140b16',
      '--bg-2': '#241226',
      '--panel': 'rgba(32,17,36,0.92)',
      '--panel-solid': '#1b0f1f',
      '--line': 'rgba(255,255,255,0.10)',
      '--text': '#f6eef7',
      '--muted': '#b9a6bf',
      '--accent': '#ff8fc0',
      '--accent-2': '#b98bff',
      '--user-bubble': 'linear-gradient(135deg,#ff8fc0,#c07dff)',
      '--yuki-bubble': 'rgba(255,255,255,0.07)',
      '--shadow': 'rgba(255,120,190,0.28)',
    },
  },
  {
    id: 'sunset',
    name: 'Golden hour',
    vars: {
      '--bg': '#1a0f0a',
      '--bg-2': '#2b160c',
      '--panel': 'rgba(41,22,13,0.92)',
      '--panel-solid': '#22140d',
      '--line': 'rgba(255,255,255,0.10)',
      '--text': '#fdf1e3',
      '--muted': '#c6ab92',
      '--accent': '#ffb066',
      '--accent-2': '#ff7a8a',
      '--user-bubble': 'linear-gradient(135deg,#ffb066,#ff7a8a)',
      '--yuki-bubble': 'rgba(255,255,255,0.07)',
      '--shadow': 'rgba(255,150,90,0.26)',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight blue',
    vars: {
      '--bg': '#080d1a',
      '--bg-2': '#0e1a2e',
      '--panel': 'rgba(14,26,46,0.92)',
      '--panel-solid': '#0c1626',
      '--line': 'rgba(255,255,255,0.10)',
      '--text': '#e8f1ff',
      '--muted': '#8ea3bf',
      '--accent': '#7cc7ff',
      '--accent-2': '#a58bff',
      '--user-bubble': 'linear-gradient(135deg,#7cc7ff,#8f8bff)',
      '--yuki-bubble': 'rgba(255,255,255,0.07)',
      '--shadow': 'rgba(90,150,255,0.26)',
    },
  },
  {
    id: 'matcha',
    name: 'Matcha garden',
    vars: {
      '--bg': '#0b1410',
      '--bg-2': '#14251d',
      '--panel': 'rgba(19,37,29,0.92)',
      '--panel-solid': '#101f18',
      '--line': 'rgba(255,255,255,0.10)',
      '--text': '#eaf7ef',
      '--muted': '#9dbaa8',
      '--accent': '#8fe0b0',
      '--accent-2': '#f3d28a',
      '--user-bubble': 'linear-gradient(135deg,#8fe0b0,#63b38b)',
      '--yuki-bubble': 'rgba(255,255,255,0.07)',
      '--shadow': 'rgba(110,220,160,0.22)',
    },
  },
]

export const THEME_MAP: Record<string, ThemeMeta> = Object.fromEntries(THEMES.map((t) => [t.id, t]))

/* ----------------------------------------------------------------- gifts */
export interface GiftMeta {
  id: string
  name: string
  emoji: string
  boost: number
  line: string
}

export const GIFTS: GiftMeta[] = [
  { id: 'flowers', name: 'Flowers', emoji: '💐', boost: 4, line: 'F-flowers? For me? They smell like the whole street at sunset…' },
  { id: 'strawberry-milk', name: 'Strawberry milk', emoji: '🍓', boost: 3, line: 'Strawberry milk! You remembered my favourite… okay, you are officially my favourite person.' },
  { id: 'plushie', name: 'Plushie', emoji: '🧸', boost: 5, line: 'It is so soft… I am naming it after you. Do not laugh!' },
  { id: 'hair-clip', name: 'Hair clip', emoji: '🎀', boost: 5, line: 'Hold on — how does it look? …You are staring. Is it that cute?' },
  { id: 'letter', name: 'Handwritten letter', emoji: '💌', boost: 8, line: 'A letter? Nobody has ever… give me a second, my hands are shaking a little.' },
  { id: 'necklace', name: 'Necklace', emoji: '📿', boost: 10, line: 'This is… too much. But I am never taking it off, so do not even try to take it back.' },
  { id: 'cake', name: 'Slice of cake', emoji: '🍰', boost: 3, line: 'Two forks, right? …Right? Good. I am not sharing otherwise.' },
  { id: 'song', name: 'A song for her', emoji: '🎧', boost: 6, line: 'Wait, play it again. I want to remember this exact evening whenever I hear it.' },
  { id: 'star', name: 'A star named after her', emoji: '🌟', boost: 12, line: 'You named a star after me? Now I have to look up every night, you know that?' },
]

/* -------------------------------------------------------------- scenarios */
export interface ScenarioMeta {
  id: string
  name: string
  emoji: string
  locationId: string
  opener: string
  prompt: string
}

export const SCENARIOS: ScenarioMeta[] = [
  {
    id: 'first-day',
    name: 'First day at college',
    emoji: '🏫',
    locationId: 'classroom-morning',
    opener: 'You are the new transfer student. I saved you the seat by the window — don\'t make it weird.',
    prompt: 'roleplay: you are showing the new transfer student around campus, shy but curious, morning classroom',
  },
  {
    id: 'lunch',
    name: 'Lunch on the roof',
    emoji: '🍱',
    locationId: 'school-rooftop-afternoon',
    opener: 'I brought too much food again. Help me finish it before the bell, okay?',
    prompt: 'roleplay: sharing a bento on the rooftop, relaxed and teasing',
  },
  {
    id: 'walk-home',
    name: 'Walking home at dusk',
    emoji: '🌇',
    locationId: 'residential-street-sunset',
    opener: 'The long way home is nicer. Don\'t complain, you agreed to walk with me.',
    prompt: 'roleplay: walking home together at sunset, warm and a little flirty',
  },
  {
    id: 'beach',
    name: 'Beach trip',
    emoji: '🏖️',
    locationId: 'railroad-dusk',
    opener: 'The train to the coast leaves in ten minutes. I packed snacks. You packed… you, I hope.',
    prompt: 'roleplay: a spontaneous beach trip, excited and playful, salty air and sun',
  },
  {
    id: 'date-night',
    name: 'Date night',
    emoji: '🌙',
    locationId: 'bedroom',
    opener: 'I lit the fairy lights and everything. So… sit. Talk to me. No phones.',
    prompt: 'roleplay: a soft date night in her room, intimate and tender',
  },
  {
    id: 'rainy-store',
    name: 'Rainy convenience store',
    emoji: '🌧️',
    locationId: 'corner-store-night',
    opener: 'It started pouring. Buy me a hot drink and I\'ll forgive you for being late.',
    prompt: 'roleplay: stuck in a convenience store during rain, cosy and chatty',
  },
  {
    id: 'rooftop-night',
    name: 'Rooftop, after dark',
    emoji: '✨',
    locationId: 'school-rooftop-night',
    opener: 'Come up here. The city looks like it\'s breathing tonight.',
    prompt: 'roleplay: stargazing on the roof at night, quiet, honest, romantic',
  },
  {
    id: 'study',
    name: 'Studying together',
    emoji: '📚',
    locationId: 'living-room',
    opener: 'If you finish three pages I\'ll make tea. Deal? …Why are you looking at me instead of the book?',
    prompt: 'roleplay: studying together at her living room, distracting each other',
  },
]

/* ---------------------------------------------------------------- stickers */
export const STICKER_SETS: Record<string, string[]> = {
  Hearts: ['💖', '💕', '💗', '💘', '❤️‍🔥', '💞', '😍', '🥰'],
  Reactions: ['😭', '😂', '😳', '😤', '🙈', '😏', '🤔', '🫠'],
  Anime: ['🌸', '🍥', '✨', '🎀', '🍡', '🐱', '🌙', '⭐'],
  Mood: ['😴', '🍵', '🎧', '🌧️', '☀️', '🍰', '🎮', '📖'],
}

export const QUICK_REACTIONS = ['❤️', '😍', '😂', '😮', '😢', '😡', '👍', '🔥']

export const EMOJI_PALETTE = [
  '😀','😄','😁','😆','🥹','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🫣','🤗','🫡','🤔','🫢','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😮‍💨','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','💋','💌','💘','💝','💖','💗','💓','💞','💕','💟','❣️','💔','❤️‍🔥','❤️‍🩹','❤️','🩷','🧡','💛','💚','💙','🩵','💜','🤎','🖤','🩶','🤍','💯','💢','💥','💫','💦','💨','🕳️','💬','💭','🗯️','💤','👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','🫦','🌸','🌺','🌻','🌹','🥀','🌷','🌼','💐','🍄','🌾','💐','🌿','🍀','🍁','🍂','🍃','🪴','🌵','🌴','🌳','🌲','🪵','🌱','🌿','☘️','🍀','🎍','🎋','🎄','🌞','🌝','🌚','🌙','🌛','🌜','🌃','🌌','⭐','🌟','✨','⚡','🔥','🌈','☔','❄️','⛄','🎀','🎁','🎂','🍰','🧁','🍫','🍬','🍭','🍓','🍒','🍑','🥭','🍍','🥝','🍇','🍉','🍊','🍋','🍌','🍎','🍏','🥑','🍅','🌽','🥕','🍞','🥐','🥨','🧀','🍳','🍔','🍟','🍕','🌮','🍜','🍣','🍱','🍙','🍚','🍥','🥟','🍤','🍡','🍧','🍨','🍦','🥧','🍮','🍯','☕','🍵','🧋','🥤','🍶','🍺','🍷','🥂','🎵','🎶','🎤','🎧','🎸','🎹','🎺','🥁','🎬','🎮','🕹️','🎲','🧩','🎯','🎳','🏀','⚽','🎾','🏐','🏓','🥊','🛹','🎿','🏊','🚴','🏃','🧘','🎡','🎢','🎠','🌍','🗺️','📍','🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚚','🚛','🚜','🛵','🏍️','🚲','🛴','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🪝','⛽','🚧','🚦','🚥','🗿','🗽','🗼','🏰','🏯','🏟️','🎪','🎭','🎨','🖼️','🧵','🧶','🪡','🪢','💎','💍','👑','🧢','🎩','👒','🎓','⛑️','🪖','👕','👗','👘','🥻','🩱','🩲','🩳','👙','👚','👔','🧥','🥼','🦺','👖','🩰','👞','👟','🥾','🥿','👠','🈶','🈚','🈸','🈺','🈷️','🈹','🈚','🉐','㊙️','㊗️','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💠','🔞',
]
