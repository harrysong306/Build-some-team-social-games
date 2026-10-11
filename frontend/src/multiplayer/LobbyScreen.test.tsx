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
import { saveLobbyPreferences } from './localLobbyPreferences'

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
  questions?: {
    prompt: string
    options: string[]
  }[]
}

type FakeState = {
  players: Record<string, FakePlayer>
  drawingCount?: number
  drawingSpeed?: string
  customDrawingMin?: number
  customDrawingMax?: number
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
        customDrawingMin:
          state.customDrawingMin ??
          6,
        customDrawingMax:
          state.customDrawingMax ??
          10,
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
  'LobbyScreen personal question editing',
  () => {
    beforeEach(() => {
      vi.clearAllMocks()
      window.localStorage.clear()
    })

    it(
      'lets a player choose which submitted question to replace',
      () => {
        const {
          room,
          send,
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
              questions: [
                {
                  prompt: 'Favourite colour?',
                  options: ['Red', 'Blue', 'Green', 'Gold'],
                },
                {
                  prompt: 'Favourite snack?',
                  options: ['Chips', 'Fruit', 'Toast', 'Soup'],
                },
              ],
            },
          },
        })

        fireEvent.click(
          screen.getByRole('button', {
            name: /change a question/i,
          }),
        )

        fireEvent.click(
          screen.getByRole('button', {
            name: /question 2favourite snack/i,
          }),
        )

        expect(send).toHaveBeenCalledWith(
          'replacePlayerQuestion',
          {
            index: 1,
          },
        )

        expect(
          screen.getByPlaceholderText(
            'Question about you',
          ),
        ).toHaveValue('Favourite snack?')

        expect(
          screen.getByPlaceholderText(
            'Option 1',
          ),
        ).toHaveValue('Chips')
      },
    )
  },
)

describe(
  'LobbyScreen saved local preferences',
  () => {
    beforeEach(() => {
      vi.clearAllMocks()
      window.localStorage.clear()
    })

    it(
      'does not apply saved host settings unless this client created the room',
      () => {
        saveLobbyPreferences({
          drawingSpeed: 'hard',
          drawingCount: 10,
          wordTheme: 'animals',
          playerQuestionsEnabled: false,
        })

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
        })

        expect(send).not.toHaveBeenCalledWith(
          'setDrawingSpeed',
          expect.anything(),
        )
        expect(send).not.toHaveBeenCalledWith(
          'setDrawingCount',
          expect.anything(),
        )
        expect(send).not.toHaveBeenCalledWith(
          'setWordTheme',
          expect.anything(),
        )
        expect(send).not.toHaveBeenCalledWith(
          'setPlayerQuestionsEnabled',
          expect.anything(),
        )
      },
    )

    it(
      'prefills saved personal question drafts',
      () => {
        saveLobbyPreferences({
          questionPrompt: 'Favourite snack?',
          questionOptions: [
            'Chips',
            'Fruit',
            'Toast',
            'Soup',
          ],
          correctOption: 1,
        })

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
        })

        expect(
          screen.getByPlaceholderText(
            'Question about you',
          ),
        ).toHaveValue('Favourite snack?')

        expect(
          screen.getByPlaceholderText(
            'Option 2',
          ),
        ).toHaveValue('Fruit')

        expect(
          screen.getByLabelText(
            'Option 2 is correct',
          ),
        ).toBeChecked()
      },
    )

    it(
      'keeps the selected correct option when saving a submitted question draft',
      () => {
        const {
          room,
          send,
          pushState,
        } = createFakeRoom('guest')

        const { unmount } = render(
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
        })

        fireEvent.change(
          screen.getByPlaceholderText(
            'Question about you',
          ),
          {
            target: {
              value: 'Favourite snack?',
            },
          },
        )

        ;[
          'Chips',
          'Fruit',
          'Toast',
          'Soup',
        ].forEach((option, index) => {
          fireEvent.change(
            screen.getByPlaceholderText(
              `Option ${index + 1}`,
            ),
            {
              target: {
                value: option,
              },
            },
          )
        })

        fireEvent.click(
          screen.getByLabelText(
            'Option 2 is correct',
          ),
        )

        fireEvent.click(
          screen.getByRole('button', {
            name: /save question/i,
          }),
        )

        expect(send).toHaveBeenCalledWith(
          'submitPlayerQuestion',
          {
            prompt: 'Favourite snack?',
            options: [
              'Chips',
              'Fruit',
              'Toast',
              'Soup',
            ],
            correctOption: 1,
          },
        )

        unmount()

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
        })

        expect(
          screen.getByPlaceholderText(
            'Question about you',
          ),
        ).toHaveValue('Favourite snack?')

        expect(
          screen.getByLabelText(
            'Option 2 is correct',
          ),
        ).toBeChecked()
      },
    )
  },
)

