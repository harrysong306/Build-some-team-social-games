import { useState } from 'react'

import { scoreGuess } from './scoreUtils'

type RecallPhaseProps = {
  drawings: (string | null)[]
  words: string[]
  onComplete: (score: number) => void
}

function RecallPhase({
  drawings,
  words,
  onComplete,
}: RecallPhaseProps) {
  const [currentIndex, setCurrentIndex] =
    useState(0)

  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [pointsAwarded, setPointsAwarded] =
    useState(0)

  const currentDrawing =
    drawings[currentIndex]

  const currentWord =
    words[currentIndex]

  const checkAnswer = () => {
    if (!answer.trim()) return

    const awardedPoints = scoreGuess(
      answer,
      currentWord,
    )

    setPointsAwarded(awardedPoints)
    setCorrect(awardedPoints === 4)
    setChecked(true)
    setScore(
      (current) => current + awardedPoints,
    )
  }

  const nextDrawing = () => {
    if (
      currentIndex ===
      words.length - 1
    ) {
      onComplete(score)
      return
    }

    setCurrentIndex(
      (current) => current + 1,
    )

    setAnswer('')
    setChecked(false)
    setCorrect(false)
    setPointsAwarded(0)
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-10 text-white">

      <div className="mx-auto max-w-5xl">

        <section className="text-center">

          <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
            Recall Phase
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            What did you draw?
          </h1>

          <p className="mt-3 text-white/50">
            Look at your sketch and remember
            the original word.
          </p>

        </section>

        <div className="mt-8 flex justify-between">

          <span className="text-white/50">
            Drawing {currentIndex + 1} of{' '}
            {words.length}
          </span>

          <span className="font-bold text-amber-400">
            Score: {score} / {words.length * 4}
          </span>

        </div>

        <section className="mt-6 grid gap-6 md:grid-cols-[1.2fr_1fr]">

          <div className="rounded-2xl border border-amber-500/30 bg-[#160b06] p-6">

            <p className="mb-4 text-sm font-semibold text-amber-300">
              YOUR DRAWING
            </p>

            <div className="flex min-h-[380px] items-center justify-center overflow-hidden rounded-xl bg-[#fffdf7]">

              {currentDrawing ? (
                <img
                  src={currentDrawing}
                  alt={`Drawing ${currentIndex + 1}`}
                  className="max-h-[430px] w-full object-contain"
                />
              ) : (
                <p className="text-black/40">
                  No drawing saved
                </p>
              )}

            </div>

          </div>

          <div className="flex flex-col rounded-2xl border border-amber-500/30 bg-[#160b06] p-7">

            <p className="text-sm font-semibold uppercase text-amber-400">
              Your Answer
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              What was the original word?
            </h2>

            <input
              type="text"
              value={answer}
              disabled={checked}
              onChange={(event) =>
                setAnswer(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !checked
                ) {
                  checkAnswer()
                }
              }}
              placeholder="Enter your answer..."
              className="mt-7 rounded-xl border border-amber-500/30 bg-[#211006] px-5 py-4 text-lg text-white outline-none focus:border-amber-400"
            />

            {checked && (
              <div
                className={`mt-5 rounded-xl border p-4 ${
                  correct
                    ? 'border-green-500/30 bg-green-500/10'
                    : 'border-red-500/30 bg-red-500/10'
                }`}
              >

                {correct ? (
                  <p className="font-bold text-green-400">
                    Correct! +4/4
                  </p>
                ) : (
                  <>
                    <p className="font-bold text-red-400">
                      {pointsAwarded > 0
                        ? `Close! +${pointsAwarded}/4`
                        : 'Not quite'}
                    </p>

                    <p className="mt-2 text-white/60">
                      The word was{' '}
                      <strong>
                        {currentWord}
                      </strong>.
                    </p>
                  </>
                )}

              </div>
            )}

            <div className="mt-auto pt-7">

              {!checked ? (
                <button
                  type="button"
                  disabled={!answer.trim()}
                  onClick={checkAnswer}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 py-4 font-bold text-black disabled:opacity-30"
                >
                  CHECK ANSWER
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextDrawing}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 py-4 font-bold text-black"
                >
                  {currentIndex ===
                  words.length - 1
                    ? 'VIEW RESULTS →'
                    : 'NEXT DRAWING →'}
                </button>
              )}

            </div>

          </div>

        </section>

      </div>

    </main>
  )
}

export default RecallPhase