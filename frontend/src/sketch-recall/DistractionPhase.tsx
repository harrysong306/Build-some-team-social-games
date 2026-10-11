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
import type { Room } from '@colyseus/sdk'
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
    useState<number | null>(null)

  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(10)
  const [finished, setFinished] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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

    setSelectedAnswer(null)
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

    moveToNextQuestion()
    setSubmitting(false)
  }

  const nextQuestion = async () => {
    if (submitting || selectedAnswer === null) return
setSubmitting(true)

const displayedIndex = selectedAnswer
const selectedOption = currentQuestion.options[displayedIndex]
const selectedIndex =
  currentQuestion.optionIndexes?.[displayedIndex] ?? displayedIndex

const result: AnswerResult = currentQuestion.ownerSessionId
  ? await checkPlayerAnswer(currentQuestion, selectedIndex)
  : currentQuestion.serverQuestionId !== undefined
    ? await checkServerAnswer(currentQuestion, selectedOption)
    : { correct: selectedOption === currentQuestion.answer }

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
    // Waiting for the server's next question.
    if (finished || !currentQuestion) return

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
    answeredCount,
    score,
    moveToNextQuestion,
    nextQuestion,
  ])

  if (!finished && !currentQuestion) {
    return (
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#0d0704] px-6 text-white">
        <p className="text-white/60">Loading question…</p>
      </main>
    )
  }

  if (finished) {
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
             (option, optionIndex) => {
               const selected =
                selectedAnswer === optionIndex

               return (
                <button
                  key={`${questionIndex}-${optionIndex}`}
                  type="button"
                  onClick={() =>
                    setSelectedAnswer(optionIndex)
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
            disabled={selectedAnswer === null || submitting}
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
