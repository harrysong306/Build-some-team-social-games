import {
  useEffect,
  useState,
} from 'react'

type RecallPhaseProps = {
  drawings: (string | null)[]
  words: string[]
  onComplete: (score: number) => void
}

const ANSWER_TIME_SECONDS = 5

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

  const [hasBuzzed, setHasBuzzed] =
    useState(false)

  const [timeLeft, setTimeLeft] =
    useState(ANSWER_TIME_SECONDS)

  const [timedOut, setTimedOut] =
    useState(false)

  const currentDrawing =
    drawings[currentIndex]

  const currentWord =
    words[currentIndex]

  useEffect(() => {
    if (!hasBuzzed || checked) {
      return
    }

    if (timeLeft <= 0) {
      setTimedOut(true)
      setCorrect(false)
      setChecked(true)
      return
    }

    const timer = window.setTimeout(() => {
      setTimeLeft(
        (current) => current - 1,
      )
    }, 1000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    hasBuzzed,
    checked,
    timeLeft,
  ])

  const buzz = () => {
    setHasBuzzed(true)
    setTimeLeft(ANSWER_TIME_SECONDS)
    setTimedOut(false)
  }

  const checkAnswer = () => {
    if (
      !hasBuzzed ||
      checked ||
      !answer.trim()
    ) {
      return
    }

    const isCorrect =
      answer.trim().toLowerCase() ===
      currentWord.toLowerCase()

    setCorrect(isCorrect)
    setTimedOut(false)
    setChecked(true)

    if (isCorrect) {
      setScore(
        (current) => current + 1,
      )
    }
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
    setHasBuzzed(false)
    setTimedOut(false)
    setTimeLeft(ANSWER_TIME_SECONDS)
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
            Score: {score}
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
              Competitive Recall
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              What was the original word?
            </h2>

            {!hasBuzzed ? (
              <>
                <p className="mt-5 text-white/60">
                  Buzz first to answer this question.
                </p>

                <button
                  type="button"
                  onClick={buzz}
                  className="mt-7 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 py-4 text-lg font-bold text-black"
                >
                  BUZZ
                </button>
              </>
            ) : (
              <>
                {!checked && (
                  <>
                    <p className="mt-5 font-semibold text-amber-300">
                      You buzzed first. Enter your answer.
                    </p>

                    <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
                      <p className="text-sm uppercase tracking-wider text-white/60">
                        Time Left
                      </p>

                      <p className="mt-1 text-3xl font-bold text-amber-400">
                        {timeLeft}s
                      </p>
                    </div>
                  </>
                )}

                <input
                  type="text"
                  value={answer}
                  disabled={checked}
                  onChange={(event) =>
                    setAnswer(
                      event.target.value,
                    )
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
                  autoFocus
                  className="mt-7 rounded-xl border border-amber-500/30 bg-[#211006] px-5 py-4 text-lg text-white outline-none focus:border-amber-400 disabled:opacity-60"
                />

                {checked && (
                  <div
                    className={`mt-5 rounded-xl border p-4 ${
                      correct
                        ? 'border-green-500/30 bg-green-500/10'
                        : 'border-red-500/30 bg-red-500/10'
                    }`}
                  >

                    {timedOut ? (
                      <>
                        <p className="font-bold text-red-400">
                          Time&apos;s up
                        </p>

                        <p className="mt-2 text-white/60">
                          The word was{' '}
                          <strong>
                            {currentWord}
                          </strong>.
                        </p>
                      </>
                    ) : correct ? (
                      <p className="font-bold text-green-400">
                        Correct!
                      </p>
                    ) : (
                      <>
                        <p className="font-bold text-red-400">
                          Not quite
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
              </>
            )}

          </div>

        </section>

      </div>

    </main>
  )
}

export default RecallPhase