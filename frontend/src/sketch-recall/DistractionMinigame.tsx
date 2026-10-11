import { useEffect, useState } from 'react'

// A short, low-stakes interlude shown between distraction questions -
// purely a pacing beat, not another thing to fail. Whatever the player
// is doing, it always calls onComplete once (either the mini task is
// finished, or the time cap below runs out), so it can never stall the
// rest of the phase.

type DistractionMinigameProps = {
  onComplete: () => void
}

const MINIGAME_SECONDS = 6

const MINIGAME_KINDS = [
  'click-targets',
  'sort-baskets',
  'match-pieces',
] as const

type MinigameKind = (typeof MINIGAME_KINDS)[number]

const TITLES: Record<MinigameKind, string> = {
  'click-targets': 'Click the target!',
  'sort-baskets': 'Sort it into the right basket!',
  'match-pieces': 'Find the matching pairs!',
}

function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items]

  for (
    let index = shuffled.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex = Math.floor(
      Math.random() * (index + 1),
    )

    ;[shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ]
  }

  return shuffled
}

// ---- Minigame 1: click targets rapidly ----

const TARGET_GOAL = 6

function randomTargetPosition() {
  return {
    top: `${10 + Math.random() * 65}%`,
    left: `${10 + Math.random() * 80}%`,
  }
}

function ClickTargetsGame({ onDone }: { onDone: () => void }) {
  const [hits, setHits] = useState(0)
  const [position, setPosition] = useState(randomTargetPosition)

  const handleClick = () => {
    const nextHits = hits + 1
    setHits(nextHits)

    if (nextHits >= TARGET_GOAL) {
      onDone()
      return
    }

    setPosition(randomTargetPosition())
  }

  return (
    <div>
      <div className="relative h-44 overflow-hidden rounded-xl border border-amber-500/20 bg-[#211006]">
        <button
          type="button"
          onClick={handleClick}
          style={{
            position: 'absolute',
            top: position.top,
            left: position.left,
          }}
          aria-label="Target"
          className="h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 shadow-[0_0_12px_rgba(251,191,36,0.6)] transition-transform active:scale-90"
        />
      </div>

      <p className="mt-3 text-sm font-bold text-amber-300">
        {hits} / {TARGET_GOAL} hits
      </p>
    </div>
  )
}

// ---- Minigame 2: sort items into baskets quickly ----

type SortItem = {
  emoji: string
  basket: 'fruit' | 'veg'
}

const SORT_ITEMS: SortItem[] = [
  { emoji: '🍎', basket: 'fruit' },
  { emoji: '🥕', basket: 'veg' },
  { emoji: '🍌', basket: 'fruit' },
  { emoji: '🥦', basket: 'veg' },
  { emoji: '🍇', basket: 'fruit' },
  { emoji: '🌽', basket: 'veg' },
]

function SortBasketsGame({ onDone }: { onDone: () => void }) {
  const [items] = useState(() => shuffleArray(SORT_ITEMS))
  const [index, setIndex] = useState(0)
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null)

  const current = items[index]

  const choose = (basket: SortItem['basket']) => {
    if (flash) return

    setFlash(basket === current.basket ? 'correct' : 'wrong')

    window.setTimeout(() => {
      setFlash(null)

      if (index + 1 >= items.length) {
        onDone()
      } else {
        setIndex((current) => current + 1)
      }
    }, 300)
  }

  return (
    <div>
      <div
        className={`flex h-20 items-center justify-center rounded-xl border text-5xl transition ${
          flash === 'correct'
            ? 'border-emerald-400 bg-emerald-400/10'
            : flash === 'wrong'
              ? 'border-red-400 bg-red-400/10'
              : 'border-amber-500/20 bg-[#211006]'
        }`}
      >
        {current.emoji}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => choose('fruit')}
          className="rounded-xl border border-amber-500/30 bg-[#211006] py-4 font-semibold text-white transition hover:border-amber-400/60"
        >
          🧺 Fruits
        </button>

        <button
          type="button"
          onClick={() => choose('veg')}
          className="rounded-xl border border-amber-500/30 bg-[#211006] py-4 font-semibold text-white transition hover:border-amber-400/60"
        >
          🧺 Veggies
        </button>
      </div>

      <p className="mt-3 text-sm font-bold text-amber-300">
        {Math.min(index + 1, items.length)} / {items.length}
      </p>
    </div>
  )
}

