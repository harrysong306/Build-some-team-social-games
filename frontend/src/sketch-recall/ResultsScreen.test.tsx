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
    render(
      <ResultsScreen
        score={3}
        total={5}
        onPlayAgain={vi.fn()}
        onExit={vi.fn()}
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
  })

  it('shows the correct message for different result percentages', () => {
    const { rerender } = render(
      <ResultsScreen
        score={5}
        total={5}
        onPlayAgain={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Perfect memory!'),
    ).toBeInTheDocument()

    rerender(
      <ResultsScreen
        score={2}
        total={5}
        onPlayAgain={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Nice try!'),
    ).toBeInTheDocument()

    rerender(
      <ResultsScreen
        score={1}
        total={5}
        onPlayAgain={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Keep practising!'),
    ).toBeInTheDocument()
  })

  it('handles a zero total safely', () => {
    render(
      <ResultsScreen
        score={0}
        total={0}
        onPlayAgain={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(
      screen.getByText('0%'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('out of 0'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Keep practising!'),
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