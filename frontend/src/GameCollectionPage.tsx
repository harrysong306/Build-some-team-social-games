import { useState } from 'react'
import GameCard from './components/GameCard'

type GameCollectionPageProps = {
  onPlay: () => void
}

function GameCollectionPage({
  onPlay,
}: GameCollectionPageProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [players, setPlayers] = useState('all')

  const matchesSearch =
    'sketch recall'.includes(search.toLowerCase())

  const matchesCategory =
    category === 'all' ||
    category === 'drawing' ||
    category === 'memory'

  const matchesPlayers =
    players === 'all' || players === '3-8'

  const showSketchRecall =
    matchesSearch &&
    matchesCategory &&
    matchesPlayers

  return (
    <main className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#0d0704] px-6 py-14 text-white">

      {/* Background glows */}
      <div className="pointer-events-none absolute -left-40 top-16 h-[500px] w-[500px] rounded-full bg-orange-600/10 blur-[130px]" />

      <div className="pointer-events-none absolute -right-40 top-48 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[140px]" />

      <div className="relative mx-auto max-w-7xl">

        <section className="text-center">

          <h1 className="text-4xl font-extrabold tracking-wide sm:text-5xl">
            GAME{' '}
            <span className="bg-gradient-to-r from-yellow-300 to-amber-500 bg-clip-text text-transparent">
              COLLECTION
            </span>
          </h1>

          <p className="mt-4 text-base text-white/60">
            Quick social games to play with friends and teams.
          </p>

        </section>

        <section className="mt-12 flex flex-col gap-4 md:flex-row">

          <div className="flex flex-1 items-center rounded-xl border border-amber-500/40 bg-[#160b06] px-5 transition focus-within:border-amber-400">

            <svg
              viewBox="0 0 24 24"
              className="mr-3 h-5 w-5 text-amber-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              type="text"
              placeholder="Search games..."
              className="w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-white/30"
            />

          </div>

          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
            className="rounded-xl border border-amber-500/40 bg-[#160b06] px-6 py-4 text-sm text-white outline-none"
          >
            <option value="all">
              All Categories
            </option>

            <option value="drawing">
              Drawing
            </option>

            <option value="memory">
              Memory
            </option>
          </select>

          <select
            value={players}
            onChange={(event) =>
              setPlayers(event.target.value)
            }
            className="rounded-xl border border-amber-500/40 bg-[#160b06] px-6 py-4 text-sm text-white outline-none"
          >
            <option value="all">
              All Players
            </option>

            <option value="3-8">
              3 - 8 Players
            </option>
          </select>

        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[3fr_1.15fr]">

          <div>
            {showSketchRecall ? (
              <GameCard
                title="Sketch Recall"
                players="3 - 8 players"
                description="Draw fast, get distracted, then work together to remember the original words."
                onPlay={onPlay}
              />
            ) : (
              <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-amber-500/20 bg-[#160b06]">

                <p className="text-white/45">
                  No games match your filters.
                </p>

              </div>
            )}
          </div>

          <article className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-amber-500/40 bg-[#120905] p-8 text-center">

            <div className="relative flex h-28 w-28 items-center justify-center">

              <div className="absolute h-24 w-24 rounded-full border border-amber-400/30" />

              <svg
                viewBox="0 0 100 100"
                className="relative h-20 w-20 rotate-12 text-amber-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              >
                <path d="M25 25 50 13l25 12v50L50 87 25 75V25Z" />

                <circle
                  cx="39"
                  cy="38"
                  r="3"
                  fill="currentColor"
                />

                <circle
                  cx="61"
                  cy="34"
                  r="3"
                  fill="currentColor"
                />

                <circle
                  cx="42"
                  cy="58"
                  r="3"
                  fill="currentColor"
                />

                <circle
                  cx="61"
                  cy="65"
                  r="3"
                  fill="currentColor"
                />
              </svg>

            </div>

            <h3 className="mt-7 text-2xl font-bold text-white">
              More games coming soon
            </h3>

            <p className="mt-3 text-white/50">
              Roll the dice for more fun!
            </p>

          </article>

        </section>

        <footer className="mt-20 border-t border-amber-500/20 py-8 text-center text-sm text-white/35">
          © 2026 Team 31 Games
        </footer>

      </div>

    </main>
  )
}

export default GameCollectionPage