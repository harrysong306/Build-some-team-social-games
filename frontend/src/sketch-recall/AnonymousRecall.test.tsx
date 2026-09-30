import {
  act,
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
// lets the test deliver server messages.
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

  return { room: room as unknown as Room, deliver }
}

describe('RecallPhase anonymous mode (BE-16 / FE-18)', () => {
  it("shows the drawing sent by the server instead of the player's own", () => {
    const { room, deliver } = createFakeRoom()

    render(
      <RecallPhase
        room={room}
        anonymous
        drawings={['data:image/png;base64,MINE']}
        words={['cat']}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByText('What was drawn?')).toBeInTheDocument()
    expect(screen.getByText('Drawn anonymously')).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('Waiting for the drawing…')).toBeInTheDocument()

    deliver('recallDrawing', { roundIndex: 0, image: 'THEIRS' })

    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'data:image/png;base64,THEIRS',
    )
  })

  it('ignores a drawing sent for a different round', () => {
    const { room, deliver } = createFakeRoom()

    render(
      <RecallPhase
        room={room}
        anonymous
        drawings={['data:image/png;base64,MINE', null]}
        words={['cat', 'dog']}
        onComplete={vi.fn()}
      />,
    )

    deliver('recallDrawing', { roundIndex: 1, image: 'NEXT' })

    expect(screen.queryByRole('img')).toBeNull()
  })

  it("keeps showing the player's own drawing when not in anonymous mode", () => {
    const { room } = createFakeRoom()

    render(
      <RecallPhase
        room={room}
        drawings={['data:image/png;base64,MINE']}
        words={['cat']}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByText('What did you draw?')).toBeInTheDocument()
    expect(screen.queryByText('Drawn anonymously')).toBeNull()
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'data:image/png;base64,MINE',
    )
  })
})
