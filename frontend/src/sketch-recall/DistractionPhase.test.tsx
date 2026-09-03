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

    const submitButton =
      screen.getByRole('button', {
        name: /submit answer/i,
      })

    expect(submitButton).toBeDisabled()

    const answerButtons =
      screen.getAllByRole('button')
        .filter(
          (button) =>
            button !== submitButton,
        )

    expect(answerButtons.length).toBe(4)

    fireEvent.click(answerButtons[0])

    expect(
      answerButtons[0],
    ).toHaveClass(
      'border-amber-400',
    )

    expect(submitButton).toBeEnabled()
  })
})