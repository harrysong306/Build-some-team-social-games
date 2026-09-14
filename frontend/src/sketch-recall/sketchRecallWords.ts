export const similarWordGroups = [
  ['Basketball', 'Volleyball', 'Football'],
  ['Apple', 'Orange', 'Peach'],
  ['Cat', 'Dog', 'Rabbit'],
  ['Car', 'Bus', 'Truck'],
  ['Cup', 'Bottle', 'Glass'],
  ['Sun', 'Moon', 'Star'],
  ['Chair', 'Table', 'Stool'],
  ['Pen', 'Pencil', 'Marker'],
  ['Flower', 'Rose', 'Tulip'],
  ['Shoe', 'Boot', 'Sneaker'],
  ['Fish', 'Goldfish', 'Tuna'],
  ['Tree', 'Pine Tree', 'Palm Tree'],
  ['Fork', 'Spoon', 'Knife'],
  ['Hat', 'Cap', 'Helmet'],
  ['Boat', 'Ship', 'Canoe'],
  ['Clock', 'Watch', 'Timer'],
  ['House', 'Cabin', 'Castle'],
  ['Cake', 'Cupcake', 'Donut'],
  ['Camera', 'Phone', 'Tablet'],
  ['Bike', 'Motorcycle', 'Scooter'],
  ['Cloud', 'Smoke', 'Fog'],
  ['Duck', 'Chicken', 'Penguin'],
]

export const generalWords = [
  'Umbrella',
  'Key',
  'Rocket',
  'Crown',
  'Book',
  'Lamp',
  'Candle',
  'Drum',
  'Leaf',
  'Pizza',
  'Balloon',
  'Backpack',
  'Bicycle',
  'Bridge',
  'Comb',
  'Door',
  'Feather',
  'Glasses',
  'Hammer',
  'Heart',
  'Ice Cream',
  'Kite',
  'Ladder',
  'Mountain',
  'Mushroom',
  'Scissors',
  'Toothbrush',
  'Train',
  'Treasure Chest',
  'Television',
  'Guitar',
  'Bell',
  'Envelope',
  'Gift',
  'Flag',
  'Anchor',
  'Ring',
]
// simple string -> 32bit int hash, just so a room id can seed the shuffle below
function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i)
    h |= 0
  }
  return h
}

// mulberry32 - small seeded PRNG, good enough for shuffling a word list
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// FE-18/multiplayer: everyone in a room needs to see the same 25 words in the
// same order, but there's no backend word-gen yet (that's BE-17, not built).
// As a stand-in, seed the same shuffle algorithm SketchRecallGame.tsx already
// uses with the room id, so every client in the same room independently
// derives an identical list without the server having to send one. Swap this
// out for the real server-sent word list once BE-17 lands.
export function generateGameWordsForRoom(roomId: string): string[] {
  const rng = mulberry32(hashSeed(roomId))

  const selectedGroups = seededShuffle(similarWordGroups, rng).slice(0, 3)
  const similarWords = selectedGroups.flat()

  const selectedGeneralWords = seededShuffle(generalWords, rng).slice(
    0,
    25 - similarWords.length,
  )

  return seededShuffle([...similarWords, ...selectedGeneralWords], rng)
}
