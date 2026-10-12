import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type { Room } from '@colyseus/sdk'

import DistractionPhase from './DistractionPhase'

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

  const deliver = async (type: string, message: any) => {
    await act(async () => {
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

const progress = (
  answered: number,
  correct: number,
  complete = false,
) => ({ answered, correct, required: 3, complete })

const serveQuestion = (
  deliver: (type: string, message: any) => Promise<void>,
  questionId: number,
) =>
  deliver('distractionQuestion', {
    questionId,
    question: `Server question ${questionId}`,
    options: ['A', 'B', 'C', 'D'],
  })

const answer = (option: string) => {
  fireEvent.click(screen.getByRole('button', { name: option }))
  fireEvent.click(
    screen.getByRole('button', { name: /submit answer/i }),
  )
}

// a minigame now plays between questions - force it to always be the
// click-targets one (deterministic) and clear it out of the way so
// these tests can get straight back to exercising the server flow
const finishMinigame = async () => {
  const target = screen.queryByRole('button', { name: 'Target' })
  if (!target) return

  for (let hit = 0; hit < 6; hit += 1) {
    fireEvent.click(target)
  }

  // "Target" disappears as soon as the minigame shows its done/"Nice!"
  // state, but the phase doesn't actually move on to the next question
  // until its post-result beat elapses and onComplete fires - wait for
  // the whole minigame screen to clear, not just the button
  await waitFor(() => {
    expect(screen.queryByText('Quick Break')).not.toBeInTheDocument()
  })
}

describe('DistractionPhase with a room (BE-15)', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('asks the server for a question instead of using the local bank', async () => {
    const { room, send, deliver } = createFakeRoom()

    render(<DistractionPhase room={room} onComplete={vi.fn()} />)

    expect(screen.getByText('Loading question…')).toBeInTheDocument()
    expect(send).toHaveBeenCalledWith('requestDistractionQuestion', {})

    await serveQuestion(deliver, 7)

    expect(screen.getByText('Server question 7')).toBeInTheDocument()
  })

  it('sends answers to the server and moves on after its result', async () => {
    const { room, send, deliver } = createFakeRoom()

    render(<DistractionPhase room={room} onComplete={vi.fn()} />)
    await serveQuestion(deliver, 7)

    answer('B')

    expect(send).toHaveBeenCalledWith('submitDistractionAnswer', {
      questionId: 7,
      answer: 'B',
    })

    send.mockClear()

    await deliver('distractionResult', {
      questionId: 7,
      correct: true,
      progress: progress(1, 1),
    })

    await finishMinigame()

    expect(send).toHaveBeenCalledWith('requestDistractionQuestion', {})

    await serveQuestion(deliver, 8)

    expect(screen.getByText('Server question 8')).toBeInTheDocument()
    expect(screen.getByText('Correct: 1 / 3 required')).toBeInTheDocument()
  })

  it('only finishes once the server says the phase is complete', async () => {
    const { room, deliver } = createFakeRoom()
    const onComplete = vi.fn()

    render(<DistractionPhase room={room} onComplete={onComplete} />)

    // Locally this would already be "5 answered, 3 correct",
    // but the server hasn't marked it complete yet.
    for (let index = 0; index < 5; index += 1) {
      await serveQuestion(deliver, index)
      answer('A')
      await deliver('distractionResult', {
        questionId: index,
        correct: index < 3,
        progress: progress(index + 1, Math.min(index + 1, 3)),
      })
      await finishMinigame()
    }

    expect(screen.queryByText('Distraction Complete')).toBeNull()

    await serveQuestion(deliver, 5)
    answer('A')
    await deliver('distractionResult', {
      questionId: 5,
      correct: true,
      progress: progress(6, 4, true),
    })

    expect(screen.getByText('Distraction Complete')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /start recall/i }))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('tells the server when a question times out', async () => {
    vi.useFakeTimers()
    const { room, send, deliver } = createFakeRoom()

    render(<DistractionPhase room={room} onComplete={vi.fn()} />)
    await serveQuestion(deliver, 3)

    for (let second = 0; second < 10; second += 1) {
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })
    }

    expect(send).toHaveBeenCalledWith('submitDistractionAnswer', {
      questionId: 3,
      answer: '',
    })
  })

  it('asks player-submitted questions first, then server questions', async () => {
    const { room, send, deliver } = createFakeRoom()

    render(
      <DistractionPhase
        room={room}
        playerQuestions={[
          {
            ownerSessionId: 'sam',
            questionIndex: 0,
            ownerName: 'Sam',
            prompt: 'My pet?',
            options: ['Cat', 'Dog', 'Fish', 'Bird'],
            score: 0,
          },
        ]}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByText('Sam: My pet?')).toBeInTheDocument()
    expect(send).not.toHaveBeenCalledWith('requestDistractionQuestion', {})

    answer('Dog')

    expect(send).toHaveBeenCalledWith('submitPlayerQuestionAnswer', {
      ownerSessionId: 'sam',
      questionIndex: 0,
      answerIndex: 1,
    })

    await deliver('player_question_result', {
      questionId: 'sam:0',
      correct: true,
      progress: progress(1, 1),
    })

    await finishMinigame()

    expect(send).toHaveBeenCalledWith('requestDistractionQuestion', {})
  })
})