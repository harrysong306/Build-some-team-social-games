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

    fireEvent.click(
      screen.getByRole('button', {
        name: /check answer/i,
      }),
    )

    expect(answerInput).toBeDisabled()

    expect(
      screen.getByText('Correct! +4/4'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Score: 4 / 8'),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: /next drawing/i,
      }),
    ).toBeInTheDocument()

    expect(onComplete).not.toHaveBeenCalled()
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
      screen.getByText('Correct! +4/4'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Score: 4 / 4'),
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

    fireEvent.change(answerInput, {
      target: {
        value: 'Kake',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: /check answer/i,
      }),
    )

    expect(
      screen.getByText('Close! +3/4'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Score: 3 / 4'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Cake'),
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

    fireEvent.change(answerInput, {
      target: {
        value: 'Dog',
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
      screen.getByText('Score: 0 / 4'),
    ).toBeInTheDocument()
  })

  it('keeps the accumulated score across drawings', () => {
    const onComplete = vi.fn()

    render(
      <RecallPhase
        drawings={[
          'data:image/png;base64,drawing-one',
          'data:image/png;base64,drawing-two',
        ]}
        words={['Cake', 'Tree']}
        onComplete={onComplete}
      />,
    )

    let answerInput =
      screen.getByPlaceholderText(
        /enter your answer/i,
      )

    fireEvent.change(answerInput, {
      target: {
        value: 'Cake',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: /check answer/i,
      }),
    )

    expect(
      screen.getByText('Score: 4 / 8'),
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
        value: 'Dog',
      },
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: /check answer/i,
      }),
    )

    expect(
      screen.getByText('Score: 4 / 8'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /view results/i,
      }),
    )

    expect(onComplete).toHaveBeenCalledWith(4)
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
      screen.queryByText(/correct!/i),
    ).not.toBeInTheDocument()

    expect(
      screen.queryByText(/close!/i),
    ).not.toBeInTheDocument()

    expect(
      screen.queryByText('Not quite'),
    ).not.toBeInTheDocument()

    expect(onComplete).not.toHaveBeenCalled()
  })
})