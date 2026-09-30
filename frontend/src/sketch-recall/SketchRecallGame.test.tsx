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

import type { PlayerView } from '../multiplayer/useLobbyState'
import SketchRecallGame from './SketchRecallGame'

vi.mock(
  './InstructionsScreen',
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
        MOCK BEGIN
      </button>
    ),
  }),
)

vi.mock(
  './DrawingPhase',
  () => ({
    default: ({
      onComplete,
    }: {
      onComplete: (
        drawings:
          (string | null)[],
      ) => void
    }) => (
      <button
        type="button"
        onClick={() =>
          onComplete([])
        }
      >
        MOCK DRAWING COMPLETE
      </button>
    ),
  }),
)

vi.mock(
  './DistractionPhase',
  () => ({
    default: ({
      onComplete,
    }: {
      onComplete: () => void
    }) => (
      <button
        type="button"
        onClick={onComplete}
      >
        MOCK DISTRACTION COMPLETE
      </button>
    ),
  }),
)

vi.mock(
  './RecallPhase',
  () => ({
    default: ({
      onComplete,
    }: {
      onComplete: (
        score: number,
      ) => void
    }) => (
      <button
        type="button"
        onClick={() =>
          onComplete(0)
        }
      >
        MOCK RECALL COMPLETE
      </button>
    ),
  }),
)

vi.mock(
  './MultiplayerResultsScreen',
  () => ({
    default: ({
      players,
      sessionId,
      onPlayAgain,
    }: {
      players: Record<
        string,
        PlayerView
      >
      sessionId: string
      onPlayAgain: () => void
    }) => (
      <section
        data-testid="mock-multiplayer-results"
      >
        <p>
          Current:
          {' '}
          {sessionId}
        </p>

        {Object.entries(
          players,
        ).map(
          ([
            playerSessionId,
            player,
          ]) => (
            <p
              key={
                playerSessionId
              }
            >
              {playerSessionId}
              :
              {player.score}
            </p>
          ),
        )}

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

vi.mock(
  './ResultsScreen',
  () => ({
    default: () => (
      <div>
        MOCK SINGLE PLAYER RESULTS
      </div>
    ),
  }),
)

function makeRoom(
  sessionId: string,
) {
  return {
    sessionId,
  } as unknown as Room
}

function advanceToRecall() {
  fireEvent.click(
    screen.getByRole(
      'button',
      {
        name:
          /mock begin/i,
      },
    ),
  )

  fireEvent.click(
    screen.getByRole(
      'button',
      {
        name:
          /mock drawing complete/i,
      },
    ),
  )

  fireEvent.click(
    screen.getByRole(
      'button',
      {
        name:
          /mock distraction complete/i,
      },
    ),
  )
}

function finishRecall() {
  fireEvent.click(
    screen.getByRole(
      'button',
      {
        name:
          /mock recall complete/i,
      },
    ),
  )
}

describe(
  'SketchRecallGame multiplayer integration',
  () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it(
      'allows the host to request multiplayer replay from the final results',
      () => {
        const onPlayAgain =
          vi.fn()

        const players:
          Record<
            string,
            PlayerView
          > = {
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

        render(
          <SketchRecallGame
            room={
              makeRoom(
                'host',
              )
            }
            players={
              players
            }
            onExit={
              vi.fn()
            }
            gameWords={[
              'Apple',
            ]}
            drawingSpeed="normal"
            onPlayAgain={
              onPlayAgain
            }
          />,
        )

        advanceToRecall()
        finishRecall()

        expect(
          screen.getByTestId(
            'mock-multiplayer-results',
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
          onPlayAgain,
        ).toHaveBeenCalledTimes(
          1,
        )

        /*
         * Multiplayer replay does not
         * locally jump back to the
         * instructions screen.
         *
         * It waits for LobbyScreen to
         * receive the server's lobby
         * phase.
         */
        expect(
          screen.getByTestId(
            'mock-multiplayer-results',
          ),
        ).toBeInTheDocument()
      },
    )

    it(
      'does not let a non-host trigger multiplayer replay locally',
      () => {
        const onPlayAgain =
          vi.fn()

        const players:
          Record<
            string,
            PlayerView
          > = {
            host: {
              name:
                'Jordan',
              ready:
                true,
              isHost:
                true,
              score:
                24,
            },
            guest: {
              name:
                'Sam',
              ready:
                true,
              isHost:
                false,
              score:
                20,
            },
          }

        render(
          <SketchRecallGame
            room={
              makeRoom(
                'guest',
              )
            }
            players={
              players
            }
            onExit={
              vi.fn()
            }
            gameWords={[
              'Apple',
            ]}
            drawingSpeed="normal"
            onPlayAgain={
              onPlayAgain
            }
          />,
        )

        advanceToRecall()
        finishRecall()

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
          onPlayAgain,
        ).not.toHaveBeenCalled()

        expect(
          screen.getByTestId(
            'mock-multiplayer-results',
          ),
        ).toBeInTheDocument()
      },
    )

    it(
      'passes the latest synchronized player totals into the final leaderboard',
      () => {
        const beforeFinalRound:
          Record<
            string,
            PlayerView
          > = {
            host: {
              name:
                'Jordan',
              ready:
                true,
              isHost:
                true,
              score:
                20,
            },
            guest: {
              name:
                'Sam',
              ready:
                true,
              isHost:
                false,
              score:
                19,
            },
          }

        const afterFinalRound:
          Record<
            string,
            PlayerView
          > = {
            host: {
              ...beforeFinalRound
                .host,
              score:
                23,
            },
            guest: {
              ...beforeFinalRound
                .guest,
              score:
                23,
            },
          }

        const room =
          makeRoom(
            'host',
          )

        const {
          rerender,
        } = render(
          <SketchRecallGame
            room={room}
            players={
              beforeFinalRound
            }
            onExit={
              vi.fn()
            }
            gameWords={[
              'Apple',
            ]}
            drawingSpeed="normal"
            onPlayAgain={
              vi.fn()
            }
          />,
        )

        advanceToRecall()

        /*
         * This represents the Colyseus
         * state patch reaching React
         * before recallRoundResult.
         */
        rerender(
          <SketchRecallGame
            room={room}
            players={
              afterFinalRound
            }
            onExit={
              vi.fn()
            }
            gameWords={[
              'Apple',
            ]}
            drawingSpeed="normal"
            onPlayAgain={
              vi.fn()
            }
          />,
        )

        finishRecall()

        expect(
          screen.getByText(
            'host:23',
          ),
        ).toBeInTheDocument()

        expect(
          screen.getByText(
            'guest:23',
          ),
        ).toBeInTheDocument()

        expect(
          screen.queryByText(
            'host:20',
          ),
        ).not.toBeInTheDocument()

        expect(
          screen.queryByText(
            'guest:19',
          ),
        ).not.toBeInTheDocument()
      },
    )
  },
)