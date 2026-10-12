import { useEffect, useRef, useState } from 'react'

// A short, interlude between the questions i  the distraction phase.
// Removes 1 point if you fail.

type DistractionMinigameProps = {
  onComplete: (success: boolean) => void
}

const MINIGAME_SECONDS = 8

const MINIGAME_KINDS = [
  'click-targets',
  'sort-baskets',
  'match-pieces',
] as const

type MinigameKind = (typeof MINIGAME_KINDS)[number]

const TITLES: Record<MinigameKind, string> = {
  'click-targets': 'Click the moving target!',
  'sort-baskets': 'Sort it into the right basket!',
  'match-pieces': 'Find the matching pairs!',
}

// one-shot entrance/flip animations used by the subgames below, scoped
// to this component via its own <style> tag rather than a CSS file
const MINIGAME_STYLES = `
@keyframes mg-pop {
  0% { transform: translateY(-14px) scale(0.85); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
.mg-pop { animation: mg-pop 280ms ease-out; }

@keyframes mg-flip {
  0% { transform: rotateY(90deg); }
  100% { transform: rotateY(0deg); }
}
.mg-flip { animation: mg-flip 220ms ease-out; backface-visibility: hidden; }
`

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

// ---- Minigame 1: click the moving target ----

const TARGET_GOAL = 6

// the area the target is allowed to wander in, as a percentage of the
// play field - margin enough that the (centered) dot never clips an edge
const TARGET_BOUNDS = { top: 10, bottom: 75, left: 10, right: 90 }

// gentle base drift speed, in %-of-field per second
const BASE_SPEED = 15

function ClickTargetsGame({ onDone }: { onDone: () => void }) {
  const [hits, setHits] = useState(0)
  const targetRef = useRef<HTMLButtonElement>(null)

  // the target wanders the play field on its own at a slow, steady pace,
  // occasionally getting a short-lived burst of speed for variety -
  // moved directly on the DOM node (not React state) so the motion stays
  // smooth every frame instead of only updating on each React render
  useEffect(() => {
    const position = {
      top: TARGET_BOUNDS.top + Math.random() * (TARGET_BOUNDS.bottom - TARGET_BOUNDS.top),
      left: TARGET_BOUNDS.left + Math.random() * (TARGET_BOUNDS.right - TARGET_BOUNDS.left),
    }

    let heading = Math.random() * Math.PI * 2
    let speedMultiplier = 1
    let lastFrameTime = performance.now()
    let animationFrame = 0
    let burstTimeout = 0
    let burstEndTimeout = 0

    const scheduleNextBurst = () => {
      burstTimeout = window.setTimeout(() => {
        speedMultiplier = 2 + Math.random()

        burstEndTimeout = window.setTimeout(() => {
          speedMultiplier = 1
          scheduleNextBurst()
        }, 500 + Math.random() * 500)
      }, 2000 + Math.random() * 2500)
    }

    scheduleNextBurst()

    const step = (now: number) => {
      const deltaSeconds = Math.min((now - lastFrameTime) / 1000, 0.1)
      lastFrameTime = now

      const speed = BASE_SPEED * speedMultiplier
      position.left += Math.cos(heading) * speed * deltaSeconds
      position.top += Math.sin(heading) * speed * deltaSeconds

      // wander the heading a little each frame so the path looks like
      // gentle drifting rather than a robotic straight bounce
      heading += (Math.random() - 0.5) * 0.4

      if (position.left < TARGET_BOUNDS.left) {
        position.left = TARGET_BOUNDS.left
        heading = Math.PI - heading
      } else if (position.left > TARGET_BOUNDS.right) {
        position.left = TARGET_BOUNDS.right
        heading = Math.PI - heading
      }

      if (position.top < TARGET_BOUNDS.top) {
        position.top = TARGET_BOUNDS.top
        heading = -heading
      } else if (position.top > TARGET_BOUNDS.bottom) {
        position.top = TARGET_BOUNDS.bottom
        heading = -heading
      }

      const target = targetRef.current
      if (target) {
        target.style.top = `${position.top}%`
        target.style.left = `${position.left}%`
      }

      animationFrame = window.requestAnimationFrame(step)
    }

    animationFrame = window.requestAnimationFrame(step)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.clearTimeout(burstTimeout)
      window.clearTimeout(burstEndTimeout)
    }
  }, [])

  const handleClick = () => {
    const nextHits = hits + 1
    setHits(nextHits)

    if (nextHits >= TARGET_GOAL) {
      onDone()
    }
  }

  return (
    <div>
      <div className="relative h-44 overflow-hidden rounded-xl border border-amber-500/20 bg-[#211006]">
        <button
          ref={targetRef}
          type="button"
          onClick={handleClick}
          style={{ position: 'absolute', top: '40%', left: '50%' }}
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
        key={index}
        className={`mg-pop flex h-20 items-center justify-center rounded-xl border text-5xl transition ${
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
          className="rounded-xl border border-amber-500/30 bg-[#211006] py-4 font-semibold text-white transition hover:border-amber-400/60 hover:scale-[1.03] active:scale-95"
        >
          🧺 Fruits
        </button>

        <button
          type="button"
          onClick={() => choose('veg')}
          className="rounded-xl border border-amber-500/30 bg-[#211006] py-4 font-semibold text-white transition hover:border-amber-400/60 hover:scale-[1.03] active:scale-95"
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
      <div className="grid grid-cols-3 gap-3" style={{ perspective: '600px' }}>
        {cards.map((card) => {
          const revealed = card.matched || flipped.includes(card.id)

          return (
            <button
              key={`${card.id}-${revealed}`}
              type="button"
              onClick={() => flip(card.id)}
              disabled={card.matched}
              className={`mg-flip flex h-16 items-center justify-center rounded-xl border text-2xl transition ${
                card.matched
                  ? 'border-emerald-400/40 bg-emerald-400/10'
                  : revealed
                    ? 'border-amber-400 bg-amber-400/20'
                    : 'border-amber-500/20 bg-[#211006] hover:border-amber-400/60 hover:scale-105'
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
  // only true when the player actually finished the task in time -
  // a plain timeout leaves this false, which is what costs a point
  const [succeeded, setSucceeded] = useState(false)

  // hard cap: whatever the player is doing, move on once time's up -
  // but only as a failure, since nothing was actually finished
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

  // brief result beat before handing back to the question flow
  useEffect(() => {
    if (!done) return
    const timer = window.setTimeout(() => onComplete(succeeded), 600)
    return () => window.clearTimeout(timer)
  }, [done, succeeded, onComplete])

  const markDone = () => {
    setSucceeded(true)
    setDone(true)
  }

  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#0d0704] px-6 text-white">

      <style>{MINIGAME_STYLES}</style>

      <section className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-[#160b06] p-8 text-center">

        <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
          Quick Break
        </p>

        <h1 className="mt-2 text-2xl font-bold">
          {done ? (succeeded ? 'Nice!' : "Time's up!") : TITLES[kind]}
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
            succeeded ? (
              <p className="text-white/60">Back to the questions…</p>
            ) : (
              <div>
                <p className="text-3xl font-black text-red-400">-1</p>
                <p className="mt-2 text-white/60">
                  Didn't finish in time - one correct answer lost!
                </p>
              </div>
            )
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