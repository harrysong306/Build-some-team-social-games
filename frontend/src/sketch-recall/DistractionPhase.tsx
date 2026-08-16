import { useEffect, useState } from 'react'

type DistractionPhaseProps = {
  onComplete: () => void
}

type Question = {
  question: string
  options: string[]
  answer: string
}

const questions: Question[] = [
  {
    question: 'What is 7 + 8?',
    options: ['13', '14', '15', '16'],
    answer: '15',
  },
  {
    question: 'Which planet is closest to the Sun?',
    options: [
      'Earth',
      'Mars',
      'Mercury',
      'Venus',
    ],
    answer: 'Mercury',
  },
  {
    question: 'Which one is a fruit?',
    options: [
      'Carrot',
      'Potato',
      'Apple',
      'Onion',
    ],
    answer: 'Apple',
  },
]

function DistractionPhase({
  onComplete,
}: DistractionPhaseProps) {
  const [questionIndex, setQuestionIndex] =
    useState(0)

  const [selectedAnswer, setSelectedAnswer] =
    useState('')

  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(10)
  const [finished, setFinished] = useState(false)

  const currentQuestion =
    questions[questionIndex]

  const nextQuestion = () => {
    if (
      selectedAnswer === currentQuestion.answer
    ) {
      setScore((current) => current + 1)
    }

    if (
      questionIndex ===
      questions.length - 1
    ) {
      setFinished(true)
      return
    }

    setQuestionIndex(
      (current) => current + 1,
    )

    setSelectedAnswer('')
    setTimeLeft(10)
  }

  useEffect(() => {
    if (finished) return

    if (timeLeft === 0) {
      if (
        questionIndex ===
        questions.length - 1
      ) {
        setFinished(true)
      } else {
        setQuestionIndex(
          (current) => current + 1,
        )

        setSelectedAnswer('')
        setTimeLeft(10)
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
    questionIndex,
    finished,
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
            {questions.length} questions correctly.
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
                ((questionIndex + 1) /
                  questions.length) *
                100
              }%`,
            }}
          />

        </div>

        <p className="mt-3 text-sm text-white/40">
          Question {questionIndex + 1} of{' '}
          {questions.length}
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
            {questionIndex ===
            questions.length - 1
              ? 'FINISH →'
              : 'NEXT QUESTION →'}
          </button>

        </section>

      </div>

    </main>
  )
}

export default DistractionPhase