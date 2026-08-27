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

import RecallPhase from './RecallPhase'

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

    fireEvent.change(answerInput, {
      target: {
        value: 'Apple',
      },
    })

    expect(answerInput).toHaveValue('Apple')

    const checkButton =
      screen.getByRole('button', {
        name: /check answer/i,
      })

    expect(checkButton).toBeEnabled()

    fireEvent.click(checkButton)

    expect(answerInput).toBeDisabled()

    expect(
      screen.getByRole('button', {
        name: /next drawing/i,
      }),
    ).toBeInTheDocument()

    expect(onComplete).not.toHaveBeenCalled()
  })

  it('matches answers ignoring case and spaces and shows correct or incorrect feedback', () => {
    render(
      <RecallPhase
        drawings={[
          'data:image/png;base64,drawing-one',
          'data:image/png;base64,drawing-two',
        ]}
        words={['Apple', 'Tree']}
        onComplete={vi.fn()}
      />,
    )

    let answerInput =
      screen.getByPlaceholderText(
        /enter your answer/i,
      )

    fireEvent.change(answerInput, {
      target: {
        value: '  APPLE  ',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: /check answer/i,
      }),
    )

    expect(
      screen.getByText('Correct!'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /next drawing/i,
      }),
    )

    answerInput =
      screen.getByPlaceholderText(
        /enter your answer/i,
      )

    fireEvent.change(answerInput, {
      target: {
        value: 'Wrong answer',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: /check answer/i,
      }),
    )

    expect(
      screen.getByText('Not quite'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Tree'),
    ).toBeInTheDocument()
  })

  it('updates the score for correct answers and keeps it unchanged for incorrect answers', () => {
    render(
      <RecallPhase
        drawings={[
          'data:image/png;base64,drawing-one',
          'data:image/png;base64,drawing-two',
        ]}
        words={['Apple', 'Tree']}
        onComplete={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Score: 0'),
    ).toBeInTheDocument()

    let answerInput =
      screen.getByPlaceholderText(
        /enter your answer/i,
      )

    fireEvent.change(answerInput, {
      target: {
        value: 'Apple',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: /check answer/i,
      }),
    )

    expect(
      screen.getByText('Score: 1'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /next drawing/i,
      }),
    )

    expect(
      screen.getByText('Score: 1'),
    ).toBeInTheDocument()

    answerInput =
      screen.getByPlaceholderText(
        /enter your answer/i,
      )

    fireEvent.change(answerInput, {
      target: {
        value: 'Wrong answer',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: /check answer/i,
      }),
    )

    expect(
      screen.getByText('Score: 1'),
    ).toBeInTheDocument()
  })

  it('does not submit a blank recall answer', () => {
    const onComplete = vi.fn()

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
      screen.getByRole('button', {
        name: /check answer/i,
      })

    expect(checkButton).toBeDisabled()

    fireEvent.change(answerInput, {
      target: {
        value: '   ',
      },
    })

    expect(checkButton).toBeDisabled()

    fireEvent.keyDown(answerInput, {
      key: 'Enter',
      code: 'Enter',
    })

    expect(answerInput).toBeEnabled()

    expect(
      screen.queryByText('Correct!'),
    ).not.toBeInTheDocument()

    expect(
      screen.queryByText('Not quite'),
    ).not.toBeInTheDocument()

    expect(
      screen.queryByRole('button', {
        name: /view results/i,
      }),
    ).not.toBeInTheDocument()

    expect(onComplete).not.toHaveBeenCalled()
  })
})