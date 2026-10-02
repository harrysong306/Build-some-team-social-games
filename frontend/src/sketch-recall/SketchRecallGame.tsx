import { useState } from 'react'
import type { Room } from '@colyseus/sdk'

import type { PlayerView } from '../multiplayer/useLobbyState'
import DistractionPhase from './DistractionPhase'
import DrawingPhase from './DrawingPhase'
import FinalGallery from './FinalGallery'
import InstructionsScreen from './InstructionsScreen'
import MultiplayerResultsScreen from './MultiplayerResultsScreen'
import RecallPhase from './RecallPhase'
import ResultsScreen from './ResultsScreen'
import type { PlayerQuestionForGame } from '../multiplayer/useLobbyState'

type SketchRecallGameProps = {
  room: Room | null
  players: Record<string, PlayerView>
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
  players,
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

  /*
   * Single-player replay stays local.
   *
   * Multiplayer replay is handled separately below
   * because the shared server state must move every
   * connected player back to the lobby together.
   */
  const playAgain = () => {
    clearSavedDrawings()
    setRecallScore(0)
    setPhase('instructions')
    onPlayAgain()
  }

  /*
   * Only the host should request a multiplayer replay.
   *
   * Do not change this client's local GamePhase here.
   * The server handles returnToLobby and LobbyScreen
   * follows the synchronized server phase.
   *
   * The backend also verifies host ownership, so this
   * client-side check is an additional UI safeguard.
   */
  const requestMultiplayerReplay = () => {
    if (!room) return

    const currentPlayer =
      players[room.sessionId]

    if (!currentPlayer?.isHost) {
      return
    }

    clearSavedDrawings()
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
        <>
        <MultiplayerResultsScreen
          players={players}
          sessionId={room.sessionId}
          onPlayAgain={
            requestMultiplayerReplay
          }
          onExit={() => {
            clearSavedDrawings()
            onExit()
          }}
        />

        {/* FE-102: everyone's drawings, below the final leaderboard */}
        <FinalGallery
          room={room}
          words={gameWords}
        />
        </>
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
