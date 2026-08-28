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
        <div>
          <h2>Play Sketch Recall</h2>
          <button onClick={() => setScreen('create-room')}>Create Room</button>
          <button onClick={() => setScreen('join-room')}>Join Room</button>
        </div>
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
