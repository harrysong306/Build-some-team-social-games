import { useState } from 'react'

import DistractionPhase from './DistractionPhase'
import DrawingPhase from './DrawingPhase'
import InstructionsScreen from './InstructionsScreen'
import RecallPhase from './RecallPhase'
import ResultsScreen from './ResultsScreen'

type SketchRecallGameProps = {
  onExit: () => void
}

type GamePhase =
  | 'instructions'
  | 'drawing'
  | 'distraction'
  | 'recall'
  | 'results'

const WORDS_PER_ROUND = 8

const easyWordPool = [
  'Apple',
  'Ball',
  'Cat',
  'Dog',
  'Sun',
  'Moon',
  'Star',
  'Tree',
  'Fish',
  'Bird',
  'Book',
  'Cup',
  'Cake',
  'Car',
  'Bus',
  'Bike',
  'Boat',
  'House',
  'Chair',
  'Table',
  'Shoe',
  'Hat',
  'Clock',
  'Phone',
  'Key',
  'Bottle',
  'Flower',
  'Cloud',
  'Rain',
  'Snow',
  'Pizza',
  'Burger',
  'Banana',
  'Orange',
  'Grape',
  'Strawberry',
  'Pencil',
  'Paper',
  'Laptop',
  'Robot',
  'Rocket',
  'Train',
  'Bridge',
  'Mountain',
  'River',
  'Island',
  'Frog',
  'Turtle',
  'Elephant',
  'Lion',
]

function getRandomUniqueItems<T>(
  items: T[],
  count: number,
): T[] {
  const pool = [...items]

  for (
    let index = pool.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex = Math.floor(
      Math.random() * (index + 1),
    )

    ;[pool[index], pool[swapIndex]] = [
      pool[swapIndex],
      pool[index],
    ]
  }

  return pool.slice(0, count)
}

function SketchRecallGame({
  onExit,
}: SketchRecallGameProps) {
  const [phase, setPhase] =
    useState<GamePhase>('instructions')

  const [roundWords, setRoundWords] =
    useState<string[]>(() =>
      getRandomUniqueItems(
        easyWordPool,
        WORDS_PER_ROUND,
      ),
    )

  const [savedDrawings, setSavedDrawings] =
    useState<(string | null)[]>([])

  const [recallScore, setRecallScore] =
    useState(0)

  const playAgain = () => {
    setRoundWords(
      getRandomUniqueItems(
        easyWordPool,
        WORDS_PER_ROUND,
      ),
    )

    setSavedDrawings([])
    setRecallScore(0)
    setPhase('instructions')
  }

  if (phase === 'drawing') {
    return (
      <DrawingPhase
        words={roundWords}
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
        words={roundWords}
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
        total={roundWords.length}
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