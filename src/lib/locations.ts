export interface LocationMeta {
  id: string
  name: string
  emoji: string
  image: string
  time: string
  scene: string
  props: string[]
}

export const LOCATIONS: LocationMeta[] = [
  {
    id: 'classroom-morning',
    name: 'Classroom, morning',
    emoji: '🏫',
    image: '/assets/locations/classroom-morning.jpg',
    time: 'early morning',
    scene:
      'an empty Japanese university classroom in the early morning, chalk dust in the sunbeams, desks in rows and the window open to a soft breeze',
    props: ['chalk', 'desk', 'sunbeam', 'bicycle bell outside'],
  },
  {
    id: 'school-hallway-lunch',
    name: 'School hallway, lunch',
    emoji: '🍱',
    image: '/assets/locations/school-hallway-lunch.jpg',
    time: 'lunch break',
    scene:
      'a school hallway at lunch break, distant chatter and footsteps, lockers, a warm smell of bread from the cafeteria',
    props: ['lockers', 'bento box', 'footsteps', 'vending machine'],
  },
  {
    id: 'school-gate-dusk',
    name: 'School gate, dusk',
    emoji: '🚸',
    image: '/assets/locations/school-gate-dusk.png',
    time: 'dusk',
    scene:
      'the school gate at dusk, orange sky, the last clubs packing up, bicycles clicking past, long shadows on the pavement',
    props: ['bicycle', 'orange sky', 'gate', 'goodbye wave'],
  },
  {
    id: 'school-rooftop-afternoon',
    name: 'Rooftop, late afternoon',
    emoji: '🌤️',
    image: '/assets/locations/school-rooftop-afternoon.jpg',
    time: 'late afternoon',
    scene:
      'the school rooftop in late afternoon, fence and water tank, wind pulling at her hair, the town spread out below in golden light',
    props: ['wind', 'fence', 'town below', 'golden light'],
  },
  {
    id: 'school-rooftop-night',
    name: 'Rooftop, night',
    emoji: '🌙',
    image: '/assets/locations/school-rooftop-night.png',
    time: 'night',
    scene:
      'the school rooftop at night, cool air, distant city lights, a plane blinking across the stars, the two of you alone above everything',
    props: ['stars', 'city lights', 'cold breeze', 'quiet'],
  },
  {
    id: 'stairwell',
    name: 'School stairwell',
    emoji: '🪜',
    image: '/assets/locations/stairwell.png',
    time: 'after class',
    scene:
      'a quiet school stairwell after class, concrete steps and a tall window, every footstep echoing, somewhere a door swings shut',
    props: ['echo', 'window light', 'steps', 'quiet corner'],
  },
  {
    id: 'railroad-dusk',
    name: 'Railroad crossing, dusk',
    emoji: '🚃',
    image: '/assets/locations/railroad-dusk.png',
    time: 'dusk',
    scene:
      'a railroad crossing at dusk, barriers down, the train rattling past, warm street lamps flickering on, cicadas starting up',
    props: ['train', 'crossing bell', 'cicadas', 'street lamps'],
  },
  {
    id: 'corner-store-night',
    name: 'Corner store, night',
    emoji: '🏪',
    image: '/assets/locations/corner-store-night.png',
    time: 'late night',
    scene:
      'a small Japanese corner store late at night, humming fridge, bright aisles, the clerk half-asleep, rain maybe starting outside',
    props: ['fridge hum', 'onigiri', 'warm light', 'rain outside'],
  },
  {
    id: 'house-exterior-night',
    name: 'Her house, night',
    emoji: '🏡',
    image: '/assets/locations/house-exterior-night.png',
    time: 'night',
    scene:
      'the outside of her small Japanese house at night, one warm window lit, a bicycle leaned on the wall, moths around the porch lamp',
    props: ['porch lamp', 'bicycle', 'moths', 'quiet street'],
  },
  {
    id: 'bedroom',
    name: "Yuki's bedroom",
    emoji: '🛏️',
    image: '/assets/locations/bedroom.png',
    time: 'evening',
    scene:
      "Yuki's small bedroom in the evening, fairy lights, plushies on the bed, a desk with manga, soft music from her phone",
    props: ['fairy lights', 'plushies', 'manga', 'soft music'],
  },
  {
    id: 'living-room',
    name: "Yuki's living room",
    emoji: '🛋️',
    image: '/assets/locations/living-room.png',
    time: 'evening',
    scene:
      "Yuki's cosy living room, low table with tea, a TV murmuring, cushions on the floor and a blanket she keeps stealing",
    props: ['tea', 'TV murmur', 'blanket', 'cushions'],
  },
  {
    id: 'residential-street-sunset',
    name: 'Quiet street, sunset',
    emoji: '🌇',
    image: '/assets/locations/residential-street-sunset.png',
    time: 'sunset',
    scene:
      'a quiet residential street at sunset, low houses, power lines against an orange sky, someone watering plants, the smell of dinner',
    props: ['power lines', 'orange sky', 'dinner smell', 'cats'],
  },
]

export const LOCATION_MAP: Record<string, LocationMeta> = Object.fromEntries(
  LOCATIONS.map((l) => [l.id, l])
)

export function location(id: string | undefined): LocationMeta {
  return (id && LOCATION_MAP[id]) || LOCATIONS[11]
}
