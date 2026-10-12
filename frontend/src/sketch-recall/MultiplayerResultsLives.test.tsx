import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react'

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import MultiplayerResultsScreen from './MultiplayerResultsScreen'

const players = {
  me: {
    name: 'Jordan',
    ready: false,
    isHost: true,
    score: 12,
  },
  other: {
    name: 'Sam',
    ready: false,
    isHost: false,
    score: 20,
  },
}

describe('MultiplayerResultsScreen leaving and leaderboard', () => {
  it('shows the final leaderboard without lives information', () => {
    render(
      <MultiplayerResultsScreen
        players={players}
        sessionId="me"
        onPlayAgain={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    const rows =
      screen.getAllByTestId(
        'leaderboard-row',
      )

    expect(rows[0]).toHaveTextContent(
      'Sam',
    )
    expect(rows[0]).toHaveTextContent(
      '20',
    )

    expect(rows[1]).toHaveTextContent(
      'Jordan (You)',
    )
    expect(rows[1]).toHaveTextContent(
      '12',
    )

    expect(
      screen.queryByText(
        'Out of lives',
      ),
    ).toBeNull()

    expect(
      screen.queryByText(
        /❤️/,
      ),
    ).toBeNull()
  })

  it('leaves the room when LEAVE ROOM is pressed', () => {
    const onLeave = vi.fn()

    render(
      <MultiplayerResultsScreen
        players={players}
        sessionId="other"
        onPlayAgain={vi.fn()}
        onExit={vi.fn()}
        onLeave={onLeave}
      />,
    )

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: 'LEAVE ROOM',
        },
      ),
    )

    expect(
      onLeave,
    ).toHaveBeenCalled()
  })

  it('does not show LEAVE ROOM when no leave handler is given', () => {
    render(
      <MultiplayerResultsScreen
        players={players}
        sessionId="me"
        onPlayAgain={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole(
        'button',
        {
          name: 'LEAVE ROOM',
        },
      ),
    ).toBeNull()
  })
})