import { useState } from 'react'
import DrawingPhase from './DrawingPhase'
import InstructionsScreen from './InstructionsScreen'

type SketchRecallGameProps = {
  onExit: () => void
}

type GamePhase =
  | 'instructions'
  | 'drawing'

function SketchRecallGame({
  onExit,
}: SketchRecallGameProps) {
  const [phase, setPhase] =
    useState<GamePhase>('instructions')

  if (phase === 'drawing') {
    return (
      <DrawingPhase
        onBack={() => setPhase('instructions')}
      />
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