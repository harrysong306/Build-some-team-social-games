import { useState } from 'react'

import DistractionPhase from './DistractionPhase'
import DrawingPhase from './DrawingPhase'
import InstructionsScreen from './InstructionsScreen'
import RecallPhase from './RecallPhase'

type SketchRecallGameProps = {
  onExit: () => void
}

type GamePhase =
  | 'instructions'
  | 'drawing'
  | 'distraction'
  | 'recall'
  | 'results'

const gameWords = [
  'Apple',
  'Car',
  'Tree',
  'Sun',
  'House',
]

function SketchRecallGame({
  onExit,
}: SketchRecallGameProps) {
  const [phase, setPhase] =
    useState<GamePhase>('instructions')

  const [savedDrawings, setSavedDrawings] =
    useState<(string | null)[]>([])

  const [recallScore, setRecallScore] =
    useState(0)

  if (phase === 'drawing') {
    return (
      <DrawingPhase
        words={gameWords}
        onBack={() =>
          setPhase('instructions')
        }
        onComplete={(drawings) => {
          setSavedDrawings(drawings)
          setPhase('distraction')
        }}
      />
    )
  }

  if (phase === 'distraction') {
    return (
      <DistractionPhase
        onComplete={() =>
          setPhase('recall')
        }
      />
    )
  }

  if (phase === 'recall') {
    return (
      <RecallPhase
        drawings={savedDrawings}
        words={gameWords}
        onComplete={(score) => {
          setRecallScore(score)
          setPhase('results')
        }}
      />
    )
  }

  if (phase === 'results') {
    return (
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#0d0704] px-6 text-white">

        <section className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-[#160b06] p-10 text-center">

          <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
            Round Complete
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Results
          </h1>

          <p className="mt-6 text-6xl font-black text-amber-400">
            {recallScore} / {gameWords.length}
          </p>

          <p className="mt-4 text-white/55">
            You remembered {recallScore} of{' '}
            {gameWords.length} words.
          </p>

        </section>

      </main>
    )
  }

  return (
    <InstructionsScreen
      onBack={onExit}
      onStart={() =>
        setPhase('drawing')
      }
    />
  )
}

export default SketchRecallGame