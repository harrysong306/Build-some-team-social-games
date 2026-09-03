import { useState } from 'react'

import Header from './components/Header'
import GameCollectionPage from './GameCollectionPage'
import SketchRecallGame from './sketch-recall/SketchRecallGame'
import StoryChainGame from './story-chain/StoryChainGame'

type Screen =
  | 'collection'
  | 'sketch-recall'
  | 'story-chain'

function App() {
  const [screen, setScreen] =
    useState<Screen>('collection')

  return (
    <div className="min-h-screen bg-[#100a06]">

      <Header />

      {screen === 'collection' ? (
        <GameCollectionPage
          onPlaySketchRecall={() =>
            setScreen('sketch-recall')
          }
          onPlayStoryChain={() =>
            setScreen('story-chain')
          }
        />
      ) : screen === 'sketch-recall' ? (
        <SketchRecallGame
          onExit={() => setScreen('collection')}
        />
      ) : (
        <StoryChainGame
          onExit={() => setScreen('collection')}
        />
      )}

    </div>
  )
}

export default App