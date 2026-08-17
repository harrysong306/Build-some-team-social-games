type InstructionsScreenProps = {
  onStart: () => void
  onBack: () => void
}

function InstructionsScreen({
  onStart,
  onBack,
}: InstructionsScreenProps) {
  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-12 text-white">

      <div className="mx-auto max-w-5xl">

        <button
          type="button"
          onClick={onBack}
          className="mb-8 text-sm text-amber-300 transition hover:text-amber-200"
        >
          ← Back to games
        </button>

        <section className="text-center">

          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300">
            SKETCH RECALL
          </span>

          <h1 className="mt-6 text-4xl font-extrabold md:text-5xl">
            How to Play
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            Draw what you remember, survive the distraction,
            then work together to recall the original words.
          </p>

        </section>

        <section className="mt-12 grid gap-5 md:grid-cols-4">

          <div className="rounded-2xl border border-amber-500/20 bg-[#160b06] p-6">
            <div className="text-3xl font-black text-amber-400">
              01
            </div>

            <h2 className="mt-4 text-xl font-bold">
              Listen
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/55">
              A sequence of words is given to all players.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-[#160b06] p-6">
            <div className="text-3xl font-black text-amber-400">
              02
            </div>

            <h2 className="mt-4 text-xl font-bold">
              Draw
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/55">
              Quickly sketch each word before the timer runs out.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-[#160b06] p-6">
            <div className="text-3xl font-black text-amber-400">
              03
            </div>

            <h2 className="mt-4 text-xl font-bold">
              Get Distracted
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/55">
              Answer short questions designed to break your memory.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-[#160b06] p-6">
            <div className="text-3xl font-black text-amber-400">
              04
            </div>

            <h2 className="mt-4 text-xl font-bold">
              Recall
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/55">
              Use the drawings to remember the original words.
            </p>
          </div>

        </section>

        <section className="mt-8 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-[#1d0e06] to-[#291406] p-8">

          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">

            <div>
              <p className="text-sm font-semibold text-amber-300">
                PRACTICE ROUND
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Ready to test Sketch Recall?
              </h2>

              <p className="mt-2 text-sm text-white/55">
                Start with a short drawing sequence.
              </p>
            </div>

            <button
              type="button"
              onClick={onStart}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-8 py-4 font-bold text-black transition hover:brightness-110"
            >
              START ROUND →
            </button>

          </div>

        </section>

      </div>

    </main>
  )
}

export default InstructionsScreen