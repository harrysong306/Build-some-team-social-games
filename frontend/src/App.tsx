import { useState } from 'react'

import Header from './components/Header'
import GameCollectionPage from './GameCollectionPage'
import SketchRecallGame from './sketch-recall/SketchRecallGame'

type Screen =
  | 'collection'
  | 'sketch-recall'

function App() {
  const [screen, setScreen] =
    useState<Screen>('collection')

  return (
    <div className="min-h-screen bg-[#100a06]">

      <Header />

      {screen === 'collection' ? (
        <GameCollectionPage
          onPlay={() => setScreen('sketch-recall')}
        />
      ) : (
        <SketchRecallGame
          onExit={() => setScreen('collection')}
        />
      )}

    </div>
  )
}

export default App