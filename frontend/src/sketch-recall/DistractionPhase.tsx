import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  distractionQuestions,
  type DistractionQuestion,
} from './DistractionQuestions'
import DistractionMinigame from './DistractionMinigame'
import type { Room } from '@colyseus/sdk'
import { useLobbyState } from '../multiplayer/useLobbyState'
import type { PlayerQuestionForGame } from '../multiplayer/useLobbyState'

type GameQuestion = DistractionQuestion & {
  ownerSessionId?: string
  questionIndex?: number
  ownerName?: string
  optionIndexes?: number[]
  // BE-15: set on bank questions served by the server.
  serverQuestionId?: number
}

// BE-15: progress the server sends back with every answer.
type DistractionProgress = {
  answered: number
  correct: number
  required: number
  complete: boolean
}

type AnswerResult = {
  correct: boolean
  progress?: DistractionProgress
}

type DistractionPhaseProps = {
  room?: Room | null
  playerQuestions?: readonly PlayerQuestionForGame[]
  onComplete: () => void
}

type WaitingScreenProps = {
  title: string
  subtitle: string
  readyCount: number
  totalCount: number
}

// shared "waiting for other players" screen - used identically before
// the questions start (waiting on everyone to finish drawing) and
// after they end (waiting on everyone to finish answering)
function WaitingScreen({
  title,
  subtitle,
  readyCount,
  totalCount,
}: WaitingScreenProps) {
  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#0d0704] px-6 text-white">

      <section className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-[#160b06] p-10 text-center">

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/10 text-4xl text-amber-400">
          ⏳
        </div>

        <h1 className="mt-6 text-3xl font-bold">
          {title}
        </h1>

        <p className="mt-3 text-white/55">
          {subtitle}
        </p>

        <p className="mt-6 text-lg font-bold text-amber-300">
          {readyCount} / {totalCount} players ready
        </p>

      </section>

    </main>
  )
}

const INITIAL_QUESTIONS = 5
const REQUIRED_CORRECT = 3

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

function randomizeOptions(
  options: string[],
  correctIndex: number,
) {
  const shuffled = shuffleArray(
    options.map((option, optionIndex) => ({
      option,
      optionIndex,
    })),
  )

  const displayedCorrectIndex =
    shuffled.findIndex(
      ({ optionIndex }) => optionIndex === correctIndex,
    )

  // Prevent a stable first-option answer when the random source repeats 0.
  if (displayedCorrectIndex === 0 && shuffled.length > 1) {
    const swapIndex =
      Math.floor(Math.random() * (shuffled.length - 1)) + 1

    ;[shuffled[0], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[0],
    ]
  }

  return shuffled
}

