import { useState } from 'react'
import type { Room } from '@colyseus/sdk'

import type { PlayerView } from '../multiplayer/useLobbyState'
import DistractionPhase from './DistractionPhase'
import DrawingPhase from './DrawingPhase'
import InstructionsScreen from './InstructionsScreen'
import MultiplayerResultsScreen from './MultiplayerResultsScreen'
import RecallPhase from './RecallPhase'
import ResultsScreen from './ResultsScreen'

type SketchRecallGameProps = {
  room: Room | null
  players: Record<string, PlayerView>
  onExit: () => void
  gameWords: readonly string[]
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
  players,
  onExit,
  gameWords,
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
        <MultiplayerResultsScreen
          players={players}
          sessionId={room.sessionId}
          onPlayAgain={playAgain}
          onExit={() => {
            clearSavedDrawings()
            onExit()
          }}
        />
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