describe(
  'LobbyScreen drawing speed setting',
  () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it(
      'lets the host enter custom drawing time bounds',
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
          drawingSpeed: 'normal',
          customDrawingMin: 6,
          customDrawingMax: 10,
        })
        send.mockClear()

        fireEvent.click(
          screen.getByLabelText(
            'Drawing speed',
          ),
        )

        fireEvent.click(
          screen.getByRole('option', {
            name: 'Custom',
          }),
        )

        expect(send).toHaveBeenCalledWith(
          'setDrawingSpeed',
          {
            speed: 'custom',
            customMin: 6,
            customMax: 10,
          },
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
          drawingSpeed: 'custom',
          customDrawingMin: 6,
          customDrawingMax: 10,
        })
        send.mockClear()

        fireEvent.change(
          screen.getByLabelText(
            'Min seconds',
          ),
          {
            target: {
              value: '4',
            },
          },
        )

        expect(send).not.toHaveBeenCalledWith(
          'setDrawingSpeed',
          {
            speed: 'custom',
            customMin: 4,
            customMax: 10,
          },
        )

        fireEvent.blur(
          screen.getByLabelText(
            'Min seconds',
          ),
        )

        expect(send).toHaveBeenCalledWith(
          'setDrawingSpeed',
          {
            speed: 'custom',
            customMin: 4,
            customMax: 10,
          },
        )

        send.mockClear()

        fireEvent.change(
          screen.getByLabelText(
            'Max seconds',
          ),
          {
            target: {
              value: '14',
            },
          },
        )

        expect(send).not.toHaveBeenCalledWith(
          'setDrawingSpeed',
          {
            speed: 'custom',
            customMin: 4,
            customMax: 14,
          },
        )

        fireEvent.blur(
          screen.getByLabelText(
            'Max seconds',
          ),
        )

        expect(send).toHaveBeenCalledWith(
          'setDrawingSpeed',
          {
            speed: 'custom',
            customMin: 4,
            customMax: 14,
          },
        )

        send.mockClear()

        const minInput =
          screen.getByLabelText(
            'Min seconds',
          ) as HTMLInputElement

        fireEvent.change(
          minInput,
          {
            target: {
              value: '',
            },
          },
        )

        expect(minInput.value).toBe('')

        expect(send).not.toHaveBeenCalledWith(
          'setDrawingSpeed',
          {
            speed: 'custom',
            customMin: 0,
            customMax: 14,
          },
        )

        fireEvent.blur(minInput)

        expect(minInput.value).toBe('6')

        expect(send).toHaveBeenCalledWith(
          'setDrawingSpeed',
          {
            speed: 'custom',
            customMin: 6,
            customMax: 14,
          },
        )

        send.mockClear()

        fireEvent.change(
          minInput,
          {
            target: {
              value: '999',
            },
          },
        )

        expect(minInput.value).toBe('999')

        expect(send).not.toHaveBeenCalledWith(
          'setDrawingSpeed',
          expect.anything(),
        )

        fireEvent.blur(minInput)

        expect(minInput.value).toBe('120')

        expect(send).toHaveBeenCalledWith(
          'setDrawingSpeed',
          {
            speed: 'custom',
            customMin: 120,
            customMax: 120,
          },
        )

        const maxInputAfterMinChange =
          screen.getByLabelText(
            'Max seconds',
          ) as HTMLInputElement

        expect(maxInputAfterMinChange.value).toBe('120')

        pushState({
          players: {
            host: {
              name: 'Jordan',
              ready: false,
              isHost: true,
              score: 0,
            },
          },
          drawingSpeed: 'custom',
          customDrawingMin: 2,
          customDrawingMax: 10,
        })
        send.mockClear()

        const maxInput =
          screen.getByLabelText(
            'Max seconds',
          ) as HTMLInputElement

        fireEvent.change(
          maxInput,
          {
            target: {
              value: '1',
            },
          },
        )

        expect(maxInput.value).toBe('1')

        expect(send).not.toHaveBeenCalledWith(
          'setDrawingSpeed',
          {
            speed: 'custom',
            customMin: 2,
            customMax: 1,
          },
        )

        fireEvent.blur(maxInput)

        const minInputAfterMaxBlur =
          screen.getByLabelText(
            'Min seconds',
          ) as HTMLInputElement

        expect(minInputAfterMaxBlur.value).toBe('1')

        expect(send).toHaveBeenCalledWith(
          'setDrawingSpeed',
          {
            speed: 'custom',
            customMin: 1,
            customMax: 1,
          },
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
          drawingSpeed: 'custom',
          customDrawingMin: 2,
          customDrawingMax: 10,
        })
        send.mockClear()

        fireEvent.change(
          maxInput,
          {
            target: {
              value: '13',
            },
          },
        )

        expect(maxInput.value).toBe('13')

        expect(send).not.toHaveBeenCalledWith(
          'setDrawingSpeed',
          {
            speed: 'custom',
            customMin: 2,
            customMax: 13,
          },
        )

        fireEvent.keyDown(maxInput, {
          key: 'Enter',
        })

        expect(send).toHaveBeenCalledWith(
          'setDrawingSpeed',
          {
            speed: 'custom',
            customMin: 1,
            customMax: 13,
          },
        )
      },
    )

    it(
      'commits custom drawing time drafts before starting the game',
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
              ready: true,
              isHost: true,
              score: 0,
            },
          },
          drawingSpeed: 'custom',
          customDrawingMin: 6,
          customDrawingMax: 10,
        })
        send.mockClear()

        fireEvent.change(
          screen.getByLabelText(
            'Min seconds',
          ),
          {
            target: {
              value: '15',
            },
          },
        )

        fireEvent.click(
          screen.getByRole('button', {
            name: /start game/i,
          }),
        )

        expect(send).toHaveBeenCalledWith(
          'setDrawingSpeed',
          {
            speed: 'custom',
            customMin: 15,
            customMax: 15,
          },
        )

        expect(send).toHaveBeenCalledWith(
          'startGame',
        )
      },
    )
  },
)

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
        send.mockClear()

        const trigger =
          screen.getByLabelText(
            'Number of drawings',
          )

        expect(
          trigger,
        ).toHaveTextContent('25')

        fireEvent.click(trigger)

        fireEvent.click(
          screen.getByRole('option', {
            name: '15',
          }),
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
            'Sketch Recall · Normal speed · 10 drawings',
          ),
        ).toBeTruthy()

        fireEvent.click(
          screen.getByRole('button', {
            name: /game settings/i,
          }),
        )

        expect(
          screen.getByText(
            'Number of drawings',
          ),
        ).toBeTruthy()

        expect(
          screen.getByText('10'),
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
        send.mockClear()

        const trigger =
          screen.getByLabelText(
            'Word theme',
          )

        expect(
          trigger,
        ).toHaveTextContent('General')

        fireEvent.click(trigger)

        fireEvent.click(
          screen.getByRole('option', {
            name: 'Animals',
          }),
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

        fireEvent.click(
          screen.getByRole('button', {
            name: /game settings/i,
          }),
        )

        expect(
          screen.getByText(
            'Word theme',
          ),
        ).toBeTruthy()

        expect(
          screen.getByText('Animals'),
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
