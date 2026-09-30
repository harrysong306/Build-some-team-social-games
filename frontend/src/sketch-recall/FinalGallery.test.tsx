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

import FinalGallery from './FinalGallery'

// Minimal stand-in for a Colyseus room: records
// sent messages and lets the test deliver
// server messages to registered listeners.
function createFakeRoom() {
  const listeners: Record<string, (message: any) => void> = {}

  const room = {
    sessionId: 'me',
    state: {
      players: new Map([
        ['me', { name: 'Jordan' }],
        ['other', { name: 'Sam' }],
      ]),
    },
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
    listeners,
    deliver,
  }
}

describe('FinalGallery', () => {
  it('asks the server for the gallery manifest when it mounts', () => {
    const { room, send } = createFakeRoom()
    render(<FinalGallery room={room} words={['cat', 'dog']} />)

    expect(send).toHaveBeenCalledWith('requestFinalGallery', {})
    expect(screen.getByText('Loading drawings…')).toBeTruthy()
  })

  it('requests each drawing in the manifest', () => {
    const { room, send, deliver } = createFakeRoom()
    render(<FinalGallery room={room} words={['cat', 'dog']} />)

    deliver('finalGallery', {
      entries: [
        { sessionId: 'me', index: 0 },
        { sessionId: 'other', index: 1 },
      ],
    })

    expect(send).toHaveBeenCalledWith('requestGalleryImage', { sessionId: 'me', index: 0 })
    expect(send).toHaveBeenCalledWith('requestGalleryImage', { sessionId: 'other', index: 1 })
  })

  it('shows each drawing under its player with the word it was for', () => {
    const { room, deliver } = createFakeRoom()
    render(<FinalGallery room={room} words={['cat', 'dog']} />)

    deliver('finalGallery', {
      entries: [
        { sessionId: 'me', index: 0 },
        { sessionId: 'other', index: 1 },
      ],
    })

    expect(screen.getByText('Jordan (you)')).toBeTruthy()
    expect(screen.getByText('Sam')).toBeTruthy()
    expect(screen.getByText('cat')).toBeTruthy()
    expect(screen.getByText('dog')).toBeTruthy()

    deliver('galleryImage', { sessionId: 'other', index: 1, image: 'AAAA' })

    const img = screen.getByAltText("Sam's drawing of dog") as HTMLImageElement
    expect(img.src).toBe('data:image/png;base64,AAAA')
  })

  it('shows a message when nobody submitted a drawing', () => {
    const { room, deliver } = createFakeRoom()
    render(<FinalGallery room={room} words={['cat']} />)

    deliver('finalGallery', { entries: [] })

    expect(screen.getByText('No drawings were submitted this game.')).toBeTruthy()
  })

  it('stops listening when it unmounts', () => {
    const { room, listeners } = createFakeRoom()
    const { unmount } = render(<FinalGallery room={room} words={['cat']} />)

    expect(Object.keys(listeners).sort()).toEqual(['finalGallery', 'galleryImage'])

    unmount()

    expect(Object.keys(listeners)).toEqual([])
  })
})
