import {
  useEffect,
  useState,
} from 'react'

import CompetitiveLeaderboard, {
  type LeaderboardPlayer,
} from './CompetitiveLeaderboard'

import RoundResultScreen, {
  type RoundSubmittedAnswer,
} from './RoundResultScreen'

import { scoreGuess } from './scoreUtils'

type RecallPhaseProps = {
  drawings: (string | null)[]
  words: string[]
  onComplete: (score: number) => void
  leaderboardPlayers?: LeaderboardPlayer[]
}

const ANSWER_TIME_SECONDS = 5

type AttemptResult =
  | 'incorrect'
  | 'timeout'
  | null

function RecallPhase({
  drawings,
  words,
  onComplete,
  leaderboardPlayers,
}: RecallPhaseProps) {
  const [currentIndex, setCurrentIndex] =
    useState(0)

  const [answer, setAnswer] =
    useState('')

  const [score, setScore] =
    useState(0)

  const [checked, setChecked] =
    useState(false)

  const [hasBuzzed, setHasBuzzed] =
    useState(false)

  const [hasAttempted, setHasAttempted] =
    useState(false)

  const [timeLeft, setTimeLeft] =
    useState(ANSWER_TIME_SECONDS)

  const [attemptResult, setAttemptResult] =
    useState<AttemptResult>(null)

  const [pointsAwarded, setPointsAwarded] =
    useState(0)

  const [
    showRoundResult,
    setShowRoundResult,
  ] = useState(false)

  const [
    roundAnswers,
    setRoundAnswers,
  ] = useState<
    RoundSubmittedAnswer[]
  >([])

  const currentDrawing =
    drawings[currentIndex]

  const currentWord =
    words[currentIndex]

  const maxScore =
    words.length * 4

  const playersForLeaderboard:
    LeaderboardPlayer[] =
    leaderboardPlayers &&
    leaderboardPlayers.length > 0
      ? leaderboardPlayers
      : [
          {
            id: 'local-player',
            name: 'You',
            score,
            isCurrentPlayer: true,
          },
        ]

  useEffect(() => {
    if (
      !hasBuzzed ||
      checked ||
      hasAttempted
    ) {
      return
    }

    if (timeLeft <= 0) {
      setAttemptResult('timeout')
      setPointsAwarded(0)

      setRoundAnswers([
        {
          id: 'local-player',
          playerName: 'You',
          answer: '',
          points: 0,
          timedOut: true,
          isCurrentPlayer: true,
        },
      ])

      setHasAttempted(true)
      setHasBuzzed(false)
      setAnswer('')

      return
    }

    const timer =
      window.setTimeout(() => {
        setTimeLeft(
          (current) =>
            current - 1,
        )
      }, 1000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    hasBuzzed,
    checked,
    hasAttempted,
    timeLeft,
  ])

  const buzz = () => {
    if (hasAttempted) {
      return
    }

    setHasBuzzed(true)

    setTimeLeft(
      ANSWER_TIME_SECONDS,
    )

    setAttemptResult(null)
    setPointsAwarded(0)
  }

  const checkAnswer = () => {
    if (
      !hasBuzzed ||
      checked ||
      hasAttempted ||
      !answer.trim()
    ) {
      return
    }

    const submittedText =
      answer.trim()

    const awardedPoints =
      scoreGuess(
        submittedText,
        currentWord,
      )

    const isCorrect =
      awardedPoints === 4

    const submittedAnswer:
      RoundSubmittedAnswer = {
        id: 'local-player',
        playerName: 'You',
        answer: submittedText,
        points: awardedPoints,
        isCurrentPlayer: true,
      }

    setRoundAnswers([
      submittedAnswer,
    ])

    setPointsAwarded(
      awardedPoints,
    )

    if (awardedPoints > 0) {
      setScore(
        (current) =>
          current + awardedPoints,
      )
    }

    if (isCorrect) {
      setChecked(true)
      setHasAttempted(true)
      setAttemptResult(null)

      setShowRoundResult(true)

      return
    }

    setAttemptResult(
      'incorrect',
    )

    setHasAttempted(true)
    setHasBuzzed(false)
    setAnswer('')
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
      (current) =>
        current + 1,
    )

    setAnswer('')
    setChecked(false)
    setHasBuzzed(false)
    setHasAttempted(false)

    setAttemptResult(null)

    setPointsAwarded(0)

    setRoundAnswers([])

    setShowRoundResult(false)

    setTimeLeft(
      ANSWER_TIME_SECONDS,
    )
  }

  if (showRoundResult) {
    return (
      <RoundResultScreen
        roundNumber={
          currentIndex + 1
        }
        totalRounds={
          words.length
        }
        correctWord={
          currentWord
        }
        submittedAnswers={
          roundAnswers
        }
        relatedDrawings={[
          {
            id: 'local-drawing',
            label: 'Your Drawing',
            image:
              currentDrawing,
          },
        ]}
        currentScore={
          score
        }
        maxScore={
          maxScore
        }
        isLastRound={
          currentIndex ===
          words.length - 1
        }
        onContinue={
          nextDrawing
        }
      />
    )
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-10 text-white">

      <div className="mx-auto max-w-7xl">

        <section className="text-center">

          <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
            Recall Phase
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            What did you draw?
          </h1>

          <p className="mt-3 text-white/50">
            Look at your sketch and
            remember the original word.
          </p>

        </section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">

          <span className="text-white/50">
            Drawing{' '}
            {currentIndex + 1} of{' '}
            {words.length}
          </span>

          <span className="font-bold text-amber-400">
            Score: {score} /{' '}
            {maxScore}
          </span>

        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr_0.8fr]">

          <div className="rounded-2xl border border-amber-500/30 bg-[#160b06] p-6">

            <p className="mb-4 text-sm font-semibold text-amber-300">
              YOUR DRAWING
            </p>

            <div className="flex min-h-[380px] items-center justify-center overflow-hidden rounded-xl bg-[#fffdf7]">

              {currentDrawing ? (
                <img
                  src={
                    currentDrawing
                  }
                  alt={`Drawing ${
                    currentIndex +
                    1
                  }`}
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
              What was the original
              word?
            </h2>

            {!hasBuzzed &&
            !hasAttempted &&
            !checked ? (
              <>

                <p className="mt-5 text-white/60">
                  Buzz first to answer
                  this question.
                </p>

                <button
                  type="button"
                  onClick={buzz}
                  className="mt-7 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 py-4 text-lg font-bold text-black"
                >
                  BUZZ
                </button>

              </>
            ) : null}

            {hasBuzzed &&
            !hasAttempted &&
            !checked ? (
              <>

                <p className="mt-5 font-semibold text-amber-300">
                  You buzzed first.
                  Enter your answer.
                </p>

                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">

                  <p className="text-sm uppercase tracking-wider text-white/60">
                    Time Left
                  </p>

                  <p className="mt-1 text-3xl font-bold text-amber-400">
                    {timeLeft}s
                  </p>

                </div>

                <input
                  type="text"
                  value={answer}
                  onChange={(
                    event,
                  ) =>
                    setAnswer(
                      event.target
                        .value,
                    )
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                      'Enter'
                    ) {
                      checkAnswer()
                    }
                  }}
                  placeholder="Enter your answer..."
                  autoFocus
                  className="mt-7 rounded-xl border border-amber-500/30 bg-[#211006] px-5 py-4 text-lg text-white outline-none focus:border-amber-400"
                />

                <div className="mt-auto pt-7">

                  <button
                    type="button"
                    disabled={
                      !answer.trim()
                    }
                    onClick={
                      checkAnswer
                    }
                    className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 py-4 font-bold text-black disabled:opacity-30"
                  >
                    CHECK ANSWER
                  </button>

                </div>

              </>
            ) : null}

            {hasAttempted &&
            !checked ? (
              <div className="mt-7">

                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">

                  {attemptResult ===
                  'timeout' ? (
                    <>

                      <p className="font-bold text-red-400">
                        Time&apos;s up
                      </p>

                      <p className="mt-2 text-white/60">
                        Your attempt is
                        over.
                      </p>

                    </>
                  ) : (
                    <>

                      <p className="font-bold text-red-400">

                        {pointsAwarded >
                        0
                          ? `Close! +${pointsAwarded}/4`
                          : 'Incorrect answer'}

                      </p>

                      <p className="mt-2 text-white/60">
                        Your attempt is
                        over.
                      </p>

                    </>
                  )}

                </div>

                <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">

                  <p className="font-semibold text-amber-300">
                    Waiting for another
                    player
                  </p>

                  <p className="mt-2 text-white/60">
                    Another eligible
                    player can now buzz
                    and attempt this
                    question.
                  </p>

                </div>

              </div>
            ) : null}

          </div>

          <CompetitiveLeaderboard
            players={
              playersForLeaderboard
            }
            maxScore={
              maxScore
            }
          />

        </section>

      </div>

    </main>
  )
}

export default RecallPhase