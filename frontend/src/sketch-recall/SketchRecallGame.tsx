import { useState } from 'react'
import type { Room } from '@colyseus/sdk'

import DistractionPhase from './DistractionPhase'
import DrawingPhase from './DrawingPhase'
import InstructionsScreen from './InstructionsScreen'
import RecallPhase from './RecallPhase'
import ResultsScreen from './ResultsScreen'
import type { PlayerQuestionForGame } from '../multiplayer/useLobbyState'

type SketchRecallGameProps = {
  room: Room | null
  onExit: () => void
  gameWords: readonly string[]
  playerQuestions: readonly PlayerQuestionForGame[]
  drawingSpeed: string
  onPlayAgain: () => void
  onSubmitDrawing?: (
    bytes: Uint8Array,
    index: number,
  ) => void
}

type GamePhase =
  | 'instructions'
  | 'drawing'
  | 'distraction'
  | 'recall'
  | 'results'

function SketchRecallGame({
  room,
  onExit,
  gameWords,
  playerQuestions,
  drawingSpeed,
  onPlayAgain,
  onSubmitDrawing,
}: SketchRecallGameProps) {
  const [phase, setPhase] =
    useState<GamePhase>('instructions')

  const [savedDrawings, setSavedDrawings] =
    useState<(string | null)[]>([])

  const [recallScore, setRecallScore] =
    useState(0)

  const clearSavedDrawings = () => {
    savedDrawings.forEach((drawing) => {
      if (drawing) {
        URL.revokeObjectURL(drawing)
      }
    })

    setSavedDrawings([])
  }

  const playAgain = () => {
    clearSavedDrawings()
    setRecallScore(0)
    setPhase('instructions')
    onPlayAgain()
  }

  if (phase === 'drawing') {
    return (
      <DrawingPhase
        words={gameWords}
        drawingSpeed={drawingSpeed}
        onBack={() =>
          setPhase('instructions')
        }
        onSubmitDrawing={
          onSubmitDrawing
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
        room={room}
        playerQuestions={playerQuestions}
        onComplete={() =>
          setPhase('recall')
        }
      />
    )
  }

  if (phase === 'recall') {
    return (
      <RecallPhase
        room={room}
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
    if (room) {
      return (
        <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#0d0704] px-6 text-white">
          <section className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-[#160b06] p-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/10 text-4xl text-amber-400">
              ✓
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-amber-400">
              Recall Complete
            </p>

            <h1 className="mt-3 text-3xl font-bold">
              All recall rounds finished
            </h1>

            <p className="mt-4 text-white/55">
              You have completed the
              competitive recall phase.
            </p>

            <button
              type="button"
              onClick={playAgain}
              className="mt-8 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 py-4 font-bold text-black"
            >
              PLAY AGAIN
            </button>

            <button
              type="button"
              onClick={() => {
                clearSavedDrawings()
                onExit()
              }}
              className="mt-3 w-full rounded-xl border border-amber-500/30 py-4 font-bold text-amber-300"
            >
              EXIT
            </button>
          </section>
        </main>
      )
    }

    return (
      <ResultsScreen
        score={recallScore}
        total={gameWords.length * 4}
        onPlayAgain={playAgain}
        onExit={() => {
          clearSavedDrawings()
          onExit()
        }}
      />
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