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

describe('DrawingCanvas component tests', () => {
  const context = {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),

    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: 'butt',
    lineJoin: 'miter',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    context.getImageData.mockReset()
    context.putImageData.mockReset()

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
      'toDataURL',
    ).mockReturnValue(
      'data:image/png;base64,test-image',
    )
  })

  const mockCanvasRect = (
    canvas: HTMLCanvasElement,
    width = 900,
    height = 500,
  ) => {
    vi.spyOn(
      canvas,
      'getBoundingClientRect',
    ).mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON: () => {},
    })
  }

  it('renders and prepares the drawing canvas', () => {
    const { container } = render(
      <DrawingCanvas
        tool="brush"
        brushSize={8}
        color="#25150b"
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
        color="#25150b"
      />,
    )

    const canvas =
      container.querySelector('canvas')

    expect(canvas).not.toBeNull()

    if (!canvas) return

    mockCanvasRect(canvas)

    fireEvent.pointerDown(canvas, {
      clientX: 90,
      clientY: 50,
      pointerId: 1,
    })

    expect(
      context.beginPath,
    ).toHaveBeenCalled()

    expect(
      context.fill,
    ).toHaveBeenCalled()

    expect(
      context.fillStyle,
    ).toBe('#25150b')

    fireEvent.pointerMove(canvas, {
      clientX: 180,
      clientY: 100,
      pointerId: 1,
    })

    expect(
      context.stroke,
    ).toHaveBeenCalledTimes(1)

    expect(
      context.strokeStyle,
    ).toBe('#25150b')

    fireEvent.pointerUp(canvas, {
      clientX: 180,
      clientY: 100,
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

  it('uses the selected drawing colour for brush marks', () => {
    const { container } = render(
      <DrawingCanvas
        tool="brush"
        brushSize={8}
        color="#3b82f6"
      />,
    )

    const canvas =
      container.querySelector('canvas')

    expect(canvas).not.toBeNull()

    if (!canvas) return

    mockCanvasRect(canvas)

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    })

    expect(
      context.fillStyle,
    ).toBe('#3b82f6')

    fireEvent.pointerMove(canvas, {
      clientX: 150,
      clientY: 150,
      pointerId: 1,
    })

    expect(
      context.strokeStyle,
    ).toBe('#3b82f6')
  })

  it('draws a straight line from pointer down to pointer up', () => {
    const { container } = render(
      <DrawingCanvas
        tool="line"
        brushSize={12}
        color="#ef4444"
      />,
    )

    const canvas =
      container.querySelector('canvas')

    expect(canvas).not.toBeNull()

    if (!canvas) return

    mockCanvasRect(canvas)

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    })

    fireEvent.pointerMove(canvas, {
      clientX: 150,
      clientY: 125,
      pointerId: 1,
    })

    expect(
      context.stroke,
    ).not.toHaveBeenCalled()

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
      context.strokeStyle,
    ).toBe('#ef4444')

    expect(
      context.lineWidth,
    ).toBe(12)

    expect(
      context.stroke,
    ).toHaveBeenCalledTimes(1)
  })

  it('draws a rectangle from pointer down to pointer up', () => {
    const { container } = render(
      <DrawingCanvas
        tool="rectangle"
        brushSize={10}
        color="#22c55e"
      />,
    )

    const canvas =
      container.querySelector('canvas')

    expect(canvas).not.toBeNull()

    if (!canvas) return

    mockCanvasRect(canvas)

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 80,
      pointerId: 1,
    })

    fireEvent.pointerUp(canvas, {
      clientX: 300,
      clientY: 200,
      pointerId: 1,
    })

    expect(
      context.rect,
    ).toHaveBeenCalledWith(
      100,
      80,
      200,
      120,
    )

    expect(
      context.strokeStyle,
    ).toBe('#22c55e')

    expect(
      context.lineWidth,
    ).toBe(10)

    expect(
      context.stroke,
    ).toHaveBeenCalledTimes(1)
  })

  it('draws a circle using the drag distance as its diameter', () => {
    const { container } = render(
      <DrawingCanvas
        tool="circle"
        brushSize={6}
        color="#a855f7"
      />,
    )

    const canvas =
      container.querySelector('canvas')

    expect(canvas).not.toBeNull()

    if (!canvas) return

    mockCanvasRect(canvas)

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    })

    fireEvent.pointerUp(canvas, {
      clientX: 200,
      clientY: 100,
      pointerId: 1,
    })

    expect(
      context.arc,
    ).toHaveBeenCalledWith(
      150,
      100,
      50,
      0,
      Math.PI * 2,
    )

    expect(
      context.strokeStyle,
    ).toBe('#a855f7')

    expect(
      context.lineWidth,
    ).toBe(6)

    expect(
      context.stroke,
    ).toHaveBeenCalledTimes(1)
  })

  it('fills only the connected area with the selected colour', () => {
    const imageData = {
      width: 3,
      height: 1,
      data: new Uint8ClampedArray([
        255, 253, 247, 255,
        37, 21, 11, 255,
        255, 253, 247, 255,
      ]),
    } as ImageData

    context.getImageData.mockReturnValue(
      imageData,
    )

    const { container } = render(
      <DrawingCanvas
        tool="fill"
        brushSize={8}
        color="#3b82f6"
      />,
    )

    const canvas =
      container.querySelector('canvas')

    expect(canvas).not.toBeNull()

    if (!canvas) return

    mockCanvasRect(canvas)

    fireEvent.pointerDown(canvas, {
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    })

    expect(
      context.getImageData,
    ).toHaveBeenCalledWith(
      0,
      0,
      900,
      500,
    )

    expect(
      [...imageData.data],
    ).toEqual([
      59, 130, 246, 255,
      37, 21, 11, 255,
      255, 253, 247, 255,
    ])

    expect(
      context.putImageData,
    ).toHaveBeenCalledWith(
      imageData,
      0,
      0,
    )
  })

  it('returns the drawing as saved drawing data', async () => {
    const ref =
      createRef<DrawingCanvasHandle>()

    const blob = new Blob(
      [new Uint8Array([1, 2, 3])],
      { type: 'image/png' },
    )

    vi.spyOn(
      HTMLCanvasElement.prototype,
      'toBlob',
    ).mockImplementation((callback) => {
      callback(blob)
    })

    vi.spyOn(
      URL,
      'createObjectURL',
    ).mockReturnValue('blob:test-image')

    render(
      <DrawingCanvas
        ref={ref}
        tool="brush"
        brushSize={8}
        color="#25150b"
      />,
    )

    const drawing =
      await ref.current?.getDrawing()

    expect(drawing).toEqual(
      {
        bytes: new Uint8Array([1, 2, 3]),
        url: 'blob:test-image',
      },
    )
  })

  it('uses the eraser to remove drawing strokes', () => {
    const { container } = render(
      <DrawingCanvas
        tool="eraser"
        brushSize={8}
        color="#3b82f6"
      />,
    )

    const canvas =
      container.querySelector('canvas')

    expect(canvas).not.toBeNull()

    if (!canvas) return

    mockCanvasRect(canvas)

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    })

    expect(
      context.fillStyle,
    ).toBe('#fffdf7')

    fireEvent.pointerMove(canvas, {
      clientX: 150,
      clientY: 150,
      pointerId: 1,
    })

    expect(
      context.strokeStyle,
    ).toBe('#fffdf7')

    expect(
      context.stroke,
    ).toHaveBeenCalled()
  })

  it('clears the drawing canvas', () => {
    const ref =
      createRef<DrawingCanvasHandle>()

    render(
      <DrawingCanvas
        ref={ref}
        tool="brush"
        brushSize={8}
        color="#25150b"
      />,
    )

    vi.clearAllMocks()

    ref.current?.clear()

    expect(
      context.fillStyle,
    ).toBe('#fffdf7')

    expect(
      context.fillRect,
    ).toHaveBeenCalledWith(
      0,
      0,
      900,
      500,
    )

    expect(
      context.fillRect,
    ).toHaveBeenCalledTimes(1)
  })

  it('uses the selected brush size for drawing', () => {
    const { container } = render(
      <DrawingCanvas
        tool="brush"
        brushSize={20}
        color="#25150b"
      />,
    )

    const canvas =
      container.querySelector('canvas')

    expect(canvas).not.toBeNull()

    if (!canvas) return

    mockCanvasRect(canvas)

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    })

    expect(
      context.arc,
    ).toHaveBeenCalledWith(
      100,
      100,
      10,
      0,
      Math.PI * 2,
    )

    fireEvent.pointerMove(canvas, {
      clientX: 200,
      clientY: 150,
      pointerId: 1,
    })

    expect(
      context.lineWidth,
    ).toBe(20)
  })

  it('scales pointer position to the canvas size', () => {
    const { container } = render(
      <DrawingCanvas
        tool="brush"
        brushSize={8}
        color="#25150b"
      />,
    )

    const canvas =
      container.querySelector('canvas')

    expect(canvas).not.toBeNull()

    if (!canvas) return

    mockCanvasRect(
      canvas,
      450,
      250,
    )

    fireEvent.pointerDown(canvas, {
      clientX: 45,
      clientY: 25,
      pointerId: 1,
    })

    expect(
      context.arc,
    ).toHaveBeenCalledWith(
      90,
      50,
      4,
      0,
      Math.PI * 2,
    )

    fireEvent.pointerMove(canvas, {
      clientX: 90,
      clientY: 50,
      pointerId: 1,
    })

    expect(
      context.lineTo,
    ).toHaveBeenCalledWith(
      180,
      100,
    )
  })
})