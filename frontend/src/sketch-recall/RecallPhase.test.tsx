import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'

import type { Room } from '@colyseus/sdk'

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import RecallPhase from './RecallPhase'

function createMockRoom(
  sessionId = 'player-one',
) {
  const handlers =
    new Map<
      string,
      (message: any) => void
    >()

  const room = {
    sessionId,
    send: vi.fn(),
    onMessage: vi.fn(
      (
        type: string,
        callback: (
          message: any,
        ) => void,
      ) => {
        handlers.set(
          type,
          callback,
        )

        return () => {
          handlers.delete(type)
        }
      },
    ),
  } as unknown as Room

  const sendMessage = (
    type: string,
    message: any,
  ) => {
    const handler =
      handlers.get(type)

    if (!handler) {
      throw new Error(
        `No handler registered for ${type}`,
      )
    }

    act(() => {
      handler(message)
    })
  }

  return {
    room,
    sendMessage,
  }
}

describe('RecallPhase component tests', () => {
  it('allows the user to type and submit an answer', () => {
    const onComplete = vi.fn()

    render(
      <RecallPhase
        drawings={[
          'data:image/png;base64,drawing-one',
          'data:image/png;base64,drawing-two',
        ]}
        words={['Apple', 'Tree']}
        onComplete={onComplete}
      />,
    )

    const answerInput =
      screen.getByPlaceholderText(
        /enter your answer/i,
      )

    fireEvent.change(
      answerInput,
      {
        target: {
          value: 'Apple',
        },
      },
    )

    expect(
      answerInput,
    ).toHaveValue(
      'Apple',
    )

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: /check answer/i,
        },
      ),
    )

    expect(
      answerInput,
    ).toBeDisabled()

    expect(
      screen.getByText(
        'Correct! +4/4',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Score: 4 / 8',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByRole(
        'button',
        {
          name: /next drawing/i,
        },
      ),
    ).toBeInTheDocument()

    expect(
      onComplete,
    ).not.toHaveBeenCalled()
  })

  it('awards full marks ignoring case and spaces', () => {
    render(
      <RecallPhase
        drawings={[
          'data:image/png;base64,drawing-one',
        ]}
        words={['Apple']}
        onComplete={vi.fn()}
      />,
    )

    const answerInput =
      screen.getByPlaceholderText(
        /enter your answer/i,
      )

    fireEvent.change(
      answerInput,
      {
        target: {
          value:
            '  APPLE  ',
        },
      },
    )

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: /check answer/i,
        },
      ),
    )

    expect(
      screen.getByText(
        'Correct! +4/4',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Score: 4 / 4',
      ),
    ).toBeInTheDocument()
  })

  it('awards partial marks for a close answer', () => {
    render(
      <RecallPhase
        drawings={[
          'data:image/png;base64,drawing-one',
        ]}
        words={['Cake']}
        onComplete={vi.fn()}
      />,
    )

    const answerInput =
      screen.getByPlaceholderText(
        /enter your answer/i,
      )

    fireEvent.change(
      answerInput,
      {
        target: {
          value: 'Kake',
        },
      },
    )

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: /check answer/i,
        },
      ),
    )

    expect(
      screen.getByText(
        'Close! +3/4',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Score: 3 / 4',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Cake',
      ),
    ).toBeInTheDocument()
  })

  it('awards fewer partial marks for a more noticeable spelling mistake', () => {
    render(
      <RecallPhase
        drawings={[
          'data:image/png;base64,drawing-one',
        ]}
        words={['Cake']}
        onComplete={vi.fn()}
      />,
    )

    const answerInput =
      screen.getByPlaceholderText(
        /enter your answer/i,
      )

    fireEvent.change(
      answerInput,
      {
        target: {
          value: 'Kacke',
        },
      },
    )

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: /check answer/i,
        },
      ),
    )

    expect(
      screen.getByText(
        'Close! +2/4',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Score: 2 / 4',
      ),
    ).toBeInTheDocument()
  })

  it('submits a partial-credit answer when Enter is pressed', () => {
    render(
      <RecallPhase
        drawings={[
          'data:image/png;base64,drawing-one',
        ]}
        words={['Cake']}
        onComplete={vi.fn()}
      />,
    )

    const answerInput =
      screen.getByPlaceholderText(
        /enter your answer/i,
      )

    fireEvent.change(
      answerInput,
      {
        target: {
          value: 'Kake',
        },
      },
    )

    fireEvent.keyDown(
      answerInput,
      {
        key: 'Enter',
        code: 'Enter',
      },
    )

    expect(
      screen.getByText(
        'Close! +3/4',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Score: 3 / 4',
      ),
    ).toBeInTheDocument()
  })

  it('awards zero marks for an unrelated answer', () => {
    render(
      <RecallPhase
        drawings={[
          'data:image/png;base64,drawing-one',
        ]}
        words={['Cake']}
        onComplete={vi.fn()}
      />,
    )

    const answerInput =
      screen.getByPlaceholderText(
        /enter your answer/i,
      )

    fireEvent.change(
      answerInput,
      {
        target: {
          value: 'Dog',
        },
      },
    )

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: /check answer/i,
        },
      ),
    )

    expect(
      screen.getByText(
        'Not quite',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Score: 0 / 4',
      ),
    ).toBeInTheDocument()
  })

  it('keeps the accumulated score across drawings', () => {
    const onComplete =
      vi.fn()

    render(
      <RecallPhase
        drawings={[
          'data:image/png;base64,drawing-one',
          'data:image/png;base64,drawing-two',
        ]}
        words={[
          'Cake',
          'Tree',
        ]}
        onComplete={onComplete}
      />,
    )

    let answerInput =
      screen.getByPlaceholderText(
        /enter your answer/i,
      )

    fireEvent.change(
      answerInput,
      {
        target: {
          value: 'Cake',
        },
      },
    )

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: /check answer/i,
        },
      ),
    )

    expect(
      screen.getByText(
        'Score: 4 / 8',
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: /next drawing/i,
        },
      ),
    )

    answerInput =
      screen.getByPlaceholderText(
        /enter your answer/i,
      )

    fireEvent.change(
      answerInput,
      {
        target: {
          value: 'Dog',
        },
      },
    )

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: /check answer/i,
        },
      ),
    )

    expect(
      screen.getByText(
        'Score: 4 / 8',
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: /view results/i,
        },
      ),
    )

    expect(
      onComplete,
    ).toHaveBeenCalledWith(
      4,
    )
  })

  it('combines partial marks from several drawings', () => {
    const onComplete =
      vi.fn()

    render(
      <RecallPhase
        drawings={[
          'data:image/png;base64,drawing-one',
          'data:image/png;base64,drawing-two',
          'data:image/png;base64,drawing-three',
        ]}
        words={[
          'Cake',
          'Cake',
          'Cake',
        ]}
        onComplete={onComplete}
      />,
    )

    const submitAnswer = (
      value: string,
    ) => {
      const answerInput =
        screen.getByPlaceholderText(
          /enter your answer/i,
        )

      fireEvent.change(
        answerInput,
        {
          target: {
            value,
          },
        },
      )

      fireEvent.click(
        screen.getByRole(
          'button',
          {
            name:
              /check answer/i,
          },
        ),
      )
    }

    submitAnswer('Kake')

    expect(
      screen.getByText(
        'Score: 3 / 12',
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: /next drawing/i,
        },
      ),
    )

    submitAnswer('Kacke')

    expect(
      screen.getByText(
        'Score: 5 / 12',
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: /next drawing/i,
        },
      ),
    )

    submitAnswer('Cake')

    expect(
      screen.getByText(
        'Score: 9 / 12',
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole(
        'button',
        {
          name: /view results/i,
        },
      ),
    )

    expect(
      onComplete,
    ).toHaveBeenCalledWith(
      9,
    )
  })

  it('does not submit a blank recall answer', () => {
    const onComplete =
      vi.fn()

    render(
      <RecallPhase
        drawings={[
          'data:image/png;base64,drawing-one',
        ]}
        words={['Apple']}
        onComplete={onComplete}
      />,
    )

    const answerInput =
      screen.getByPlaceholderText(
        /enter your answer/i,
      )

    const checkButton =
      screen.getByRole(
        'button',
        {
          name: /check answer/i,
        },
      )

    expect(
      checkButton,
    ).toBeDisabled()

    fireEvent.change(
      answerInput,
      {
        target: {
          value: '   ',
        },
      },
    )

    expect(
      checkButton,
    ).toBeDisabled()

    fireEvent.keyDown(
      answerInput,
      {
        key: 'Enter',
        code: 'Enter',
      },
    )

    expect(
      answerInput,
    ).toBeEnabled()

    expect(
      screen.queryByText(
        /correct!/i,
      ),
    ).not.toBeInTheDocument()

    expect(
      screen.queryByText(
        /close!/i,
      ),
    ).not.toBeInTheDocument()

    expect(
      screen.queryByText(
        'Not quite',
      ),
    ).not.toBeInTheDocument()

    expect(
      onComplete,
    ).not.toHaveBeenCalled()
  })

  it('shows four-mark multiplayer scores and ranks current standings by total score', () => {
    const {
      room,
      sendMessage,
    } = createMockRoom(
      'player-one',
    )

    render(
      <RecallPhase
        room={room}
        drawings={[
          'data:image/png;base64,drawing-one',
        ]}
        words={['Apple']}
        onComplete={vi.fn()}
      />,
    )

    sendMessage(
      'recallRoundResult',
      {
        roundIndex: 0,
        correctWord:
          'Apple',
        results: [
          {
            sessionId:
              'player-one',
            playerName:
              'Jordan',
            answer: 'Aple',
            rank: 2,
            timedOut: false,
            pointsEarned: 3,
            totalScore: 7,
          },
          {
            sessionId:
              'player-two',
            playerName:
              'Sam',
            answer: 'Apple',
            rank: 1,
            timedOut: false,
            pointsEarned: 4,
            totalScore: 6,
          },
          {
            sessionId:
              'player-three',
            playerName:
              'Alex',
            answer: '',
            rank: null,
            timedOut: true,
            pointsEarned: 0,
            totalScore: 2,
          },
        ],
      },
    )

    expect(
      screen.getByText(
        'You ranked #2',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        /Correct word:/i,
      ),
    ).toHaveTextContent(
      'Apple',
    )

    expect(
      screen.getAllByText(
        /\+3\/4/i,
      ).length,
    ).toBeGreaterThan(0)

    expect(
      screen.getByText(
        /Total:\s*7/i,
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByRole(
        'heading',
        {
          name:
            /round rankings/i,
        },
      ),
    ).toBeInTheDocument()

    const standingsHeading =
      screen.getByRole(
        'heading',
        {
          name:
            /current standings/i,
        },
      )

    const standingsSection =
      standingsHeading.closest(
        'section',
      )

    expect(
      standingsSection,
    ).not.toBeNull()

    const standings =
      within(
        standingsSection as HTMLElement,
      )

    expect(
      standings.getByText(
        '7 pts',
      ),
    ).toBeInTheDocument()

    expect(
      standings.getByText(
        '6 pts',
      ),
    ).toBeInTheDocument()

    expect(
      standings.getByText(
        '2 pts',
      ),
    ).toBeInTheDocument()

    const standingsText =
      standingsSection
        ?.textContent ??
      ''

    /*
     * Jordan had round rank #2,
     * but has the highest total.
     *
     * Current standings therefore
     * rank Jordan above Sam.
     */
    expect(
      standingsText.indexOf(
        'Jordan',
      ),
    ).toBeLessThan(
      standingsText.indexOf(
        'Sam',
      ),
    )

    expect(
      standingsText.indexOf(
        'Sam',
      ),
    ).toBeLessThan(
      standingsText.indexOf(
        'Alex',
      ),
    )
  })

  it('shows zero out of four when the player times out', () => {
    const {
      room,
      sendMessage,
    } = createMockRoom(
      'player-one',
    )

    render(
      <RecallPhase
        room={room}
        drawings={[
          'data:image/png;base64,drawing-one',
        ]}
        words={['Apple']}
        onComplete={vi.fn()}
      />,
    )

    sendMessage(
      'recallRoundResult',
      {
        roundIndex: 0,
        correctWord:
          'Apple',
        results: [
          {
            sessionId:
              'player-one',
            playerName:
              'Jordan',
            answer: '',
            rank: null,
            timedOut: true,
            pointsEarned: 0,
            totalScore: 3,
          },
        ],
      },
    )

    expect(
      screen.getByText(
        'Time is up',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getAllByText(
        /\+0\/4/i,
      ).length,
    ).toBeGreaterThan(0)

    expect(
      screen.getByText(
        /Total:\s*3/i,
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Timed out',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        '3 pts',
      ),
    ).toBeInTheDocument()
  })
})