import {
  useEffect,
  useRef,
  useState,
} from 'react'

import type { Room } from '@colyseus/sdk'

import { scoreGuess } from './scoreUtils'
import TeamAbilities from './TeamAbilities'

type RecallPlayerResult = {
  sessionId: string
  playerName: string
  answer: string
  rank: number | null
  timedOut: boolean
  pointsEarned: number
  totalScore: number
  lostLife?: boolean
  lives?: number
}

type RecallRoundResult = {
  roundIndex: number
  correctWord: string
  results: RecallPlayerResult[]
}

type RecallPhaseProps = {
  room?: Room | null
  drawings: (string | null)[]
  words: readonly string[]
  // BE-16: guess someone else's drawing,
  // sent by the server without the artist.
  anonymous?: boolean
  // Multiplayer only: this player's lives and
  // the team abilities already used.
  lives?: number
  usedAbilities?: readonly string[]
  onComplete: (score: number) => void
}

function RecallPhase({
  room = null,
  drawings,
  words,
  anonymous = false,
  lives,
  usedAbilities = [],
  onComplete,
}: RecallPhaseProps) {
  const [currentIndex, setCurrentIndex] =
    useState(0)

  const [answer, setAnswer] =
    useState('')

  /*
   * Existing single-player state.
   */
  const [score, setScore] =
    useState(0)

  const [checked, setChecked] =
    useState(false)

  const [correct, setCorrect] =
    useState(false)

  const [
    pointsAwarded,
    setPointsAwarded,
  ] = useState(0)

  /*
   * Multiplayer Recall state.
   */
  const [
    roundStarted,
    setRoundStarted,
  ] = useState(false)

  const [deadline, setDeadline] =
    useState(0)

  const [timeLeft, setTimeLeft] =
    useState(10)

  const [submitted, setSubmitted] =
    useState(false)

  const [
    roundResult,
    setRoundResult,
  ] =
    useState<RecallRoundResult | null>(
      null,
    )

  const readyRoundRef =
    useRef<number | null>(null)

  // Anonymous mode: the drawing for this
  // round arrives from the server.
  const [anonymousDrawing, setAnonymousDrawing] =
    useState<{
      roundIndex: number
      image: string | null
    } | null>(null)

  const showAnonymous = anonymous && room !== null

  // Out of lives: can watch but not answer.
  // undefined means no lives (single player).
  const isOut =
    room !== null && lives !== undefined && lives <= 0

  const currentDrawing = showAnonymous
    ? anonymousDrawing?.roundIndex === currentIndex
      ? anonymousDrawing.image
      : null
    : drawings[currentIndex]

  const currentWord =
    words[currentIndex]

  /*
   * Listen for the shared round start
   * and synchronized round result.
   */
  useEffect(() => {
    if (!room) return

    const removeStartListener =
      room.onMessage(
        'recallRoundStarted',
        (message: {
          roundIndex: number
          deadline: number
        }) => {
          if (
            message.roundIndex !==
            currentIndex
          ) {
            return
          }

          setDeadline(
            message.deadline,
          )

          setTimeLeft(10)
          setRoundStarted(true)
        },
      )

    const removeResultListener =
      room.onMessage(
        'recallRoundResult',
        (
          message:
            RecallRoundResult,
        ) => {
          if (
            message.roundIndex !==
            currentIndex
          ) {
            return
          }

          setRoundResult(message)
          setRoundStarted(false)
        },
      )

    const removeDrawingListener =
      room.onMessage(
        'recallDrawing',
        (message: {
          roundIndex: number
          image: string | null
        }) => {
          setAnonymousDrawing({
            roundIndex: message.roundIndex,
            image: message.image
              ? `data:image/png;base64,${message.image}`
              : null,
          })
        },
      )

    return () => {
      removeStartListener?.()
      removeResultListener?.()
      removeDrawingListener?.()
    }
  }, [
    room,
    currentIndex,
  ])

  /*
   * Tell the backend when this player
   * reaches the current Recall round.
   */
  useEffect(() => {
    if (!room) return

    if (
      readyRoundRef.current ===
      currentIndex
    ) {
      return
    }

    readyRoundRef.current =
      currentIndex

    room.send(
      'readyRecallRound',
      {
        roundIndex:
          currentIndex,
      },
    )
  }, [
    room,
    currentIndex,
  ])

  /*
   * Frontend countdown only.
   * The backend decides when the
   * round actually ends.
   */
  useEffect(() => {
    if (
      !room ||
      !roundStarted ||
      !deadline
    ) {
      return
    }

    const updateTimer = () => {
      const remaining =
        Math.max(
          0,
          Math.ceil(
            (
              deadline -
              Date.now()
            ) / 1000,
          ),
        )

      setTimeLeft(remaining)
    }

    updateTimer()

    const timer =
      window.setInterval(
        updateTimer,
        250,
      )

    return () =>
      window.clearInterval(
        timer,
      )
  }, [
    room,
    roundStarted,
    deadline,
  ])

  /*
   * Existing local/single-player
   * answer scoring.
   */
  const checkLocalAnswer = () => {
    if (!answer.trim()) return

    const awardedPoints =
      scoreGuess(
        answer,
        currentWord,
      )

    setPointsAwarded(
      awardedPoints,
    )

    setCorrect(
      awardedPoints === 4,
    )

    setChecked(true)

    setScore(
      (current) =>
        current +
        awardedPoints,
    )
  }

  /*
   * Multiplayer answer submission.
   * The server also prevents duplicate
   * submissions.
   */
  const submitMultiplayerAnswer =
    () => {
      if (
        !room ||
        isOut ||
        !roundStarted ||
        submitted ||
        !answer.trim()
      ) {
        return
      }

      room.send(
        'submitRecallAnswer',
        {
          roundIndex:
            currentIndex,
          answer,
        },
      )

      setSubmitted(true)
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
    setCorrect(false)
    setPointsAwarded(0)

    setRoundStarted(false)
    setDeadline(0)
    setTimeLeft(10)
    setSubmitted(false)
    setRoundResult(null)
  }

  /*
   * MULTIPLAYER ROUND RESULT
   */
  if (
    room &&
    roundResult
  ) {
    const myResult =
      roundResult.results.find(
        (result) =>
          result.sessionId ===
          room.sessionId,
      )

    const roundRankings = [
      ...roundResult.results,
    ].sort(
      (left, right) => {
        const leftRank =
          left.rank ??
          Number.MAX_SAFE_INTEGER

        const rightRank =
          right.rank ??
          Number.MAX_SAFE_INTEGER

        return (
          leftRank -
            rightRank ||
          left.playerName.localeCompare(
            right.playerName,
          )
        )
      },
    )

    /*
     * Current standings are based on
     * accumulated 0-4 scores.
     *
     * Equal totals share the same
     * standing rank.
     */
    const sortedStandings = [
      ...roundResult.results,
    ].sort(
      (left, right) =>
        right.totalScore -
          left.totalScore ||
        left.playerName.localeCompare(
          right.playerName,
        ),
    )

    let previousScore:
      | number
      | null = null

    let previousRank = 0

    const currentStandings =
      sortedStandings.map(
        (result, index) => {
          const standingRank =
            previousScore !==
              null &&
            result.totalScore ===
              previousScore
              ? previousRank
              : index + 1

          previousScore =
            result.totalScore

          previousRank =
            standingRank

          return {
            ...result,
            standingRank,
          }
        },
      )

    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <section className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
              Round Result
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              {myResult?.timedOut
                ? 'Time is up'
                : myResult?.rank
                  ? `You ranked #${myResult.rank}`
                  : 'Round complete'}
            </h1>

            <p className="mt-4 text-white/60">
              Correct word:{' '}
              <strong className="text-white">
                {
                  roundResult.correctWord
                }
              </strong>
            </p>

            {myResult && (
              <div className="mt-5 flex justify-center gap-3">
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 font-semibold text-amber-300">
                  +
                  {
                    myResult.pointsEarned
                  }
                  /4
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white/80">
                  Total:{' '}
                  {
                    myResult.totalScore
                  }
                </span>
              </div>
            )}
          </section>

          <section className="mt-8 rounded-2xl border border-amber-500/30 bg-[#160b06] p-6">
            <h2 className="text-lg font-bold">
              Round Rankings
            </h2>

            <div className="mt-5 space-y-3">
              {roundRankings.map(
                (result) => (
                  <div
                    key={
                      result.sessionId
                    }
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-[#211006] px-5 py-4"
                  >
                    <div>
                      <p className="font-semibold">
                        {
                          result.playerName
                        }

                        {result.sessionId ===
                          room.sessionId &&
                          ' (You)'}
                      </p>

                      <p className="mt-1 text-sm text-white/50">
                        {result.timedOut
                          ? 'No answer'
                          : result.answer}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-amber-400">
                        {result.rank
                          ? `#${result.rank}`
                          : 'Timed out'}
                      </p>

                      <p className="mt-1 text-sm text-white/50">
                        +
                        {
                          result.pointsEarned
                        }
                        /4
                      </p>

                      {result.lives !== undefined && (
                        <p className="mt-1 text-xs text-white/50">
                          {result.lostLife ? '−1 ❤️ · ' : ''}
                          {result.lives > 0
                            ? '❤️'.repeat(result.lives)
                            : 'Out'}
                        </p>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-amber-500/30 bg-[#160b06] p-6">
            <h2 className="text-lg font-bold">
              Current Standings
            </h2>

            <div className="mt-5 space-y-3">
              {currentStandings.map(
                (result) => (
                  <div
                    key={
                      result.sessionId
                    }
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-[#211006] px-5 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-7 text-center font-bold text-amber-400">
                        #
                        {
                          result.standingRank
                        }
                      </span>

                      <p className="font-semibold">
                        {
                          result.playerName
                        }

                        {result.sessionId ===
                          room.sessionId &&
                          ' (You)'}
                      </p>
                    </div>

                    <span className="font-bold text-white">
                      {
                        result.totalScore
                      }{' '}
                      pts
                    </span>
                  </div>
                ),
              )}
            </div>

            <button
              type="button"
              onClick={nextDrawing}
              className="mt-7 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 py-4 font-bold text-black"
            >
              {currentIndex ===
              words.length - 1
                ? 'FINISH →'
                : 'NEXT DRAWING →'}
            </button>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">

        <section className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
            Recall Phase
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            {showAnonymous
              ? 'What was drawn?'
              : 'What did you draw?'}
          </h1>

          <p className="mt-3 text-white/50">
            {showAnonymous
              ? 'Guess the word from another player\'s sketch.'
              : 'Look at your sketch and remember the original word.'}
          </p>
        </section>

        <div className="mt-8 flex justify-between">
          <span className="text-white/50">
            Drawing{' '}
            {currentIndex + 1} of{' '}
            {words.length}
            {room && lives !== undefined && (
              <>
                {' · '}
                {lives > 0 ? '❤️'.repeat(lives) : 'Out of lives'}
              </>
            )}
          </span>

          {room ? (
            <span
              className={`font-bold ${
                timeLeft <= 3 &&
                roundStarted
                  ? 'text-red-400'
                  : 'text-amber-400'
              }`}
            >
              {roundStarted
                ? `${timeLeft}s`
                : 'Waiting for players…'}
            </span>
          ) : (
            <span className="font-bold text-amber-400">
              Score: {score} /{' '}
              {words.length * 4}
            </span>
          )}
        </div>

        <section className="mt-6 grid gap-6 md:grid-cols-[1.2fr_1fr]">

          <div className="rounded-2xl border border-amber-500/30 bg-[#160b06] p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-amber-300">
                {showAnonymous
                  ? 'DRAWING'
                  : 'YOUR DRAWING'}
              </p>

              {/* BE-16/FE-18: the artist is never shown */}
              {showAnonymous && (
                <span className="text-xs text-white/40">
                  Drawn anonymously
                </span>
              )}
            </div>

            <div className="flex min-h-[380px] items-center justify-center overflow-hidden rounded-xl bg-[#fffdf7]">
              {currentDrawing ? (
                <img
                  src={currentDrawing}
                  alt={`Drawing ${currentIndex + 1}`}
                  className="max-h-[430px] w-full object-contain"
                />
              ) : (
                <p className="text-black/40">
                  {showAnonymous && !roundStarted
                    ? 'Waiting for the drawing…'
                    : 'No drawing saved'}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-amber-500/30 bg-[#160b06] p-7">

            <p className="text-sm font-semibold uppercase text-amber-400">
              Your Answer
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              What was the original
              word?
            </h2>

            {room &&
              !roundStarted &&
              !submitted && (
                <p className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100/70">
                  Waiting for everyone
                  to reach this
                  question…
                </p>
              )}

            <input
              type="text"
              value={answer}
              disabled={
                room
                  ? !roundStarted ||
                    submitted ||
                    isOut
                  : checked
              }
              onChange={(event) =>
                setAnswer(
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key !==
                  'Enter'
                ) {
                  return
                }

                if (room) {
                  submitMultiplayerAnswer()
                } else if (
                  !checked
                ) {
                  checkLocalAnswer()
                }
              }}
              placeholder="Enter your answer..."
              className="mt-7 rounded-xl border border-amber-500/30 bg-[#211006] px-5 py-4 text-lg text-white outline-none focus:border-amber-400 disabled:opacity-50"
            />

            {!room &&
              checked && (
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
                        {pointsAwarded >
                        0
                          ? `Close! +${pointsAwarded}/4`
                          : 'Not quite'}
                      </p>

                      <p className="mt-2 text-white/60">
                        The word was{' '}
                        <strong>
                          {
                            currentWord
                          }
                        </strong>
                        .
                      </p>
                    </>
                  )}
                </div>
              )}

            {isOut && (
              <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                You're out of lives. Watch the rest of the rounds!
              </p>
            )}

            {room && (
              <TeamAbilities
                key={currentIndex}
                room={room}
                roundIndex={currentIndex}
                roundStarted={roundStarted}
                disabled={isOut}
                usedAbilities={usedAbilities}
              />
            )}

            {room &&
              submitted && (
                <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="font-semibold text-amber-300">
                    Answer submitted
                  </p>

                  <p className="mt-1 text-sm text-white/50">
                    Waiting for the
                    other players…
                  </p>
                </div>
              )}

            <div className="mt-auto pt-7">
              {room ? (
                <button
                  type="button"
                  disabled={
                    !roundStarted ||
                    submitted ||
                    isOut ||
                    !answer.trim()
                  }
                  onClick={
                    submitMultiplayerAnswer
                  }
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 py-4 font-bold text-black disabled:opacity-30"
                >
                  SUBMIT ANSWER
                </button>
              ) : !checked ? (
                <button
                  type="button"
                  disabled={
                    !answer.trim()
                  }
                  onClick={
                    checkLocalAnswer
                  }
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