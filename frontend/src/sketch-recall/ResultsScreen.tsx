type ResultsScreenProps = {
  score: number
  total: number
  onPlayAgain: () => void
  onExit: () => void
}

function ResultsScreen({
  score,
  total,
  onPlayAgain,
  onExit,
}: ResultsScreenProps) {
  const percentage =
    total > 0
      ? Math.round((score / total) * 100)
      : 0

  let message = 'Keep practising!'

  if (percentage === 100) {
    message = 'Perfect memory!'
  } else if (percentage >= 60) {
    message = 'Great job!'
  } else if (percentage >= 40) {
    message = 'Nice try!'
  }

  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#0d0704] px-6 py-12 text-white">

      <section className="w-full max-w-2xl rounded-2xl border border-amber-500/30 bg-[#160b06] p-8 text-center md:p-12">

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10">

          <svg
            viewBox="0 0 24 24"
            className="h-10 w-10 text-amber-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 21h8" />
            <path d="M12 17v4" />
            <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
            <path d="M7 6H4v2a4 4 0 0 0 4 4" />
            <path d="M17 6h3v2a4 4 0 0 1-4 4" />
          </svg>

        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-amber-400">
          Round Complete
        </p>

        <h1 className="mt-3 text-4xl font-bold">
          {message}
        </h1>

        <p className="mt-3 text-white/50">
          Here is how well you remembered your drawings.
        </p>

        <div className="mx-auto mt-10 flex h-48 w-48 flex-col items-center justify-center rounded-full border-4 border-amber-400 bg-amber-400/5">

          <span className="text-6xl font-black text-amber-400">
            {score}
          </span>

          <span className="mt-1 text-lg text-white/50">
            out of {total}
          </span>

        </div>

        <div className="mt-8 rounded-xl border border-amber-500/20 bg-[#211006] p-5">

          <div className="flex items-center justify-between">

            <span className="text-sm text-white/55">
              Recall accuracy
            </span>

            <span className="font-bold text-amber-400">
              {percentage}%
            </span>

          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">

            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
              style={{
                width: `${percentage}%`,
              }}
            />

          </div>

        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">

          <button
            type="button"
            onClick={onPlayAgain}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-4 font-bold text-black transition hover:brightness-110"
          >
            PLAY AGAIN
          </button>

          <button
            type="button"
            onClick={onExit}
            className="rounded-xl border border-amber-500/40 bg-[#211006] px-6 py-4 font-bold text-white transition hover:border-amber-400"
          >
            BACK TO GAMES
          </button>

        </div>

      </section>

    </main>
  )
}

export default ResultsScreen