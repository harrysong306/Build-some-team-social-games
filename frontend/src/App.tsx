import { useState } from 'react'

import Header from './components/Header'
import GameCollectionPage from './GameCollectionPage'
import SketchRecallGame from './sketch-recall/SketchRecallGame'
import CreateRoomScreen from './multiplayer/CreateRoomScreen'
import JoinRoomScreen from './multiplayer/JoinRoomScreen'

type Screen =
  | 'collection'
  | 'room-choice'
  | 'create-room'
  | 'join-room'
  | 'sketch-recall'

function App() {
  const [screen, setScreen] =
    useState<Screen>('collection')

  return (
    <div className="min-h-screen bg-[#100a06]">

      <Header />

      {screen === 'collection' ? (
        <GameCollectionPage
          onPlay={() => setScreen('room-choice')}
        />
      ) : screen === 'room-choice' ? (
        <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-12 text-white">
          <div className="mx-auto max-w-md">
            <h2 className="text-2xl font-extrabold">Play Sketch Recall</h2>
            <button
              onClick={() => setScreen('create-room')}
              className="mt-6 w-full rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-3 font-bold text-black transition hover:brightness-110"
            >
              Create Room
            </button>
            <button
              onClick={() => setScreen('join-room')}
              className="mt-4 w-full rounded-lg border border-amber-400 px-6 py-3 font-bold text-amber-300 transition hover:bg-amber-500/10"
            >
              Join Room
            </button>
          </div>
        </main>
      ) : screen === 'create-room' ? (
        <CreateRoomScreen />
      ) : screen === 'join-room' ? (
        <JoinRoomScreen />
      ) : (
        <SketchRecallGame
          onExit={() => setScreen('collection')}
        />
      )}

    </div>
  )
}

export default App
