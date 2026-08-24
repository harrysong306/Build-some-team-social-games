import { createRef } from 'react'

import {
  fireEvent,
  render,
} from '@testing-library/react'

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import DrawingCanvas, {
  type DrawingCanvasHandle,
} from './DrawingCanvas'

describe('FE-49 DrawingCanvas controls', () => {
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

  it('renders and prepares the drawing canvas', () => {
    const { container } = render(
      <DrawingCanvas
        tool="brush"
        brushSize={8}
      />,
    )

    const canvas =
      container.querySelector('canvas')

    expect(canvas).toBeInTheDocument()

    expect(canvas).toHaveAttribute(
      'width',
      '900',
    )

    expect(canvas).toHaveAttribute(
      'height',
      '500',
    )

    expect(
      context.fillRect,
    ).toHaveBeenCalledWith(
      0,
      0,
      900,
      500,
    )
  })

  it('allows the user to draw with the brush', () => {
    const { container } = render(
      <DrawingCanvas
        tool="brush"
        brushSize={8}
      />,
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
      clientX: 90,
      clientY: 50,
      pointerId: 1,
    })

    expect(
      context.beginPath,
    ).toHaveBeenCalled()

    expect(context.fill).toHaveBeenCalled()

    expect(context.fillStyle).toBe(
      '#25150b',
    )

    fireEvent.pointerMove(canvas, {
      clientX: 180,
      clientY: 100,
      pointerId: 1,
    })

    expect(
      context.stroke,
    ).toHaveBeenCalledTimes(1)

    expect(context.strokeStyle).toBe(
      '#25150b',
    )

    fireEvent.pointerUp(canvas, {
      pointerId: 1,
    })

    fireEvent.pointerMove(canvas, {
      clientX: 250,
      clientY: 150,
      pointerId: 1,
    })

    expect(
      context.stroke,
    ).toHaveBeenCalledTimes(1)
  })

  it('returns the drawing as an image', () => {
    const ref =
      createRef<DrawingCanvasHandle>()

    render(
      <DrawingCanvas
        ref={ref}
        tool="brush"
        brushSize={8}
      />,
    )

    const image =
      ref.current?.getImage()

    expect(image).toBe(
      'data:image/png;base64,test-image',
    )
  })
})