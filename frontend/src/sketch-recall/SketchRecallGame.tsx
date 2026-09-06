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
  onPlayAgain
}: SketchRecallGameProps) {
  const [phase, setPhase] =
    useState<GamePhase>('instructions')




  const [savedDrawings, setSavedDrawings] =
    useState<(string | null)[]>([])

  const [recallScore, setRecallScore] =
    useState(0)

  const playAgain = () => {
    setSavedDrawings([])
    setRecallScore(0)
    setPhase('instructions')
    onPlayAgain()
  }

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
      <ResultsScreen
        score={recallScore}
        total={gameWords.length * 4}
        onPlayAgain={playAgain}
        onExit={onExit}
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