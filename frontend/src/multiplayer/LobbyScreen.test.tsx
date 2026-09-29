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

import LobbyScreen from './LobbyScreen'

// Minimal stand-in for a Colyseus room: records
// sent messages and lets the test push state.
function createFakeRoom(sessionId: string) {
  let stateHandler: ((state: any) => void) | null = null

  const onStateChange = Object.assign(
    (handler: (state: any) => void) => {
      stateHandler = handler
    },
    { remove: vi.fn() },
  )

  const room = {
    sessionId,
    send: vi.fn(),
    sendBytes: vi.fn(),
    onStateChange,
  }

  const pushState = (state: {
    players: Record<string, { name: string; ready: boolean; isHost: boolean }>
    drawingCount?: number
  }) => {
    act(() => {
      stateHandler?.({
        players: new Map(Object.entries(state.players)),
        gameMode: 'sketchRecall',
        drawingSpeed: 'normal',
        drawingCount: state.drawingCount,
        phase: 'lobby',
        gameWords: [],
      })
    })
  }

  return {
    room: room as unknown as Room,
    send: room.send,
    pushState,
  }
}

describe('LobbyScreen number of drawings setting', () => {
  it('lets the host pick the number of drawings', () => {
    const { room, send, pushState } = createFakeRoom('host')
    render(<LobbyScreen room={room} roomId="ABCD" />)

    pushState({
      players: { host: { name: 'Jordan', ready: false, isHost: true } },
      drawingCount: 25,
    })

    const select = screen.getByLabelText('Number of drawings') as HTMLSelectElement
    expect(select.value).toBe('25')

    fireEvent.change(select, { target: { value: '15' } })

    expect(send).toHaveBeenCalledWith('setDrawingCount', { count: 15 })
  })

  it('shows the synced count to non-host players without a control', () => {
    const { room, pushState } = createFakeRoom('guest')
    render(<LobbyScreen room={room} roomId="ABCD" />)

    pushState({
      players: {
        host: { name: 'Jordan', ready: false, isHost: true },
        guest: { name: 'Sam', ready: false, isHost: false },
      },
      drawingCount: 10,
    })

    expect(screen.queryByLabelText('Number of drawings')).toBeNull()
    expect(screen.getByText('Number of drawings: 10')).toBeTruthy()
  })
})
