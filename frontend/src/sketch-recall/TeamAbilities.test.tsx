import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'

import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type { Room } from '@colyseus/sdk'

import RecallPhase from './RecallPhase'
import TeamAbilities from './TeamAbilities'

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

const renderAbilities = (
  room: Room,
  props: Partial<Parameters<typeof TeamAbilities>[0]> = {},
) =>
  render(
    <TeamAbilities
      room={room}
      roundIndex={0}
      roundStarted
      disabled={false}
      usedAbilities={[]}
      {...props}
    />,
  )

describe('RecallPhase lives', () => {
  it("shows the player's lives", () => {
    const { room } = createFakeRoom()

    render(
      <RecallPhase
        room={room}
        drawings={['data:image/png;base64,MINE']}
        words={['cat']}
        lives={2}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByText(/Drawing 1 of 1 · ❤️❤️/)).toBeInTheDocument()
  })

  it('stops a player with no lives from answering or voting', () => {
    const { room, deliver } = createFakeRoom()

    render(
      <RecallPhase
        room={room}
        drawings={['data:image/png;base64,MINE']}
        words={['cat']}
        lives={0}
        onComplete={vi.fn()}
      />,
    )

    deliver('recallRoundStarted', {
      roundIndex: 0,
      deadline: Date.now() + 10_000,
    })

    expect(
      screen.getByText("You're out of lives. Watch the rest of the rounds!"),
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/enter your answer/i)).toBeDisabled()
    expect(screen.queryByText('Team abilities')).toBeNull()
  })
})

describe('TeamAbilities (BE-20)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends a vote and shows the running vote count', () => {
    const { room, send, deliver } = createFakeRoom()
    renderAbilities(room)

    fireEvent.click(screen.getByRole('button', { name: /hint/i }))

    expect(send).toHaveBeenCalledWith('voteAbility', {
      roundIndex: 0,
      ability: 'hint',
    })

    deliver('abilityVotes', {
      roundIndex: 0,
      counts: { hint: 1, reveal: 0 },
      needed: 2,
    })

    expect(screen.getByText('1/2 votes')).toBeInTheDocument()
  })

  it('shows the hint once the ability activates', () => {
    const { room, deliver } = createFakeRoom()
    renderAbilities(room)

    deliver('abilityActivated', {
      roundIndex: 0,
      ability: 'hint',
      hint: 'Starts with "C", 3 letters',
    })

    expect(
      screen.getByText('💡 Starts with "C", 3 letters'),
    ).toBeInTheDocument()
  })

  it('ignores messages for a different round', () => {
    const { room, deliver } = createFakeRoom()
    renderAbilities(room)

    deliver('abilityActivated', {
      roundIndex: 1,
      ability: 'hint',
      hint: 'Starts with "D", 3 letters',
    })

    expect(screen.queryByText(/Starts with/)).toBeNull()
  })

  it('shows a revealed drawing for a few seconds', () => {
    vi.useFakeTimers()
    const { room, deliver } = createFakeRoom()
    renderAbilities(room)

    deliver('abilityActivated', {
      roundIndex: 0,
      ability: 'reveal',
      image: 'OTHER',
      seconds: 5,
    })

    expect(screen.getByAltText('Revealed drawing')).toHaveAttribute(
      'src',
      'data:image/png;base64,OTHER',
    )

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.queryByAltText('Revealed drawing')).toBeNull()
  })

  it('disables an ability the team already used this game', () => {
    const { room } = createFakeRoom()
    renderAbilities(room, { usedAbilities: ['hint'] })

    expect(screen.getByRole('button', { name: /hint/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /reveal/i })).not.toBeDisabled()
  })

  it('hides the vote buttons until the round starts', () => {
    const { room } = createFakeRoom()
    renderAbilities(room, { roundStarted: false })

    expect(screen.queryByText('Team abilities')).toBeNull()
  })
})
