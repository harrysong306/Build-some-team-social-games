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

vi.mock('./DistractionQuestions', () => ({
  distractionQuestions: [
    {
      question: 'Question 1',
      options: [
        'Correct 1',
        'Wrong 1A',
        'Wrong 1B',
        'Wrong 1C',
      ],
      answer: 'Correct 1',
    },
    {
      question: 'Question 2',
      options: [
        'Correct 2',
        'Wrong 2A',
        'Wrong 2B',
        'Wrong 2C',
      ],
      answer: 'Correct 2',
    },
    {
      question: 'Question 3',
      options: [
        'Correct 3',
        'Wrong 3A',
        'Wrong 3B',
        'Wrong 3C',
      ],
      answer: 'Correct 3',
    },
    {
      question: 'Question 4',
      options: [
        'Correct 4',
        'Wrong 4A',
        'Wrong 4B',
        'Wrong 4C',
      ],
      answer: 'Correct 4',
    },
    {
      question: 'Question 5',
      options: [
        'Correct 5',
        'Wrong 5A',
        'Wrong 5B',
        'Wrong 5C',
      ],
      answer: 'Correct 5',
    },
    {
      question: 'Question 6',
      options: [
        'Correct 6',
        'Wrong 6A',
        'Wrong 6B',
        'Wrong 6C',
      ],
      answer: 'Correct 6',
    },
  ],
}))

import DistractionPhase from './DistractionPhase'

describe('DistractionPhase component tests', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const submitAnswer = () => {
    fireEvent.click(
      screen.getByRole('button', {
        name: /submit answer/i,
      }),
    )
  }

  const answerCorrectly = () => {
    fireEvent.click(
      screen.getByRole('button', {
        name: /^correct \d$/i,
      }),
    )

    submitAnswer()
  }

  const answerIncorrectly = () => {
    fireEvent.click(
      screen.getAllByRole('button', {
        name: /^wrong/i,
      })[0],
    )

    submitAnswer()
  }

  it('allows the user to select an answer', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    render(
      <DistractionPhase
        onComplete={vi.fn()}
      />,
    )

    const submitButton =
      screen.getByRole('button', {
        name: /submit answer/i,
      })

    expect(submitButton).toBeDisabled()

    const correctAnswer =
      screen.getByRole('button', {
        name: /^correct \d$/i,
      })

    fireEvent.click(correctAnswer)

    expect(correctAnswer).toHaveClass(
      'border-amber-400',
    )

    expect(submitButton).toBeEnabled()
  })

  it('counts down and treats a timeout as an incorrect answer', () => {
    vi.useFakeTimers()

    vi.spyOn(Math, 'random').mockReturnValue(0)

    render(
      <DistractionPhase
        onComplete={vi.fn()}
      />,
    )

    expect(
      screen.getByText('10s'),
    ).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(
      screen.getByText('9s'),
    ).toBeInTheDocument()

    for (let second = 0; second < 9; second += 1) {
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    }

    expect(
      screen.getByText('Question 2 of 5'),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Correct: 0 / 3 required',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText('10s'),
    ).toBeInTheDocument()
  })

  it('updates the score for correct and incorrect answers', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    render(
      <DistractionPhase
        onComplete={vi.fn()}
      />,
    )

    answerCorrectly()

    expect(
      screen.getByText(
        'Correct: 1 / 3 required',
      ),
    ).toBeInTheDocument()

    answerIncorrectly()

    expect(
      screen.getByText(
        'Correct: 1 / 3 required',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Question 3 of 5'),
    ).toBeInTheDocument()
  })

  it('finishes after five questions when three answers are correct', () => {
    const onComplete = vi.fn()

    vi.spyOn(Math, 'random').mockReturnValue(0)

    render(
      <DistractionPhase
        onComplete={onComplete}
      />,
    )

    answerCorrectly()
    answerCorrectly()
    answerCorrectly()
    answerIncorrectly()
    answerIncorrectly()

    expect(
      screen.getByText(
        'Distraction Complete',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'You answered 3 out of 5 questions correctly.',
      ),
    ).toBeInTheDocument()

    expect(onComplete).not.toHaveBeenCalled()

    fireEvent.click(
      screen.getByRole('button', {
        name: /start recall/i,
      }),
    )

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('continues with replacement questions until three answers are correct', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    render(
      <DistractionPhase
        onComplete={vi.fn()}
      />,
    )

    answerCorrectly()
    answerCorrectly()
    answerIncorrectly()
    answerIncorrectly()
    answerIncorrectly()

    expect(
      screen.getByText(
        'Replacement Question',
      ),
    ).toBeInTheDocument()

    expect(
      screen.queryByText(
        'Distraction Complete',
      ),
    ).not.toBeInTheDocument()

    expect(
      screen.getByText(
        'Correct: 2 / 3 required',
      ),
    ).toBeInTheDocument()

    answerCorrectly()

    expect(
      screen.getByText(
        'Distraction Complete',
      ),
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'You answered 3 out of 6 questions correctly.',
      ),
    ).toBeInTheDocument()
  })
})