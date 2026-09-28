import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react'

import type { Room } from '@colyseus/sdk'

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import LobbyScreen from './LobbyScreen'

const {
  mockUseLobbyState,
} = vi.hoisted(() => ({
  mockUseLobbyState: vi.fn(),
}))

vi.mock(
  './useLobbyState',
  () => ({
    useLobbyState:
      mockUseLobbyState,
  }),
)

vi.mock(
  '../sketch-recall/InstructionsScreen',
  () => ({
    default: ({
      onStart,
    }: {
      onStart: () => void
    }) => (
      <button
        type="button"
        onClick={onStart}
      >
        MOCK START ROUND
      </button>
    ),
  }),
)

vi.mock(
  '../sketch-recall/SketchRecallGame',
  () => ({
    default: ({
      onPlayAgain,
    }: {
      onPlayAgain: () => void
    }) => (
      <section
        data-testid="mock-sketch-game"
      >
        <p>
          MOCK SKETCH GAME
        </p>

        <button
          type="button"
          onClick={onPlayAgain}
        >
          MOCK PLAY AGAIN
        </button>
      </section>
    ),
  }),
)

type LobbyState = {
  players: Record<
    string,
    {
      name: string
      ready: boolean
      isHost: boolean
      score: number
    }
  >
  gameMode: string
  drawingSpeed: string
  phase: string
  gameWords: string[]
  mySessionId: string
  toggleReady: ReturnType<
    typeof vi.fn
  >
  setGameMode: ReturnType<
    typeof vi.fn
  >
  setDrawingSpeed: ReturnType<
    typeof vi.fn
  >
  startGame: ReturnType<
    typeof vi.fn
  >
  returnToLobby: ReturnType<
    typeof vi.fn
  >
}

function makeLobbyState(
  overrides:
    Partial<LobbyState> = {},
): LobbyState {
  return {
    players: {
      host: {
        name: 'Jordan',
        ready: true,
        isHost: true,
        score: 23,
      },
      guest: {
        name: 'Sam',
        ready: true,
        isHost: false,
        score: 23,
      },
    },
    gameMode:
      'sketchRecall',
    drawingSpeed:
      'normal',
    phase:
      'playing',
    gameWords: [
      'Apple',
    ],
    mySessionId:
      'host',
    toggleReady:
      vi.fn(),
    setGameMode:
      vi.fn(),
    setDrawingSpeed:
      vi.fn(),
    startGame:
      vi.fn(),
    returnToLobby:
      vi.fn(),
    ...overrides,
  }
}

function makeRoom() {
  return {
    sessionId:
      'host',
    send:
      vi.fn(),
    sendBytes:
      vi.fn(),
  } as unknown as Room
}

describe(
  'LobbyScreen multiplayer replay integration',
  () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it(
      'passes returnToLobby to the running game instead of startGame',
      () => {
        const startGame =
          vi.fn()

        const returnToLobby =
          vi.fn()

        const lobbyState =
          makeLobbyState({
            startGame,
            returnToLobby,
          })

        mockUseLobbyState
          .mockReturnValue(
            lobbyState,
          )

        render(
          <LobbyScreen
            room={makeRoom()}
            roomId="ABC123"
          />,
        )

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                /mock start round/i,
            },
          ),
        )

        expect(
          screen.getByTestId(
            'mock-sketch-game',
          ),
        ).toBeInTheDocument()

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                /mock play again/i,
            },
          ),
        )

        expect(
          returnToLobby,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          startGame,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'leaves the running game when the authoritative server phase returns to lobby',
      () => {
        let currentState =
          makeLobbyState({
            phase:
              'playing',
          })

        mockUseLobbyState
          .mockImplementation(
            () =>
              currentState,
          )

        const {
          rerender,
        } = render(
          <LobbyScreen
            room={makeRoom()}
            roomId="ABC123"
          />,
        )

        fireEvent.click(
          screen.getByRole(
            'button',
            {
              name:
                /mock start round/i,
            },
          ),
        )

        expect(
          screen.getByTestId(
            'mock-sketch-game',
          ),
        ).toBeInTheDocument()

        currentState = {
          ...currentState,
          phase:
            'lobby',
        }

        rerender(
          <LobbyScreen
            room={makeRoom()}
            roomId="ABC123"
          />,
        )

        expect(
          screen.getByRole(
            'heading',
            {
              name: /lobby/i,
            },
          ),
        ).toBeInTheDocument()

        expect(
          screen.queryByTestId(
            'mock-sketch-game',
          ),
        ).not.toBeInTheDocument()

        /*
         * Move the authoritative server
         * phase back to playing.
         *
         * roundStarted must have been
         * reset while phase was lobby,
         * so the client should return to
         * the pre-game instructions
         * rather than reopening the
         * previous SketchRecallGame.
         */
        currentState = {
          ...currentState,
          phase:
            'playing',
        }

        rerender(
          <LobbyScreen
            room={makeRoom()}
            roomId="ABC123"
          />,
        )

        expect(
          screen.getByRole(
            'button',
            {
              name:
                /mock start round/i,
            },
          ),
        ).toBeInTheDocument()

        expect(
          screen.queryByTestId(
            'mock-sketch-game',
          ),
        ).not.toBeInTheDocument()
      },
    )
  },
)