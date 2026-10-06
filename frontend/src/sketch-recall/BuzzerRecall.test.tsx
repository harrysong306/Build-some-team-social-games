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

import RecallPhase from './RecallPhase'

// Minimal stand-in for a Colyseus room that
// records sent messages and lets the test
// deliver server messages.
function createFakeRoom() {
  const listeners: Record<string, Set<(message: any) => void>> = {}

  const room = {
    sessionId: 'me',
    send: vi.fn(),
    onMessage: vi.fn((type: string, handler: (message: any) => void) => {
      listeners[type] ??= new Set()
      listeners[type].add(handler)
      return () => { listeners[type].delete(handler) }
    }),
  }

  const deliver = (type: string, message: any) => {
    act(() => {
      for (const handler of [...(listeners[type] ?? [])]) {
        handler(message)
      }
    })
  }

  return {
    room: room as unknown as Room,
    send: room.send,
    deliver,
  }
}

const renderBuzzerRound = () => {
  const fake = createFakeRoom()

  render(
    <RecallPhase
      room={fake.room}
      buzzer
      drawings={['data:image/png;base64,MINE']}
      words={['cat']}
      lives={3}
      onComplete={vi.fn()}
    />,
  )

  fake.deliver('recallRoundStarted', {
    roundIndex: 0,
    deadline: Date.now() + 20_000,
  })

  return fake
}

const answerInput = () =>
  screen.getByPlaceholderText(/enter your answer/i)

describe('RecallPhase buzzer mode (BE-21/22)', () => {
  it('shows a BUZZ button and sends buzz when pressed', () => {
    const { send, deliver } = renderBuzzerRound()

    deliver('buzzerOpen', { roundIndex: 0, eligible: ['me', 'sam'] })

    // Nobody holds the buzzer yet, so nobody can answer.
    expect(answerInput()).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /buzz/i }))

    expect(send).toHaveBeenCalledWith('buzz', { roundIndex: 0 })
  })

  it('lets the player answer once they hold the buzzer', () => {
    const { send, deliver } = renderBuzzerRound()

    deliver('buzzerOpen', { roundIndex: 0, eligible: ['me', 'sam'] })
    deliver('buzzerLocked', {
      roundIndex: 0,
      sessionId: 'me',
      playerName: 'Jordan',
      deadline: Date.now() + 5000,
    })

    expect(screen.getByText(/you buzzed!/i)).toBeInTheDocument()
    expect(answerInput()).not.toBeDisabled()

    fireEvent.change(answerInput(), { target: { value: 'cat' } })
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))

    expect(send).toHaveBeenCalledWith('submitRecallAnswer', {
      roundIndex: 0,
      answer: 'cat',
    })
  })

  it("shows who is answering and keeps everyone else's input locked", () => {
    const { deliver } = renderBuzzerRound()

    deliver('buzzerOpen', { roundIndex: 0, eligible: ['me', 'sam'] })
    deliver('buzzerLocked', {
      roundIndex: 0,
      sessionId: 'sam',
      playerName: 'Sam',
      deadline: Date.now() + 5000,
    })

    expect(screen.getByText(/sam buzzed and is answering/i)).toBeInTheDocument()
    expect(answerInput()).toBeDisabled()
    expect(screen.queryByRole('button', { name: /buzz/i })).toBeNull()
  })

  it('reopens buzzing after a wrong answer', () => {
    const { deliver } = renderBuzzerRound()

    deliver('buzzerOpen', { roundIndex: 0, eligible: ['me', 'sam'] })
    deliver('buzzerLocked', {
      roundIndex: 0,
      sessionId: 'sam',
      playerName: 'Sam',
      deadline: Date.now() + 5000,
    })
    deliver('buzzerOpen', {
      roundIndex: 0,
      eligible: ['me'],
      reason: 'wrong',
      lastSessionId: 'sam',
    })

    expect(screen.getByText(/sam got it wrong/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /buzz/i })).toBeInTheDocument()
  })

  it("doesn't offer the buzzer again after the player's turn", () => {
    const { deliver } = renderBuzzerRound()

    deliver('buzzerOpen', {
      roundIndex: 0,
      eligible: ['sam'],
      reason: 'timeout',
      lastSessionId: 'me',
    })

    expect(screen.queryByRole('button', { name: /buzz/i })).toBeNull()
    expect(
      screen.getByText('You already had your turn on this drawing.'),
    ).toBeInTheDocument()
  })

  it('ignores buzzer messages for another round', () => {
    const { deliver } = renderBuzzerRound()

    deliver('buzzerLocked', {
      roundIndex: 1,
      sessionId: 'me',
      playerName: 'Jordan',
      deadline: Date.now() + 5000,
    })

    expect(answerInput()).toBeDisabled()
  })

  it('leaves the normal mode unchanged', () => {
    const fake = createFakeRoom()

    render(
      <RecallPhase
        room={fake.room}
        drawings={['data:image/png;base64,MINE']}
        words={['cat']}
        lives={3}
        onComplete={vi.fn()}
      />,
    )

    fake.deliver('recallRoundStarted', {
      roundIndex: 0,
      deadline: Date.now() + 10_000,
    })

    expect(screen.queryByText('Buzzer')).toBeNull()
    expect(answerInput()).not.toBeDisabled()
  })
})
