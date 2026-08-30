import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  distractionQuestions,
  type DistractionQuestion,
} from './DistractionQuestions'

type DistractionPhaseProps = {
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

function DistractionPhase({
  onComplete,
}: DistractionPhaseProps) {
  const [questions, setQuestions] =
    useState<DistractionQuestion[]>(() =>
      shuffleArray(distractionQuestions).map(
        (question) => ({
          ...question,
          options: shuffleArray(question.options),
        }),
      ),
    )

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

  const currentQuestion =
    questions[questionIndex]

  const moveToNextQuestion = useCallback(() => {
    if (questionIndex >= questions.length - 1) {
      setQuestions(
        shuffleArray(distractionQuestions).map(
          (question) => ({
            ...question,
            options: shuffleArray(question.options),
          }),
        ),
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
    questionIndex,
    questions.length,
  ])

  const nextQuestion = () => {
    const isCorrect =
      selectedAnswer === currentQuestion.answer

    const nextScore =
      score + (isCorrect ? 1 : 0)

    const nextAnsweredCount =
      answeredCount + 1

    setScore(nextScore)
    setAnsweredCount(nextAnsweredCount)

    if (
      nextAnsweredCount >= INITIAL_QUESTIONS &&
      nextScore >= REQUIRED_CORRECT
    ) {
      setFinished(true)
      return
    }

    moveToNextQuestion()
  }

  useEffect(() => {
    if (finished) return

    if (timeLeft === 0) {
      // Treat timeout as an incorrect answer
      const nextAnsweredCount =
        answeredCount + 1

      setAnsweredCount(nextAnsweredCount)

      if (
        nextAnsweredCount >= INITIAL_QUESTIONS &&
        score >= REQUIRED_CORRECT
      ) {
        setFinished(true)
        return
      }

      moveToNextQuestion()

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
    answeredCount,
    score,
    moveToNextQuestion,
  ])

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
            disabled={!selectedAnswer}
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
