export type RoundSubmittedAnswer = {
  id: string
  playerName: string
  answer: string
  points: number
  timedOut?: boolean
  isCurrentPlayer?: boolean
}

export type RoundDrawing = {
  id: string
  label: string
  image: string | null
}

type RoundResultScreenProps = {
  roundNumber: number
  totalRounds: number

  correctWord: string

  submittedAnswers:
    RoundSubmittedAnswer[]

  relatedDrawings:
    RoundDrawing[]

  currentScore: number
  maxScore: number

  isLastRound: boolean

  onContinue: () => void
}

function RoundResultScreen({
  roundNumber,
  totalRounds,
  correctWord,
  submittedAnswers,
  relatedDrawings,
  currentScore,
  maxScore,
  isLastRound,
  onContinue,
}: RoundResultScreenProps) {
  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-10 text-white">

      <div className="mx-auto max-w-6xl">

        <section className="text-center">

          <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
            Round Result
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Question Complete
          </h1>

          <p className="mt-3 text-white/50">
            Question {roundNumber} of{' '}
            {totalRounds}
          </p>

        </section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">

          <span className="text-white/50">
            Recall progress
          </span>

          <span className="font-bold text-amber-400">
            Score: {currentScore} /{' '}
            {maxScore}
          </span>

        </div>

        <section className="mt-6 rounded-2xl border border-amber-500/30 bg-[#160b06] p-7 text-center">

          <p className="text-sm font-semibold uppercase tracking-wider text-white/45">
            Correct Word
          </p>

          <p className="mt-3 text-4xl font-bold text-amber-400">
            {correctWord}
          </p>

        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">

          <div className="rounded-2xl border border-amber-500/30 bg-[#160b06] p-6">

            <p className="text-sm font-semibold uppercase tracking-wider text-amber-400">
              Related Drawings
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">

              {relatedDrawings.map(
                (drawing) => (
                  <div
                    key={drawing.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >

                    <p className="mb-3 text-sm font-semibold text-white/60">
                      {drawing.label}
                    </p>

                    <div className="flex min-h-[250px] items-center justify-center overflow-hidden rounded-xl bg-[#fffdf7]">

                      {drawing.image ? (
                        <img
                          src={
                            drawing.image
                          }
                          alt={
                            drawing.label
                          }
                          className="max-h-[320px] w-full object-contain"
                        />
                      ) : (
                        <p className="text-black/40">
                          No drawing saved
                        </p>
                      )}

                    </div>

                  </div>
                ),
              )}

            </div>

          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-[#160b06] p-6">

            <p className="text-sm font-semibold uppercase tracking-wider text-amber-400">
              Submitted Answers
            </p>

            <div className="mt-5 space-y-3">

              {submittedAnswers.length ===
              0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">

                  <p className="text-white/50">
                    No answers were
                    submitted.
                  </p>

                </div>
              ) : (
                submittedAnswers.map(
                  (submittedAnswer) => {
                    const isCorrect =
                      submittedAnswer.points ===
                      4

                    const isClose =
                      submittedAnswer.points >
                        0 &&
                      submittedAnswer.points <
                        4

                    return (
                      <div
                        key={
                          submittedAnswer.id
                        }
                        className={`rounded-xl border p-4 ${
                          isCorrect
                            ? 'border-green-500/30 bg-green-500/10'
                            : isClose
                              ? 'border-amber-500/30 bg-amber-500/10'
                              : 'border-red-500/30 bg-red-500/10'
                        }`}
                      >

                        <div className="flex items-center justify-between gap-4">

                          <div>

                            <div className="flex items-center gap-2">

                              <p className="font-semibold">
                                {
                                  submittedAnswer.playerName
                                }
                              </p>

                              {submittedAnswer.isCurrentPlayer && (
                                <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                                  YOU
                                </span>
                              )}

                            </div>

                            <p className="mt-2 text-white/60">

                              {submittedAnswer.timedOut
                                ? 'Timed out'
                                : submittedAnswer.answer ||
                                  'No answer'}

                            </p>

                          </div>

                          <div className="text-right">

                            <p
                              className={`font-bold ${
                                isCorrect
                                  ? 'text-green-400'
                                  : isClose
                                    ? 'text-amber-400'
                                    : 'text-red-400'
                              }`}
                            >

                              {submittedAnswer.timedOut
                                ? 'TIMEOUT'
                                : isCorrect
                                  ? 'CORRECT'
                                  : isClose
                                    ? 'CLOSE'
                                    : 'INCORRECT'}

                            </p>

                            <p className="mt-1 text-sm text-white/50">
                              +
                              {
                                submittedAnswer.points
                              }
                              /4
                            </p>

                          </div>

                        </div>

                      </div>
                    )
                  },
                )
              )}

            </div>

          </div>

        </section>

        <div className="mt-8 flex justify-center">

          <button
            type="button"
            onClick={onContinue}
            className="w-full max-w-md rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-8 py-4 text-lg font-bold text-black"
          >

            {isLastRound
              ? 'VIEW FINAL RESULTS →'
              : 'NEXT QUESTION →'}

          </button>

        </div>

      </div>

    </main>
  )
}

export default RoundResultScreen