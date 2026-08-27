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

import ResultsScreen from './ResultsScreen'

describe('ResultsScreen component tests', () => {
  it('shows the final score and result information', () => {
    const onPlayAgain = vi.fn()
    const onExit = vi.fn()

    render(
      <ResultsScreen
        score={3}
        total={5}
        onPlayAgain={onPlayAgain}
        onExit={onExit}
      />,
    )

    expect(
      screen.getByText('Great job!'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('3'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('out of 5'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('60%'),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: /play again/i,
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: /back to games/i,
      }),
    ).toBeInTheDocument()
  })

  it('calls the result screen actions', () => {
    const onPlayAgain = vi.fn()
    const onExit = vi.fn()

    render(
      <ResultsScreen
        score={5}
        total={5}
        onPlayAgain={onPlayAgain}
        onExit={onExit}
      />,
    )

    expect(
      screen.getByText('Perfect memory!'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /play again/i,
      }),
    )

    expect(
      onPlayAgain,
    ).toHaveBeenCalledTimes(1)

    fireEvent.click(
      screen.getByRole('button', {
        name: /back to games/i,
      }),
    )

    expect(
      onExit,
    ).toHaveBeenCalledTimes(1)
  })
})