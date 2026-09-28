import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type { PlayerView } from '../multiplayer/useLobbyState'
import MultiplayerResultsScreen from './MultiplayerResultsScreen'

const createPlayer = (
  name: string,
  score: number,
  isHost = false,
): PlayerView => ({
  name,
  score,
  isHost,
  ready: true,
})

describe('MultiplayerResultsScreen', () => {
  it('ranks players by accumulated score and shows the winner', () => {
    const players = {
      jordan: createPlayer(
        'Jordan',
        7,
        true,
      ),
      sam: createPlayer(
        'Sam',
        6,
      ),
      alex: createPlayer(
        'Alex',
        2,
      ),
    }

    render(
      <MultiplayerResultsScreen
        players={players}
        sessionId="jordan"
        onPlayAgain={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(
      screen.getByRole(
        'heading',
        {
          name:
            'Jordan wins!',
        },
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        /Jordan finished first with 7 points/i,
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Jordan (You)',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        /Your result/i,
      ),
    ).toBeInTheDocument()

    const rows =
      screen.getAllByTestId(
        'leaderboard-row',
      )

    expect(
      within(
        rows[0],
      ).getByText(
        'Jordan (You)',
      ),
    ).toBeInTheDocument()

    expect(
      within(
        rows[0],
      ).getByText(
        '7',
      ),
    ).toBeInTheDocument()

    expect(
      within(
        rows[1],
      ).getByText(
        'Sam',
      ),
    ).toBeInTheDocument()

    expect(
      within(
        rows[2],
      ).getByText(
        'Alex',
      ),
    ).toBeInTheDocument()
  })

  it('gives equal total scores the same final rank', () => {
    const players = {
      jordan: createPlayer(
        'Jordan',
        7,
      ),
      sam: createPlayer(
        'Sam',
        7,
      ),
      alex: createPlayer(
        'Alex',
        2,
      ),
    }

    render(
      <MultiplayerResultsScreen
        players={players}
        sessionId="jordan"
        onPlayAgain={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(
      screen.getByRole(
        'heading',
        {
          name:
            "It's a tie!",
        },
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        /Jordan, Sam share first place with 7 points/i,
      ),
    ).toBeInTheDocument()

    const rows =
      screen.getAllByTestId(
        'leaderboard-row',
      )

    expect(
      within(
        rows[0],
      ).getByText('#1'),
    ).toBeInTheDocument()

    expect(
      within(
        rows[1],
      ).getByText('#1'),
    ).toBeInTheDocument()

    expect(
      within(
        rows[2],
      ).getByText('#3'),
    ).toBeInTheDocument()

    expect(
      screen.getAllByText(
        'Joint winner',
      ),
    ).toHaveLength(2)
  })

  it('shares a non-winning rank when players have equal totals', () => {
    const players = {
      jordan: createPlayer(
        'Jordan',
        10,
      ),
      sam: createPlayer(
        'Sam',
        6,
      ),
      alex: createPlayer(
        'Alex',
        6,
      ),
      chris: createPlayer(
        'Chris',
        2,
      ),
    }

    render(
      <MultiplayerResultsScreen
        players={players}
        sessionId="sam"
        onPlayAgain={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    const rows =
      screen.getAllByTestId(
        'leaderboard-row',
      )

    expect(
      within(
        rows[0],
      ).getByText('#1'),
    ).toBeInTheDocument()

    expect(
      within(
        rows[1],
      ).getByText('#2'),
    ).toBeInTheDocument()

    expect(
      within(
        rows[2],
      ).getByText('#2'),
    ).toBeInTheDocument()

    expect(
      within(
        rows[3],
      ).getByText('#4'),
    ).toBeInTheDocument()
  })

  it('handles an empty leaderboard safely', () => {
    render(
      <MultiplayerResultsScreen
        players={{}}
        sessionId="missing"
        onPlayAgain={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(
      screen.getByRole(
        'heading',
        {
          name:
            'Game complete',
        },
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'No player scores available.',
      ),
    ).toBeInTheDocument()

    expect(
      screen.queryByText(
        /Your result/i,
      ),
    ).not.toBeInTheDocument()
  })

  it('calls the final page actions', () => {
    const onPlayAgain =
      vi.fn()

    const onExit =
      vi.fn()

    render(
      <MultiplayerResultsScreen
        players={{
          jordan:
            createPlayer(
              'Jordan',
              4,
            ),
        }}
        sessionId="jordan"
        onPlayAgain={
          onPlayAgain
        }
        onExit={onExit}
      />,
    )

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name:
            /play again/i,
        },
      ),
    )

    expect(
      onPlayAgain,
    ).toHaveBeenCalledTimes(
      1,
    )

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: /exit/i,
        },
      ),
    )

    expect(
      onExit,
    ).toHaveBeenCalledTimes(
      1,
    )
  })
})