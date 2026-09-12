import { useState } from 'react'

import DistractionPhase from './DistractionPhase'
import DrawingPhase from './DrawingPhase'
import InstructionsScreen from './InstructionsScreen'
import RecallPhase from './RecallPhase'
import ResultsScreen from './ResultsScreen'


type SketchRecallGameProps = {
  onExit: () => void
  gameWords: readonly string[]
  onPlayAgain: () => void
  onSubmitDrawing?: (
    bytes: Uint8Array,
    index: number,
  ) => void
  // set when the caller already showed the instructions/countdown
  // screen itself, so this game shouldn't show it a second time
  skipInstructions?: boolean
}

type GamePhase =
  | 'instructions'
  | 'drawing'
  | 'distraction'
  | 'recall'
  | 'results'



function SketchRecallGame({
  onExit,
  gameWords,
  onPlayAgain,
  onSubmitDrawing,
  skipInstructions = false,
}: SketchRecallGameProps) {
  const [phase, setPhase] = useState<GamePhase>(
    skipInstructions ? 'drawing' : 'instructions',
  )




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
        onBack={() => setPhase('instructions')}
        onSubmitDrawing={onSubmitDrawing}
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