function DistractionPhase({
  room = null,
  playerQuestions = [],
  onComplete,
}: DistractionPhaseProps) {
  const { players } = useLobbyState(room)

  const playerList = Object.values(players)
  const totalPlayers = playerList.length
  const readyCount = playerList.filter((p) => p.distractionReady).length
  const doneCount = playerList.filter((p) => p.distractionDone).length

  // a real room always syncs player state; a room-like object that
  // can't (e.g. a test double covering only send/onMessage) will never
  // report any players, so there's nothing to wait on either - bypass
  // the gate the same as having no room at all rather than hang forever
  const canSyncPlayers = typeof room?.onStateChange === 'function'
  const allReadyToStart =
    !canSyncPlayers || (totalPlayers > 0 && readyCount >= totalPlayers)
  const allDone =
    !canSyncPlayers || (totalPlayers > 0 && doneCount >= totalPlayers)

  // guard each message so it's only ever sent once per phase, even
  // across StrictMode's double-invoked effects
  const sentReadyRef = useRef(false)
  const sentDoneRef = useRef(false)

  useEffect(() => {
    if (!room || sentReadyRef.current) return
    sentReadyRef.current = true
    room.send('distractionReady')
  }, [room])

  // BE-15: in a multiplayer room the server serves the bank questions,
  // checks every answer and decides when the phase is complete.
  // Without a room (single player) the local bank is used as before.
  const useServer =
    typeof room?.onMessage === 'function'

  const [questions, setQuestions] = useState<GameQuestion[]>(() => [
    ...playerQuestions.map((question) => {
      const options = shuffleArray(
        question.options.map((option, optionIndex) => ({
          option,
          optionIndex,
        })),
      )

      return {
        question: `${question.ownerName}: ${question.prompt}`,
        options: options.map(({ option }) => option),
        optionIndexes: options.map(({ optionIndex }) => optionIndex),
        answer: '',
        ownerSessionId: question.ownerSessionId,
        questionIndex: question.questionIndex,
        ownerName: question.ownerName,
      }
    }),
    ...(useServer ? [] : shuffleArray(distractionQuestions)).map((question) => {
      const options = randomizeOptions(
        question.options,
        question.options.indexOf(question.answer),
      )

      return {
        ...question,
        options: options.map(({ option }) => option),
      }
    }),
  ])

  const [questionIndex, setQuestionIndex] =
    useState(0)

  // Track how many distraction questions have been answered
  const [answeredCount, setAnsweredCount] =
    useState(0)

  const [selectedAnswer, setSelectedAnswer] =
    useState('')

  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(10)
  const [finished, setFinished] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // a short minigame plays between questions, after one is answered
  // and before the next one appears
  const [showingMinigame, setShowingMinigame] = useState(false)

  const currentQuestion =
    questions[questionIndex]

  // BE-15: ask the server for the next bank question whenever the
  // player has run out of questions to answer.
  const requestedRef = useRef(false)

  useEffect(() => {
    if (!useServer || !room) return

    return room.onMessage(
      'distractionQuestion',
      (message: {
        questionId: number
        question: string
        options: string[]
      }) => {
        requestedRef.current = false
        setQuestions((current) => [
          ...current,
          {
            question: message.question,
            options: message.options,
            answer: '',
            serverQuestionId: message.questionId,
          },
        ])
      },
    )
  }, [useServer, room])

  useEffect(() => {
    if (
      !useServer ||
      !room ||
      currentQuestion ||
      finished ||
      requestedRef.current
    ) {
      return
    }

    requestedRef.current = true
    room.send('requestDistractionQuestion', {})
  }, [useServer, room, currentQuestion, finished])

  const moveToNextQuestion = useCallback(() => {
    if (useServer) {
      setQuestionIndex((current) => current + 1)
    } else if (questionIndex >= questions.length - 1) {
      setQuestions(
        shuffleArray(distractionQuestions).map((question) => {
          const options = randomizeOptions(
            question.options,
            question.options.indexOf(question.answer),
          )

          return {
            ...question,
            options: options.map(({ option }) => option),
          }
        }),
      )

      setQuestionIndex(0)
    } else {
      setQuestionIndex(
        (current) => current + 1,
      )
    }

    setSelectedAnswer('')
    setTimeLeft(10)
  }, [
    useServer,
    questionIndex,
    questions.length,
  ])

  const checkPlayerAnswer = (question: GameQuestion, answerIndex: number) =>
    new Promise<AnswerResult>((resolve) => {
      if (!room || !question.ownerSessionId || question.questionIndex === undefined) {
        resolve({ correct: false })
        return
      }

      const removeListener = room.onMessage(
        'player_question_result',
        (message: {
          questionId: string
          correct: boolean
          progress?: DistractionProgress
        }) => {
          if (message.questionId !== `${question.ownerSessionId}:${question.questionIndex}`) return
          removeListener?.()
          resolve(message)
        },
      )

      room.send('submitPlayerQuestionAnswer', {
        ownerSessionId: question.ownerSessionId,
        questionIndex: question.questionIndex,
        answerIndex,
      })
    })

  // BE-15: the server checks bank answers. An empty answer is a timeout.
  const checkServerAnswer = (question: GameQuestion, answer: string) =>
    new Promise<AnswerResult>((resolve) => {
      if (!room) {
        resolve({ correct: false })
        return
      }

      const removeListener = room.onMessage(
        'distractionResult',
        (message: {
          questionId: number
          correct: boolean
          progress?: DistractionProgress
        }) => {
          if (message.questionId !== question.serverQuestionId) return
          removeListener?.()
          resolve(message)
        },
      )

      room.send('submitDistractionAnswer', {
        questionId: question.serverQuestionId,
        answer,
      })
    })

  const finishQuestion = (
    isCorrect: boolean,
    progress?: DistractionProgress,
  ) => {
    const nextScore =
      score + (isCorrect ? 1 : 0)

    const nextAnsweredCount =
      answeredCount + 1

    setScore(nextScore)
    setAnsweredCount(nextAnsweredCount)

    // In a room only the server decides when the phase is complete.
    const complete = useServer
      ? progress?.complete === true
      : nextAnsweredCount >= INITIAL_QUESTIONS &&
        nextScore >= REQUIRED_CORRECT

    if (complete) {
      setFinished(true)
      return
    }

    // a minigame plays before the next question; moveToNextQuestion()
    // runs once it finishes, via handleMinigameComplete below
    setShowingMinigame(true)
    setSubmitting(false)
  }

  const handleMinigameComplete = useCallback(() => {
    setShowingMinigame(false)
    moveToNextQuestion()
  }, [moveToNextQuestion])

  const nextQuestion = async () => {
    if (submitting || !selectedAnswer) return
    setSubmitting(true)

    const displayedIndex = currentQuestion.options.indexOf(selectedAnswer)
    const selectedIndex =
      currentQuestion.optionIndexes?.[displayedIndex] ?? displayedIndex
    const result: AnswerResult = currentQuestion.ownerSessionId
      ? await checkPlayerAnswer(currentQuestion, selectedIndex)
      : currentQuestion.serverQuestionId !== undefined
        ? await checkServerAnswer(currentQuestion, selectedAnswer)
        : { correct: selectedAnswer === currentQuestion.answer }

    finishQuestion(result.correct, result.progress)
  }

  // BE-15: a timeout still has to reach the server so it moves on.
  const timeOutQuestion = async () => {
    setSubmitting(true)

    const result: AnswerResult =
      currentQuestion?.serverQuestionId !== undefined
        ? await checkServerAnswer(currentQuestion, '')
        : { correct: false }

    finishQuestion(false, result.progress)
  }

  useEffect(() => {
    // Waiting for the server's next question. Also don't burn down the
    // timer while still waiting on other players to finish drawing and
    // reach the distraction phase, or while the between-questions
    // minigame is showing.
    if (finished || !currentQuestion || !allReadyToStart || showingMinigame) return

    if (timeLeft === 0) {
      // Treat timeout as an incorrect answer
      if (!submitting) {
        if (useServer) {
          void timeOutQuestion()
        } else {
          finishQuestion(false)
        }
      }

      return
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((current) => current - 1)
    }, 1000)

    return () =>
      window.clearTimeout(timer)
  }, [
    timeLeft,
    finished,
    currentQuestion,
    allReadyToStart,
    showingMinigame,
    answeredCount,
    score,
    moveToNextQuestion,
    nextQuestion,
  ])

  // sync point leaving the phase: once this player finishes answering,
  // tell the room and wait for everyone else before actually completing
  useEffect(() => {
    if (!finished || !room || sentDoneRef.current) return
    sentDoneRef.current = true
    room.send('distractionDone')
  }, [finished, room])

  useEffect(() => {
    // only auto-advance when the room can actually report who's done -
    // without that, there's nobody to wait for and the manual
    // "START RECALL" button below is the only way to move on
    if (canSyncPlayers && finished && allDone) onComplete()
  }, [canSyncPlayers, finished, allDone, onComplete])

  if (finished) {
    if (!canSyncPlayers) {
      // no syncable room: nobody to wait for, same completion screen as before
      return (
        <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#0d0704] px-6 text-white">

          <section className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-[#160b06] p-10 text-center">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/10 text-4xl text-amber-400">
              ✓
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-amber-400">
              Distraction Complete
            </p>

            <h1 className="mt-3 text-3xl font-bold">
              Time to remember
            </h1>

            <p className="mt-4 text-white/55">
              You answered {score} out of{' '}
              {answeredCount} questions correctly.
            </p>

            <button
              type="button"
              onClick={onComplete}
              className="mt-8 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 py-4 font-bold text-black transition hover:brightness-110"
            >
              START RECALL →
            </button>

          </section>

        </main>
      )
    }

    // multiplayer: same wait screen used before the phase starts, now
    // waiting for everyone else to finish answering before moving on
    return (
      <WaitingScreen
        title="Waiting for other players"
        subtitle={`You answered ${score} out of ${answeredCount} correctly. Hang tight while everyone else finishes up.`}
        readyCount={doneCount}
        totalCount={totalPlayers}
      />
    )
  }

  if (!allReadyToStart) {
    // waiting for everyone to finish drawing before the questions start
    return (
      <WaitingScreen
        title="Waiting for other players"
        subtitle="Everyone needs to finish drawing before the distraction questions start."
        readyCount={readyCount}
        totalCount={totalPlayers}
      />
    )
  }

  if (showingMinigame) {
    return <DistractionMinigame onComplete={handleMinigameComplete} />
  }

  if (!currentQuestion) {
    return (
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#0d0704] px-6 text-white">
        <p className="text-white/60">Loading question…</p>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-12 text-white">

      <div className="mx-auto max-w-3xl">

        <div className="flex items-center justify-between">

          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
              Distraction Phase
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Quick question
            </h1>
          </div>

          <div
            className={`text-3xl font-black ${
              timeLeft <= 3
                ? 'text-red-400'
                : 'text-amber-400'
            }`}
          >
            {timeLeft}s
          </div>

        </div>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">

          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
            style={{
              width: `${
                (Math.min(
                  answeredCount,
                  INITIAL_QUESTIONS,
                ) /
                  INITIAL_QUESTIONS) *
                100
              }%`,
            }}
          />

        </div>

        <p className="mt-3 text-sm text-white/40">
          {answeredCount < INITIAL_QUESTIONS
            ? `Question ${answeredCount + 1} of ${INITIAL_QUESTIONS}`
            : 'Replacement Question'}
        </p>

        <p className="mt-2 text-sm text-amber-300">
          Correct: {score} / {REQUIRED_CORRECT} required
        </p>

        <section className="mt-8 rounded-2xl border border-amber-500/30 bg-[#160b06] p-8 md:p-10">

          <h2 className="text-2xl font-bold md:text-3xl">
            {currentQuestion.question}
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">

            {currentQuestion.options.map(
              (option) => {
                const selected =
                  selectedAnswer === option

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setSelectedAnswer(option)
                    }
                    className={`rounded-xl border p-5 text-left font-semibold transition ${
                      selected
                        ? 'border-amber-400 bg-amber-400 text-black'
                        : 'border-amber-500/20 bg-[#211006] text-white hover:border-amber-400/60'
                    }`}
                  >
                    {option}
                  </button>
                )
              },
            )}

          </div>

          <button
            type="button"
            disabled={!selectedAnswer || submitting}
            onClick={nextQuestion}
            className="mt-8 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 py-4 text-lg font-bold text-black disabled:cursor-not-allowed disabled:opacity-30"
          >
            SUBMIT ANSWER →
          </button>

        </section>

      </div>

    </main>
  )
}

export default DistractionPhase