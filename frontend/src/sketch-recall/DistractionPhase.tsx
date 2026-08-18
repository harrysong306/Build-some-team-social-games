import { useEffect, useState } from 'react'

type DistractionPhaseProps = {
  onComplete: () => void
}

type Question = {
  question: string
  options: string[]
  answer: string
}

const QUESTIONS_PER_ROUND = 7

const questionBank: Question[] = [
  {
    question: 'What is 19 x 6?',
    options: ['96', '102', '114', '124'],
    answer: '114',
  },
  {
    question: 'What is 14^2?',
    options: ['176', '186', '196', '206'],
    answer: '196',
  },
  {
    question: 'Solve: 84 / 7 + 9',
    options: ['19', '20', '21', '22'],
    answer: '21',
  },
  {
    question: 'Which planet has the most moons currently known?',
    options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'],
    answer: 'Saturn',
  },
  {
    question: 'What is the chemical symbol for sodium?',
    options: ['So', 'S', 'Na', 'N'],
    answer: 'Na',
  },
  {
    question: 'Which gas do plants absorb most for photosynthesis?',
    options: ['Nitrogen', 'Carbon dioxide', 'Oxygen', 'Hydrogen'],
    answer: 'Carbon dioxide',
  },
  {
    question: 'Who wrote Pride and Prejudice?',
    options: ['Emily Bronte', 'Jane Austen', 'Mary Shelley', 'George Eliot'],
    answer: 'Jane Austen',
  },
  {
    question: 'Which language has the most native speakers?',
    options: ['English', 'Spanish', 'Mandarin Chinese', 'Hindi'],
    answer: 'Mandarin Chinese',
  },
  {
    question: 'What is the square root of 289?',
    options: ['15', '16', '17', '18'],
    answer: '17',
  },
  {
    question: 'Which country has the largest population?',
    options: ['India', 'China', 'United States', 'Indonesia'],
    answer: 'India',
  },
  {
    question: 'Which ocean is the largest?',
    options: ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'],
    answer: 'Pacific Ocean',
  },
  {
    question: 'What does CPU stand for?',
    options: [
      'Central Process Unit',
      'Central Processing Unit',
      'Computer Primary Unit',
      'Core Processing Utility',
    ],
    answer: 'Central Processing Unit',
  },
  {
    question: 'Which of these is a prime number?',
    options: ['21', '27', '31', '33'],
    answer: '31',
  },
  {
    question: 'How many sides does a dodecagon have?',
    options: ['10', '11', '12', '14'],
    answer: '12',
  },
  {
    question: 'Which element has atomic number 1?',
    options: ['Helium', 'Hydrogen', 'Oxygen', 'Nitrogen'],
    answer: 'Hydrogen',
  },
  {
    question: 'What is the hardest natural substance?',
    options: ['Iron', 'Graphite', 'Diamond', 'Quartz'],
    answer: 'Diamond',
  },
  {
    question: 'Who painted the Mona Lisa?',
    options: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello'],
    answer: 'Leonardo da Vinci',
  },
  {
    question: 'Which continent has the most countries?',
    options: ['Asia', 'Europe', 'Africa', 'South America'],
    answer: 'Africa',
  },
  {
    question: 'What year did the first iPhone launch?',
    options: ['2005', '2007', '2009', '2010'],
    answer: '2007',
  },
  {
    question: 'Which blood type is known as the universal donor?',
    options: ['O negative', 'O positive', 'AB negative', 'A negative'],
    answer: 'O negative',
  },
  {
    question: 'In computing, what does RAM stand for?',
    options: [
      'Rapid Access Memory',
      'Readily Available Memory',
      'Random Access Memory',
      'Read Access Module',
    ],
    answer: 'Random Access Memory',
  },
  {
    question: 'What is 25% of 360?',
    options: ['80', '85', '90', '95'],
    answer: '90',
  },
  {
    question: 'Which country is both in Europe and Asia?',
    options: ['Greece', 'Portugal', 'Turkey', 'Ireland'],
    answer: 'Turkey',
  },
  {
    question: 'What is the longest river in the world (commonly taught)?',
    options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'],
    answer: 'Nile',
  },
  {
    question: 'Which layer protects Earth from UV radiation?',
    options: ['Troposphere', 'Mesosphere', 'Ozone layer', 'Ionosphere'],
    answer: 'Ozone layer',
  },
  {
    question: 'What is the binary value of decimal 10?',
    options: ['1001', '1010', '1100', '1110'],
    answer: '1010',
  },
  {
    question: 'Who proposed the theory of relativity?',
    options: ['Isaac Newton', 'Niels Bohr', 'Albert Einstein', 'Galileo Galilei'],
    answer: 'Albert Einstein',
  },
  {
    question: 'Which instrument has 88 keys?',
    options: ['Guitar', 'Piano', 'Violin', 'Trumpet'],
    answer: 'Piano',
  },
  {
    question: 'What is the capital of Canada?',
    options: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa'],
    answer: 'Ottawa',
  },
  {
    question: 'Which number comes next: 2, 6, 12, 20, ?',
    options: ['28', '30', '32', '34'],
    answer: '30',
  },
]

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

function buildRoundQuestions(): Question[] {
  return shuffleArray(questionBank)
    .slice(0, QUESTIONS_PER_ROUND)
    .map((question) => ({
      ...question,
      options: shuffleArray(question.options),
    }))
}

function DistractionPhase({
  onComplete,
}: DistractionPhaseProps) {
  const [questions] = useState<Question[]>(() =>
    buildRoundQuestions(),
  )

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
    questions.length,
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
