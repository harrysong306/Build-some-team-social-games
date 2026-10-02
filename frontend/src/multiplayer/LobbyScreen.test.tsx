import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type { Room } from '@colyseus/sdk'

import LobbyScreen from './LobbyScreen'

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
      <section data-testid="mock-sketch-game">
        <p>MOCK SKETCH GAME</p>

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

type FakePlayer = {
  name: string
  ready: boolean
  isHost: boolean
  score: number
}

type FakeState = {
  players: Record<string, FakePlayer>
  drawingCount?: number
  drawingSpeed?: string
  wordTheme?: string
  phase?: string
  gameWords?: string[]
}

// Minimal stand-in for a Colyseus room.
// It records outgoing messages and lets
// tests push synchronized server state.
function createFakeRoom(
  sessionId: string,
) {
  let stateHandler:
    ((state: any) => void) |
    null = null

  const onStateChange =
    Object.assign(
      (
        handler:
          (state: any) => void,
      ) => {
        stateHandler = handler
      },
      {
        remove: vi.fn(),
      },
    )

  const room = {
    sessionId,
    send: vi.fn(),
    sendBytes: vi.fn(),
    onStateChange,
  }

  const pushState = (
    state: FakeState,
  ) => {
    act(() => {
      stateHandler?.({
        players:
          new Map(
            Object.entries(
              state.players,
            ),
          ),
        gameMode:
          'sketchRecall',
        drawingSpeed:
          state.drawingSpeed ??
          'normal',
        drawingCount:
          state.drawingCount ??
          25,
        wordTheme:
          state.wordTheme ??
          'general',
        phase:
          state.phase ??
          'lobby',
        gameWords:
          state.gameWords ??
          [],
      })
    })
  }

  return {
    room:
      room as unknown as Room,
    send:
      room.send,
    pushState,
  }
}

describe(
  'LobbyScreen number of drawings setting',
  () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it(
      'lets the host pick the number of drawings',
      () => {
        const {
          room,
          send,
          pushState,
        } =
          createFakeRoom(
            'host',
          )

        render(
          <LobbyScreen
            room={room}
            roomId="ABCD"
          />,
        )

        pushState({
          players: {
            host: {
              name:
                'Jordan',
              ready:
                false,
              isHost:
                true,
              score:
                0,
            },
          },
          drawingCount:
            25,
        })

        const select =
          screen.getByLabelText(
            'Number of drawings',
          ) as HTMLSelectElement

        expect(
          select.value,
        ).toBe('25')

        fireEvent.change(
          select,
          {
            target: {
              value:
                '15',
            },
          },
        )

        expect(
          send,
        ).toHaveBeenCalledWith(
          'setDrawingCount',
          {
            count:
              15,
          },
        )
      },
    )

    it(
      'shows the synced count to non-host players without a control',
      () => {
        const {
          room,
          pushState,
        } =
          createFakeRoom(
            'guest',
          )

        render(
          <LobbyScreen
            room={room}
            roomId="ABCD"
          />,
        )

        pushState({
          players: {
            host: {
              name:
                'Jordan',
              ready:
                false,
              isHost:
                true,
              score:
                0,
            },
            guest: {
              name:
                'Sam',
              ready:
                false,
              isHost:
                false,
              score:
                0,
            },
          },
          drawingCount:
            10,
        })

        expect(
          screen.queryByLabelText(
            'Number of drawings',
          ),
        ).toBeNull()

        expect(
          screen.getByText(
            'Number of drawings: 10',
          ),
        ).toBeTruthy()
      },
    )
  },
)

