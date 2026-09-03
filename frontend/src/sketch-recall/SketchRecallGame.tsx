import { useState } from 'react'

import DistractionPhase from './DistractionPhase'
import DrawingPhase from './DrawingPhase'
import InstructionsScreen from './InstructionsScreen'
import RecallPhase from './RecallPhase'
import ResultsScreen from './ResultsScreen'

import {
  generalWords,
  similarWordGroups,
} from './sketchRecallWords'

type SketchRecallGameProps = {
  onExit: () => void
}

type GamePhase =
  | 'instructions'
  | 'drawing'
  | 'distraction'
  | 'recall'
  | 'results'

const shuffle = <T,>(items: T[]) => {
  const result = [...items]

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))

    ;[result[i], result[j]] = [
      result[j],
      result[i],
    ]
  }

  return result
}

const generateGameWords = () => {
  const selectedGroups =
    shuffle(similarWordGroups).slice(0, 3)

  const similarWords = selectedGroups.flat()

  const selectedGeneralWords =
    shuffle(generalWords).slice(
      0,
      25 - similarWords.length,
    )

  return shuffle([
    ...similarWords,
    ...selectedGeneralWords,
  ])
}

function SketchRecallGame({
  onExit,
}: SketchRecallGameProps) {
  const [phase, setPhase] =
    useState<GamePhase>('instructions')

  const [gameWords, setGameWords] =
    useState<string[]>(() => generateGameWords())

  const [savedDrawings, setSavedDrawings] =
    useState<(string | null)[]>([])

  const [recallScore, setRecallScore] =
    useState(0)

  const playAgain = () => {
    setGameWords(generateGameWords())
    setSavedDrawings([])
    setRecallScore(0)
    setPhase('instructions')
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