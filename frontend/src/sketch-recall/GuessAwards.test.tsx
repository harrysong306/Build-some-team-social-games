import {
  act,
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

import type { Room } from '@colyseus/sdk'

import GuessAwards from './GuessAwards'

// Minimal stand-in for a Colyseus room that
// records sent messages and lets the test
// deliver server messages.
function createFakeRoom() {
  const listeners: Record<string, (message: any) => void> = {}

  const room = {
    sessionId: 'me',
    send: vi.fn(),
    onMessage: vi.fn((type: string, handler: (message: any) => void) => {
      listeners[type] = handler
      return () => { delete listeners[type] }
    }),
  }

  const deliver = (type: string, message: any) => {
    act(() => {
      listeners[type]?.(message)
    })
  }

  return {
    room: room as unknown as Room,
    send: room.send,
    deliver,
  }
}

const guess = (
  id: string,
  sessionId: string,
  playerName: string,
  answer: string,
  points: number,
  votes = 0,
) => ({
  id,
  sessionId,
  playerName,
  answer,
  word: 'cat',
  roundIndex: 0,
  points,
  msLeft: 0,
  votes,
})

const awards = {
  best: [
    guess('0:me', 'me', 'Jordan', 'cat', 4),
    guess('0:sam', 'sam', 'Sam', 'cap', 3),
  ],
  funniest: [],
  candidates: [
    guess('0:sam', 'sam', 'Sam', 'cap', 3),
    guess('1:me', 'me', 'Jordan', 'a hairy potato', 0),
  ],
}

describe('GuessAwards (FE-48)', () => {
  it('asks the server for the podiums', () => {
    const { room, send } = createFakeRoom()
    render(<GuessAwards room={room} />)

    expect(send).toHaveBeenCalledWith('requestGuessAwards', {})
    expect(screen.getByText('Loading podiums…')).toBeInTheDocument()
  })

  it('shows the Best Guess podium in order', () => {
    const { room, deliver } = createFakeRoom()
    render(<GuessAwards room={room} />)

    deliver('guessAwards', awards)

    const spots = screen.getAllByRole('listitem').slice(0, 2)
    expect(spots[0]).toHaveTextContent('🥇')
    expect(spots[0]).toHaveTextContent('Jordan (you)')
    expect(spots[0]).toHaveTextContent('4/4 pts')
    expect(spots[1]).toHaveTextContent('🥈')
    expect(spots[1]).toHaveTextContent('Sam')
  })

  it("votes for another player's answer but not your own", () => {
    const { room, send, deliver } = createFakeRoom()
    render(<GuessAwards room={room} />)

    deliver('guessAwards', awards)

    expect(
      screen.getByRole('button', { name: 'Vote for “a hairy potato”' }),
    ).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Vote for “cap”' }))

    expect(send).toHaveBeenCalledWith('voteFunniestGuess', { guessId: '0:sam' })
    expect(
      screen.getByRole('button', { name: 'Vote for “cap”' }),
    ).toHaveTextContent('Voted')
  })

  it('shows the Funniest Guess podium from the votes', () => {
    const { room, deliver } = createFakeRoom()
    render(<GuessAwards room={room} />)

    expect(screen.queryByText(/2 votes/)).toBeNull()

    deliver('guessAwards', {
      ...awards,
      funniest: [guess('1:me', 'me', 'Jordan', 'a hairy potato', 0, 2)],
    })

    expect(screen.getByText(/2 votes/)).toBeInTheDocument()
  })

  it('explains empty podiums', () => {
    const { room, deliver } = createFakeRoom()
    render(<GuessAwards room={room} />)

    deliver('guessAwards', { best: [], funniest: [], candidates: [] })

    expect(screen.getByText('Nobody scored any points this game.')).toBeInTheDocument()
    expect(
      screen.getByText("Every answer was spot on, so there's nothing to vote for."),
    ).toBeInTheDocument()
  })
})