describe(
  'LobbyScreen word theme setting',
  () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it(
      'lets the host select a word theme',
      () => {
        const {
          room,
          send,
          pushState,
        } = createFakeRoom('host')

        render(
          <LobbyScreen
            room={room}
            roomId="ABCD"
          />,
        )

        pushState({
          players: {
            host: {
              name: 'Jordan',
              ready: false,
              isHost: true,
              score: 0,
            },
          },
          wordTheme: 'general',
        })

        const select =
          screen.getByLabelText(
            'Word theme',
          ) as HTMLSelectElement

        expect(
          select.value,
        ).toBe('general')

        fireEvent.change(
          select,
          {
            target: {
              value: 'animals',
            },
          },
        )

        expect(
          send,
        ).toHaveBeenCalledWith(
          'setWordTheme',
          {
            theme: 'animals',
          },
        )
      },
    )

    it(
      'shows the synced word theme to non-host players without a control',
      () => {
        const {
          room,
          pushState,
        } = createFakeRoom('guest')

        render(
          <LobbyScreen
            room={room}
            roomId="ABCD"
          />,
        )

        pushState({
          players: {
            host: {
              name: 'Jordan',
              ready: false,
              isHost: true,
              score: 0,
            },
            guest: {
              name: 'Sam',
              ready: false,
              isHost: false,
              score: 0,
            },
          },
          wordTheme: 'animals',
        })

        expect(
          screen.queryByLabelText(
            'Word theme',
          ),
        ).toBeNull()

        expect(
          screen.getByText(
            'Word theme: Animals',
          ),
        ).toBeTruthy()
      },
    )
  },
)

describe(
  'LobbyScreen multiplayer replay integration',
  () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it(
      'passes returnToLobby to the running game instead of startGame',
      () => {
        const {
          room,
          send,
          pushState,
        } =
          createFakeRoom(
            'host',
          )

        render(
          <LobbyScreen
            room={room}
            roomId="ABC123"
          />,
        )

        pushState({
          players: {
            host: {
              name:
                'Jordan',
              ready:
                true,
              isHost:
                true,
              score:
                23,
            },
            guest: {
              name:
                'Sam',
              ready:
                true,
              isHost:
                false,
              score:
                23,
            },
          },
          phase:
            'playing',
          drawingCount:
            10,
          gameWords: [
            'Apple',
          ],
        })

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
          send,
        ).toHaveBeenCalledWith(
          'returnToLobby',
        )

        expect(
          send,
        ).not.toHaveBeenCalledWith(
          'startGame',
        )
      },
    )

    it(
      'leaves the running game when the authoritative server phase returns to lobby',
      () => {
        const {
          room,
          pushState,
        } =
          createFakeRoom(
            'host',
          )

        render(
          <LobbyScreen
            room={room}
            roomId="ABC123"
          />,
        )

        const players = {
          host: {
            name:
              'Jordan',
            ready:
              true,
            isHost:
              true,
            score:
              23,
          },
          guest: {
            name:
              'Sam',
            ready:
              true,
            isHost:
              false,
            score:
              23,
          },
        }

        pushState({
          players,
          phase:
            'playing',
          drawingCount:
            10,
          gameWords: [
            'Apple',
          ],
        })

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

        /*
         * The backend is authoritative:
         * when it sends lobby, every
         * browser must leave the running
         * SketchRecallGame.
         */
        pushState({
          players: {
            host: {
              ...players.host,
              ready:
                false,
            },
            guest: {
              ...players.guest,
              ready:
                false,
            },
          },
          phase:
            'lobby',
          drawingCount:
            10,
          gameWords: [],
        })

        expect(
          screen.getByRole(
            'heading',
            {
              name:
                /lobby/i,
            },
          ),
        ).toBeInTheDocument()

        expect(
          screen.queryByTestId(
            'mock-sketch-game',
          ),
        ).not.toBeInTheDocument()

        /*
         * If another game later starts,
         * the old local roundStarted flag
         * must not reopen the previous
         * SketchRecallGame.
         */
        pushState({
          players: {
            host: {
              ...players.host,
              ready:
                true,
            },
            guest: {
              ...players.guest,
              ready:
                true,
            },
          },
          phase:
            'playing',
          drawingCount:
            10,
          gameWords: [
            'Tree',
          ],
        })

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