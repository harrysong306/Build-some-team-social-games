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

    context.fillStyle = ''
    context.strokeStyle = ''
    context.lineWidth = 0
    context.lineCap = 'butt'
    context.lineJoin = 'miter'

    vi.spyOn(
      HTMLCanvasElement.prototype,
      'getContext',
    ).mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    )

    vi.spyOn(
      HTMLCanvasElement.prototype,
      'toBlob',
    ).mockImplementation((callback) => {
      const blob = new Blob(
        ['test-image'],
        { type: 'image/png' },
      )

      callback(blob)
    })

    Object.defineProperty(
      URL,
      'createObjectURL',
      {
        writable: true,
        value: vi.fn(() => 'blob:test-image'),
      },
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('saves the current drawing and moves to the next word', async () => {
    const onBack = vi.fn()
    const onComplete = vi.fn()

    render(
      <DrawingPhase
        words={['Apple', 'Tree']}
        drawingSpeed="normal"
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

    await waitFor(() => {
      expect(
        screen.getByText('Tree'),
      ).toBeInTheDocument()
    })

    expect(
      screen.getByText('Drawing 2 / 2'),
    ).toBeInTheDocument()

    expect(onComplete).not.toHaveBeenCalled()
  })

  it('lets the user choose a drawing colour', () => {
    const { container } = render(
      <DrawingPhase
        words={['Apple']}
        drawingSpeed="normal"
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />,
    )

    const blackButton =
      screen.getByRole('button', {
        name: /black drawing colour/i,
      })

    const blueButton =
      screen.getByRole('button', {
        name: /blue drawing colour/i,
      })

    expect(
      blackButton,
    ).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    expect(
      blueButton,
    ).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    fireEvent.click(blueButton)

    expect(
      blueButton,
    ).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    expect(
      blackButton,
    ).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    const canvas =
      container.querySelector('canvas')

    expect(canvas).not.toBeNull()

    if (!canvas) return

    vi.spyOn(
      canvas,
      'getBoundingClientRect',
    ).mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 900,
      bottom: 500,
      width: 900,
      height: 500,
      toJSON: () => {},
    })

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    })

    expect(
      context.fillStyle,
    ).toBe('#3b82f6')
  })

  it('lets the user draw with the line tool', () => {
    const { container } = render(
      <DrawingPhase
        words={['Apple']}
        drawingSpeed="normal"
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: /^line$/i,
      }),
    )

    const canvas =
      container.querySelector('canvas')

    expect(canvas).not.toBeNull()

    if (!canvas) return

    vi.spyOn(
      canvas,
      'getBoundingClientRect',
    ).mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 900,
      bottom: 500,
      width: 900,
      height: 500,
      toJSON: () => {},
    })

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    })

    fireEvent.pointerUp(canvas, {
      clientX: 200,
      clientY: 150,
      pointerId: 1,
    })

    expect(
      context.moveTo,
    ).toHaveBeenCalledWith(
      100,
      100,
    )

    expect(
      context.lineTo,
    ).toHaveBeenCalledWith(
      200,
      150,
    )

    expect(
      context.stroke,
    ).toHaveBeenCalled()
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
        drawingSpeed="normal"
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

  it('updates the drawing prompt and active grid cell after moving forward', async () => {
    render(
      <DrawingPhase
        words={['Apple', 'Tree']}
        drawingSpeed="normal"
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

    await waitFor(() => {
      expect(
        screen.getByText('Tree'),
      ).toBeInTheDocument()
    })

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

  it('hides the drawing board when the drawing phase finishes', async () => {
    const onComplete = vi.fn()

    const { container } = render(
      <DrawingPhase
        words={['Apple']}
        drawingSpeed="normal"
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

    await waitFor(() => {
      expect(
        screen.getByText(
          'Drawing phase complete',
        ),
      ).toBeInTheDocument()
    })

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

  it('automatically saves and finishes when the drawing timer reaches zero', async () => {
    vi.useFakeTimers()

    vi.spyOn(
      Math,
      'random',
    ).mockReturnValue(0)

    const onComplete = vi.fn()

    const { container } = render(
      <DrawingPhase
        words={['Apple']}
        drawingSpeed="hard"
        onBack={vi.fn()}
        onComplete={onComplete}
      />,
    )

    expect(
      screen.getByText('3s'),
    ).toBeInTheDocument()

    expect(
      container.querySelector('canvas'),
    ).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(3000)
      await Promise.resolve()
    })

    expect(
      screen.getByText(
        'Drawing phase complete',
      ),
    ).toBeInTheDocument()

    expect(
      container.querySelector('canvas'),
    ).not.toBeInTheDocument()

    expect(onComplete).not.toHaveBeenCalled()
  })
})