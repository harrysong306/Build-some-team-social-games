import { useState } from 'react'

import DistractionPhase from './DistractionPhase'
import DrawingPhase from './DrawingPhase'
import InstructionsScreen from './InstructionsScreen'

type SketchRecallGameProps = {
  onExit: () => void
}

type GamePhase =
  | 'instructions'
  | 'drawing'
  | 'distraction'
  | 'recall'

function SketchRecallGame({
  onExit,
}: SketchRecallGameProps) {
  const [phase, setPhase] =
    useState<GamePhase>('instructions')

  const [savedDrawings, setSavedDrawings] =
    useState<(string | null)[]>([])

  if (phase === 'drawing') {
    return (
      <DrawingPhase
        onBack={() => setPhase('instructions')}
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
        onComplete={() => setPhase('recall')}
      />
    )
  }

  if (phase === 'recall') {
    return (
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#0d0704] px-6 text-white">

        <section className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-[#160b06] p-10 text-center">

          <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
            Recall Phase
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Ready to remember?
          </h1>

          <p className="mt-4 text-white/55">
            {savedDrawings.filter(Boolean).length} drawings were saved.
          </p>

          <p className="mt-2 text-sm text-white/40">
            We will build the recall system here next.
          </p>

        </section>

      </main>
    )
  }

  return (
    <InstructionsScreen
      onBack={onExit}
      onStart={() => setPhase('drawing')}
    />
  )
}

export default SketchRecallGame