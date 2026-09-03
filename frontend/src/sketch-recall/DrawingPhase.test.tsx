import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import DrawingPhase from './DrawingPhase'

describe('DrawingPhase component tests', () => {
  const context = {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),

    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: 'butt',
    lineJoin: 'miter',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(
      HTMLCanvasElement.prototype,
      'getContext',
    ).mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    )

    vi.spyOn(
      HTMLCanvasElement.prototype,
      'toDataURL',
    ).mockReturnValue(
      'data:image/png;base64,test-image',
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('saves the current drawing and moves to the next word', () => {
    const onBack = vi.fn()
    const onComplete = vi.fn()

    render(
      <DrawingPhase
        words={['Apple', 'Tree']}
        onBack={onBack}
        onComplete={onComplete}
      />,
    )

    expect(
      screen.getByText('Apple'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Drawing 1 / 2'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /save & next/i,
      }),
    )

    expect(
      HTMLCanvasElement.prototype.toDataURL,
    ).toHaveBeenCalledTimes(1)

    expect(
      screen.getByText('Tree'),
    ).toBeInTheDocument()

    expect(
      screen.getByText('Drawing 2 / 2'),
    ).toBeInTheDocument()

    expect(onComplete).not.toHaveBeenCalled()
  })

  it('counts the drawing timer down every second', () => {
    vi.useFakeTimers()

    vi.spyOn(
      Math,
      'random',
    ).mockReturnValue(0.99)

    render(
      <DrawingPhase
        words={['Apple', 'Tree']}
        onBack={vi.fn()}
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

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(
      screen.getByText('7s'),
    ).toBeInTheDocument()
  })

  it('updates the drawing prompt and active grid cell after moving forward', () => {
    render(
      <DrawingPhase
        words={['Apple', 'Tree']}
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Apple'),
    ).toBeInTheDocument()

    const firstGridNumber =
      screen.getByText('1')

    expect(
      firstGridNumber.parentElement,
    ).toHaveClass(
      'border-amber-400',
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: /save & next/i,
      }),
    )

    expect(
      screen.getByText('Tree'),
    ).toBeInTheDocument()

    expect(
      screen.queryByText('Apple'),
    ).not.toBeInTheDocument()

    const secondGridNumber =
      screen.getByText('2')

    expect(
      secondGridNumber.parentElement,
    ).toHaveClass(
      'border-amber-400',
    )

    expect(
      screen.getByAltText('Drawing 1'),
    ).toBeInTheDocument()

    expect(
      screen.getByAltText('Drawing 1')
        .parentElement,
    ).not.toHaveClass(
      'border-amber-400',
    )
  })

  it('hides the drawing board when the drawing phase finishes', () => {
    const onComplete = vi.fn()

    const { container } = render(
      <DrawingPhase
        words={['Apple']}
        onBack={vi.fn()}
        onComplete={onComplete}
      />,
    )

    expect(
      container.querySelector('canvas'),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: /save & next/i,
      }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /save & next/i,
      }),
    )

    expect(
      screen.getByText(
        'Drawing phase complete',
      ),
    ).toBeInTheDocument()

    expect(
      container.querySelector('canvas'),
    ).not.toBeInTheDocument()

    expect(
      screen.queryByRole('button', {
        name: /save & next/i,
      }),
    ).not.toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: /continue/i,
      }),
    ).toBeInTheDocument()

    expect(onComplete).not.toHaveBeenCalled()
  })
})