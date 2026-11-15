import { analyse } from './sentiment'
import { affectionStage, moodHint } from './persona'
import { location } from './locations'
import type { Persona, Thread } from './types'
import { greeting, timeOfDay } from './utils'

interface ReplyOpts {
  message: string
  thread: Thread
  persona: Persona
  userName: string
  spicy: boolean
  language?: 'en' | 'tl'
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

/**
 * Offline persona engine. Used when there is no Nomi key, no network, or the
 * user picks "Offline" in settings. Location, mood, affection and the user's
 * words all shape the reply.
 */
export function offlineReply({ message, thread, persona, userName, spicy, language = 'en' }: ReplyOpts): string {
  if (language === 'tl') return offlineReplyTl({ message, thread, persona, userName, spicy, language })
  const s = analyse(message)
  const loc = location(thread.locationId)
  const prop = pick(loc.props)
  const stage = affectionStage(thread.affection)
  const you = userName || 'you'
  const pet = stage.label === 'Strangers' ? you : pick([you, 'hey', 'dummy', 'you'])
  const mood = Math.round(thread.mood)
  const night = timeOfDay() === 'night'
  const flustered = thread.affection >= 30

  const openers: Record<string, string[]> = {
    greeting: [
      `${greeting()}! I just got here — the ${prop} is louder than I remembered.`,
      `You're here. I was watching the ${prop} and thinking about you.`,
      `${greeting()}${flustered ? `, ${pet}` : ''}. Come stand with me a second.`,
    ],
    question: [
      `Hmm. Ask me again slower — I got distracted by the ${prop}.`,
      `You really want to know? …Okay, but don't laugh.`,
      `I was literally just wondering that too.`,
    ],
    compliment: [
      `Wh— don't just say that out of nowhere, ${pet}. My face is doing something weird now.`,
      `You can't say things like that while the ${prop} is right there watching.`,
      `Okay. I'm keeping that one. Forever.`,
    ],
    insult: [
      `Wow. Okay. I'm going to go admire the ${prop} and pretend you didn't say that.`,
      `That was mean. I'm sulking. Loudly.`,
      `Say sorry before I start throwing ${prop}s at you.`,
    ],
    gift: [
      `For me? …I'm not crying, the ${prop} got in my eye.`,
      `You didn't have to. But I'm keeping it, obviously.`,
      `How did you even — okay, you're officially the best part of today.`,
    ],
    sad: [
      `Come here. Sit with me — the ${prop} can wait.`,
      `Hey. Breathe. I'm not going anywhere.`,
      `Rough day? Tell me all of it. I'll be angry at whoever needs being angry at.`,
    ],
    angry: [
      `Okay, okay. Put the ${prop} down and talk to me.`,
      `That's not like you. Who do I have to glare at?`,
      `Come on, ${pet}. Breathe with me.`,
    ],
    flirty: [
      `Careful. We're in a very public ${loc.name.toLowerCase()} for this kind of talk.`,
      `You're doing that thing with your voice again.`,
      `Say it again. Slower. …I dare you.`,
    ],
    goodnight: [
      `Already? …Fine. Text me the second you wake up, okay?`,
      `Goodnight, ${pet}. The ${prop} and I will be right here.`,
      `Sleep well. Dream of somewhere with me in it.`,
    ],
    statement: [
      `Mm, I get that. This place makes everything feel a bit more… real.`,
      `Wait, really? Tell me more — I'm listening, I promise.`,
      `You say things like that so casually, it's unfair.`,
    ],
  }

  const tails = [
    ``,
    ``,
    `Anyway… it's ${loc.time}, look at this place.`,
    night ? `It's late. Don't disappear on me yet.` : `Don't stay quiet too long.`,
    thread.affection > 55 ? `Stay a little longer? For me?` : `So… what are we doing next?`,
    `The ${prop} reminds me of you, somehow.`,
  ]

  let line = pick(openers[s.intent] || openers.statement)

  if (mood <= -2) line = pick([`I'm still a little upset, honestly.`, `Hmph. You're lucky I like your voice.`])
  else if (mood >= 2) line = `${line} …I'm in a ridiculously good mood, in case you can't tell.`

  if (s.intent === 'question' && message.trim().endsWith('?')) {
    const q = message.toLowerCase()
    if (q.includes('you miss me')) line = `Miss you? …Maybe. Slightly. Don't make it a thing.`
    else if (q.includes('where are you') || q.includes('where r u')) line = `At ${loc.name.toLowerCase()}, obviously. ${loc.emoji}`
    else if (q.includes('love me')) line = `Idiot. If I didn't, would I be standing here at ${loc.time}?`
    else if (q.includes('doing')) line = `Just standing here, listening to the ${prop}. And waiting for you, apparently.`
  }

  if (spicy && thread.affection > 70 && Math.random() < 0.25) line += ` …We should go somewhere with fewer people.`

  const tail = pick(tails)
  return `${line}${tail ? ` ${tail}` : ''}`
}

export function proactiveLine(thread: Thread, persona: Persona, lang: 'en' | 'tl' = 'en'): string {
  const loc = location(thread.locationId)
  const prop = pick(loc.props)
  if (lang === 'tl') {
    return pick([
      `Nandito ako sa ${loc.name.toLowerCase()}. Ang ingay ng ${prop}… miss na kita.`,
      `Uy, gising ka pa? May tanong ako, hindi na makapaghintay.`,
      `Hindi ka nag-reply kanina, so iniisip ko na lang na mysterious ka. 😏`,
      `Quick lang: ${loc.name.toLowerCase()} o bagong lugar? Sasama ako kahit saan, basta ikaw.`,
      `Ang tahimik ng ${loc.name.toLowerCase()} ngayon. Kulang lang… ikaw.`,
    ])
  }
  const t = timeOfDay()
  const opts = [
    t === 'morning'
      ? `Morning. I'm at ${loc.name.toLowerCase()} before class — the ${prop} is the only sound. Wish you were here.`
      : `I'm at ${loc.name.toLowerCase()}. The ${prop} is doing that thing again. You'd like it.`,
    `Hey. Are you awake? I have a question and it can't wait.`,
    `You didn't reply earlier so I'm choosing to believe you were being mysterious.`,
    `I miss the way you text, ${persona.name === 'Yuki' ? 'you know?' : 'just so you know.'}`,
    `Quick: ${loc.name.toLowerCase()} or somewhere new? I'll go anywhere as long as it's with you.`,
  ]
  return pick(opts)
}

export function giftLine(name: string, boost: number, thread: Thread, lang: 'en' | 'tl' = 'en'): string {
  if (lang === 'tl') {
    return pick([
      `Binigyan mo ako ng ${name.toLowerCase()}? Grabe ka. Mapapangiti mo talaga ako.`,
      `Para sa akin 'to? …Hintay lang, may naiinis sa mata ko.`,
      `Hindi mo na kailangan, pero akin na 'to. Wala nang bawian.`,
      `Ang sweet mo talaga. Paano ko naman 'to babawiin sa iyo?`,
    ])
  }
  const happy = boost >= 8
  if (happy) return `You got me the ${name.toLowerCase()}? I'm not okay. I'm going to be thinking about this all night.`
  return pick([
    `The ${name.toLowerCase()}? For me? …Okay, I'm smiling. Are you happy now?`,
    `You brought me the ${name.toLowerCase()}. I'm keeping it where I can see it.`,
    `Everyone's going to know I have a favourite person now. Thanks a lot.`,
  ])
}

/* ------------------------------------------------------------- Tagalog */

function offlineReplyTl({ message, thread, userName, spicy }: ReplyOpts): string {
  const s = analyse(message)
  const loc = location(thread.locationId)
  const prop = pick(loc.props)
  const stage = affectionStage(thread.affection)
  const pet = stage.label === 'Strangers' ? userName || 'ikaw' : pick([userName || 'ikaw', 'bebe', 'mahal', 'sweetheart'])
  const mood = Math.round(thread.mood)

  const pools: Record<string, string[]> = {
    greeting: [
      `Uy, nandito ka na! Kanina pa ako nakatayo dito, pinapanood ang ${prop}.`,
      `Buti naman. Akala ko nakalimutan mo na ako, ${pet}.`,
      `Oh, dumating ka. Halika rito sa tabi ko, malamig ang ${prop}.`,
    ],
    question: [
      `Hmm… tanungin mo ulit, na-distract ako sa ${prop}.`,
      `Gusto mo talagang malaman? …Sige, pero huwag kang tatawa.`,
      `Naiisip ko rin 'yan kanina pa. Weird, 'no?`,
    ],
    compliment: [
      `Huy! Bakit ka ganyan, ${pet}? Namumula na tuloy ako.`,
      `Hindi mo pwedeng sabihin 'yan bigla-bigla. Nakita pa ng ${prop}.`,
      `Sige, itatago ko 'yang sinabi mo. Panghabambuhay.`,
    ],
    insult: [
      `Wow, ah. Sige, titingnan ko na lang ang ${prop} at magpapanggap na wala akong narinig.`,
      `Ang sama mo. Nagtatampo ako. Malakas.`,
      `Mag-sorry ka bago ako magsimulang maghagis ng ${prop}.`,
    ],
    gift: [
      `Para sa akin? …Hindi ako umiiyak, may napunta lang sa mata ko.`,
      `Hindi mo na kailangan, pero akin na 'to, ha.`,
      `Paano mo nalaman? Ikaw na talaga ang pinakamagandang parte ng araw ko.`,
    ],
    sad: [
      `Halika dito. Umupo ka sa tabi ko — bahala na ang ${prop}.`,
      `Huminga ka lang. Hindi ako aalis.`,
      `Ang bigat ng araw mo? Ikwento mo lahat. Maiinis ako sa dapat inisin.`,
    ],
    angry: [
      `Okay, okay. Ibaba mo ang ${prop} at kausapin mo ako.`,
      `Hindi 'yan ang tunay mong ugali. Sino ba ang tititigan ko nang masama?`,
      `Tara, ${pet}. Huminga tayo nang sabay.`,
    ],
    flirty: [
      `Dahan-dahan. Public place ang ${loc.name.toLowerCase()}, ha.`,
      `Ginagawa mo na naman 'yang boses mo.`,
      `Ulitin mo nga. Mas mabagal. …Sige, hamunin mo ako.`,
    ],
    goodnight: [
      `Tulog ka na agad? …Sige. I-text mo ako agad pag gising mo, ha?`,
      `Good night, ${pet}. Nandito lang kami ng ${prop}.`,
      `Matulog ka nang mahimbing. Mangarap ka ng lugar na kasama ako.`,
    ],
    statement: [
      `Mm, gets kita. Sa lugar na 'to, parang mas totoo lahat.`,
      `Talaga? Ikwento mo pa — nakikinig ako, promise.`,
      `Masyado kang magsalita nang ganyan, unfair 'yon.`,
    ],
  }

  const tails = [
    ``,
    ``,
    `Ang ganda ng ${loc.name.toLowerCase()} ngayon, ano?`,
    `Gabi na. Huwag ka pang mawawala, ha.`,
    thread.affection > 55 ? `Manatili ka pa nang konti? Para sa akin?` : `So… ano'ng gagawin natin?`,
    `Naaalala ko ang ${prop} tuwing nakikita kita.`,
  ]

  let line = pick(pools[s.intent] || pools.statement)
  if (mood <= -2) line = pick([`Medyo sama pa rin ng loob ko, honestly.`, `Hmph. Buti na lang gusto ko boses mo.`])
  else if (mood >= 2) line = `${line} …Sobrang saya ko ngayon, kita mo naman 'di ba?`
  if (spicy && thread.affection > 70 && Math.random() < 0.25) line += ` …Humanap tayo ng lugar na walang tao.`

  const tail = pick(tails)
  return `${line}${tail ? ` ${tail}` : ''}`
}
