import { useState } from 'react'

import Header from './components/Header'
import GameCollectionPage from './GameCollectionPage'
import SketchRecallGame from './sketch-recall/SketchRecallGame'
import CreateRoomScreen from './multiplayer/CreateRoomScreen'

type Screen =
  | 'collection'
  | 'create-room'
  | 'sketch-recall'

function App() {
  const [screen, setScreen] =
    useState<Screen>('collection')

  return (
    <div className="min-h-screen bg-[#100a06]">

      <Header />

      {screen === 'collection' ? (
        <GameCollectionPage
          onPlay={() => setScreen('create-room')}
        />
      ) : screen === 'create-room' ? (
        <CreateRoomScreen />
      ) : (
        <SketchRecallGame
          onExit={() => setScreen('collection')}
        />
      )}

    </div>
  )
}

export default App