// ---- Minigame 3: matching puzzle pieces ----

const PUZZLE_EMOJIS = ['🧩', '🎨', '⭐']

type PuzzleCard = {
  id: number
  emoji: string
  matched: boolean
}

function buildPuzzleCards(): PuzzleCard[] {
  const pairs = shuffleArray([
    ...PUZZLE_EMOJIS,
    ...PUZZLE_EMOJIS,
  ])

  return pairs.map((emoji, id) => ({
    id,
    emoji,
    matched: false,
  }))
}

function MatchPiecesGame({ onDone }: { onDone: () => void }) {
  const [cards, setCards] = useState(buildPuzzleCards)
  const [flipped, setFlipped] = useState<number[]>([])
  const [locked, setLocked] = useState(false)

  const matchedCount = cards.filter((card) => card.matched).length

  useEffect(() => {
    if (matchedCount < cards.length) return
    const timer = window.setTimeout(onDone, 300)
    return () => window.clearTimeout(timer)
  }, [matchedCount, cards.length, onDone])

  const flip = (id: number) => {
    if (locked || flipped.includes(id) || cards[id].matched) return

    const nextFlipped = [...flipped, id]
    setFlipped(nextFlipped)

    if (nextFlipped.length === 2) {
      setLocked(true)
      const [first, second] = nextFlipped
      const isMatch = cards[first].emoji === cards[second].emoji

      window.setTimeout(() => {
        if (isMatch) {
          setCards((current) =>
            current.map((card) =>
              card.id === first || card.id === second
                ? { ...card, matched: true }
                : card,
            ),
          )
        }

        setFlipped([])
        setLocked(false)
      }, 450)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => {
          const revealed = card.matched || flipped.includes(card.id)

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => flip(card.id)}
              disabled={card.matched}
              className={`flex h-16 items-center justify-center rounded-xl border text-2xl transition ${
                card.matched
                  ? 'border-emerald-400/40 bg-emerald-400/10'
                  : revealed
                    ? 'border-amber-400 bg-amber-400/20'
                    : 'border-amber-500/20 bg-[#211006] hover:border-amber-400/60'
              }`}
            >
              {revealed ? card.emoji : '❔'}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-sm font-bold text-amber-300">
        {matchedCount / 2} / {PUZZLE_EMOJIS.length} pairs
      </p>
    </div>
  )
}

// ---- shared shell ----

function DistractionMinigame({ onComplete }: DistractionMinigameProps) {
  // one random minigame per mount - a fresh pick each time this
  // component is shown between questions
  const [kind] = useState<MinigameKind>(
    () => MINIGAME_KINDS[Math.floor(Math.random() * MINIGAME_KINDS.length)],
  )

  const [timeLeft, setTimeLeft] = useState(MINIGAME_SECONDS)
  const [done, setDone] = useState(false)

  // hard cap: whatever the player is doing, move on once time's up
  useEffect(() => {
    if (done) return

    if (timeLeft <= 0) {
      setDone(true)
      return
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((current) => current - 1)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [timeLeft, done])

  // brief "nice!" beat before handing back to the question flow
  useEffect(() => {
    if (!done) return
    const timer = window.setTimeout(onComplete, 500)
    return () => window.clearTimeout(timer)
  }, [done, onComplete])

  const markDone = () => setDone(true)

  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#0d0704] px-6 text-white">

      <section className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-[#160b06] p-8 text-center">

        <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
          Quick Break
        </p>

        <h1 className="mt-2 text-2xl font-bold">
          {done ? 'Nice!' : TITLES[kind]}
        </h1>

        <div
          className={`mt-1 h-6 text-lg font-black ${
            timeLeft <= 2 ? 'text-red-400' : 'text-amber-300'
          }`}
        >
          {!done && `${timeLeft}s`}
        </div>

        <div className="mt-6">
          {done ? (
            <p className="text-white/60">Back to the questions…</p>
          ) : kind === 'click-targets' ? (
            <ClickTargetsGame onDone={markDone} />
          ) : kind === 'sort-baskets' ? (
            <SortBasketsGame onDone={markDone} />
          ) : (
            <MatchPiecesGame onDone={markDone} />
          )}
        </div>

      </section>

    </main>
  )
}

export default DistractionMinigame