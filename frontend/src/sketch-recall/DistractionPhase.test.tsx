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

import DistractionPhase from './DistractionPhase'

describe('DistractionPhase component tests', () => {
  it('allows the user to select an answer', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    render(
      <DistractionPhase
        onComplete={vi.fn()}
      />,
    )

    const nextButton =
      screen.getByRole('button', {
        name: /next question/i,
      })

    expect(nextButton).toBeDisabled()

    const answerButtons =
      screen.getAllByRole('button')
        .filter(
          (button) =>
            button !== nextButton,
        )

    expect(answerButtons.length).toBe(4)

    fireEvent.click(answerButtons[0])

    expect(
      answerButtons[0],
    ).toHaveClass(
      'border-amber-400',
    )

    expect(nextButton).toBeEnabled()
  })
})