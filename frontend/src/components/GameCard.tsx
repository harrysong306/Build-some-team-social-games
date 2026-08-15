import SketchRecallArtwork from './SketchRecallArtwork'

type GameCardProps = {
  title: string
  description: string
  players: string
}

function GameCard({ title, description, players }: GameCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-amber-500/40 bg-[#160b06] shadow-2xl shadow-black/40">

      <div className="grid md:grid-cols-[42%_58%]">

        <div className="relative">
          <span className="absolute left-5 top-5 z-20 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-xs font-extrabold text-black">
            ★ NEW
          </span>

          <SketchRecallArtwork />
        </div>

        <div className="flex min-h-[360px] flex-col p-8 md:p-10">

          <h2 className="text-3xl font-bold text-white md:text-4xl">
            {title}
          </h2>

          <div className="mt-5 flex gap-3">
            <span className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-2 text-xs font-bold text-black">
              ✎ Drawing
            </span>

            <span className="rounded-lg border border-amber-500/30 bg-[#231108] px-4 py-2 text-xs text-amber-100">
              Memory
            </span>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-white/75">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-amber-400"
              fill="currentColor"
            >
              <circle cx="9" cy="8" r="3" />
              <circle cx="16" cy="9" r="2.5" />
              <path d="M3 18c0-3 2.7-5 6-5s6 2 6 5v1H3z" />
              <path d="M14 14c3 0 5 1.8 5 4v1h-3v-1c0-1.6-.7-3-2-4z" />
            </svg>

            {players}
          </div>

          <p className="mt-6 max-w-lg text-base leading-7 text-white/65">
            {description}
          </p>

          <button
            type="button"
            className="mt-auto flex w-full items-center justify-center gap-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 py-4 text-lg font-bold text-black transition duration-200 hover:scale-[1.01] hover:brightness-110"
          >
            <span className="text-xl">▶</span>
            PLAY
            <span>→</span>
          </button>

        </div>
      </div>
    </article>
  )
}

export default GameCard