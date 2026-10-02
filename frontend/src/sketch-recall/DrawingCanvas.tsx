import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'


// bytes sent to colyseus, url is for local
export type SavedDrawing = {
  bytes: Uint8Array
  url: string
}

export type DrawingCanvasHandle = {
  clear: (saveForUndo?: boolean) => void
  undo: () => void
  getDrawing: () => Promise<SavedDrawing | null>
}

export type DrawingTool =
  | 'brush'
  | 'eraser'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'fill'

type DrawingCanvasProps = {
  tool: DrawingTool
  brushSize: number
  color: string
  onUndoStateChange?: (canUndo: boolean) => void
}

const MAX_UNDO_STATES = 10

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  ({ tool, brushSize, color, onUndoStateChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const drawingRef = useRef(false)
    const lastPointRef = useRef({ x: 0, y: 0 })
    const historyRef = useRef<ImageData[]>([])

    const notifyUndoState = () => {
      onUndoStateChange?.(historyRef.current.length > 0)
    }

    const resetHistory = () => {
      historyRef.current = []
      notifyUndoState()
    }

    const saveHistory = (
      context: CanvasRenderingContext2D,
    ) => {
      const canvas = canvasRef.current
      if (!canvas) return

      historyRef.current.push(
        context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ),
      )

      if (historyRef.current.length > MAX_UNDO_STATES) {
        historyRef.current.shift()
      }

      notifyUndoState()
    }

    const clearCanvas = (saveForUndo = false) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const context = canvas.getContext('2d')
      if (!context) return

      if (saveForUndo) {
        saveHistory(context)
      }

      context.save()
      context.fillStyle = '#fffdf7'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.restore()

      if (!saveForUndo) {
        resetHistory()
      }
    }

    const undo = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const context = canvas.getContext('2d')
      if (!context) return

      const previous = historyRef.current.pop()
      if (!previous) return

      drawingRef.current = false
      context.putImageData(previous, 0, 0)
      notifyUndoState()
    }

    useImperativeHandle(ref, () => ({
      clear: clearCanvas,
      undo,

      getDrawing: async () => {
        const canvas = canvasRef.current
        if (!canvas) return null

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/png')
        })

        if (!blob) return null

        return {
          bytes: new Uint8Array(await blob.arrayBuffer()),
          url: URL.createObjectURL(blob),
        }
      },
    }))

    useEffect(() => {
      clearCanvas()
    }, [])

    const getPointerPosition = (
      event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()

      return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
      }
    }

    const hexToRgba = (hex: string) => {
      const normalized = hex.replace('#', '')

      if (normalized.length !== 6) {
        return null
      }

      const value = Number.parseInt(normalized, 16)

      if (Number.isNaN(value)) {
        return null
      }

      return [
        (value >> 16) & 255,
        (value >> 8) & 255,
        value & 255,
        255,
      ] as const
    }

    const fillArea = (
      context: CanvasRenderingContext2D,
      point: { x: number; y: number },
    ) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const replacement = hexToRgba(color)
      if (!replacement) return

      const imageData = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      )

      const { data, width, height } = imageData

      const startX = Math.floor(point.x)
      const startY = Math.floor(point.y)

      if (
        startX < 0 ||
        startY < 0 ||
        startX >= width ||
        startY >= height
      ) {
        return
      }

      const startPixel =
        startY * width + startX

      const startOffset =
        startPixel * 4

      const target = [
        data[startOffset],
        data[startOffset + 1],
        data[startOffset + 2],
        data[startOffset + 3],
      ] as const

      if (
        target[0] === replacement[0] &&
        target[1] === replacement[1] &&
        target[2] === replacement[2] &&
        target[3] === replacement[3]
      ) {
        return
      }

      saveHistory(context)

      const matchesTarget = (
        pixelIndex: number,
      ) => {
        const offset = pixelIndex * 4

        return (
          data[offset] === target[0] &&
          data[offset + 1] === target[1] &&
          data[offset + 2] === target[2] &&
          data[offset + 3] === target[3]
        )
      }

      const paintPixel = (
        pixelIndex: number,
      ) => {
        const offset = pixelIndex * 4

        data[offset] = replacement[0]
        data[offset + 1] = replacement[1]
        data[offset + 2] = replacement[2]
        data[offset + 3] = replacement[3]
      }

      const stack = [startPixel]

      paintPixel(startPixel)

      while (stack.length > 0) {
        const currentPixel = stack.pop()

        if (currentPixel === undefined) {
          break
        }

        const x = currentPixel % width
        const y = Math.floor(
          currentPixel / width,
        )

        if (x > 0) {
          const left =
            currentPixel - 1

          if (matchesTarget(left)) {
            paintPixel(left)
            stack.push(left)
          }
        }

        if (x < width - 1) {
          const right =
            currentPixel + 1

          if (matchesTarget(right)) {
            paintPixel(right)
            stack.push(right)
          }
        }

        if (y > 0) {
          const above =
            currentPixel - width

          if (matchesTarget(above)) {
            paintPixel(above)
            stack.push(above)
          }
        }

        if (y < height - 1) {
          const below =
            currentPixel + width

          if (matchesTarget(below)) {
            paintPixel(below)
            stack.push(below)
          }
        }
      }

      context.putImageData(
        imageData,
        0,
        0,
      )
    }

    const isShapeTool =
      tool === 'line' ||
      tool === 'rectangle' ||
      tool === 'circle'

    const startDrawing = (
      event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const context = canvas.getContext('2d')
      if (!context) return

      const point = getPointerPosition(event)

      if (tool === 'fill') {
        fillArea(
          context,
          point,
        )
        return
      }

      drawingRef.current = true
      lastPointRef.current = point

      event.currentTarget.setPointerCapture(event.pointerId)

      if (isShapeTool) {
        return
      }

      saveHistory(context)

      context.beginPath()
      context.arc(
        point.x,
        point.y,
        brushSize / 2,
        0,
        Math.PI * 2,
      )

      context.fillStyle =
        tool === 'eraser'
          ? '#fffdf7'
          : color

      context.fill()
    }

    const draw = (
      event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
      if (!drawingRef.current) return

      if (isShapeTool) return

      const canvas = canvasRef.current
      if (!canvas) return

      const context = canvas.getContext('2d')
      if (!context) return

      const currentPoint = getPointerPosition(event)

      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.lineWidth = brushSize

      if (tool === 'eraser') {
        context.strokeStyle = '#fffdf7'
      } else {
        context.strokeStyle = color
      }

      context.beginPath()
      context.moveTo(
        lastPointRef.current.x,
        lastPointRef.current.y,
      )
      context.lineTo(currentPoint.x, currentPoint.y)
      context.stroke()

      lastPointRef.current = currentPoint
    }

    const drawShape = (
      context: CanvasRenderingContext2D,
      startPoint: { x: number; y: number },
      endPoint: { x: number; y: number },
    ) => {
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.lineWidth = brushSize
      context.strokeStyle = color

      context.beginPath()

      if (tool === 'line') {
        context.moveTo(
          startPoint.x,
          startPoint.y,
        )
        context.lineTo(
          endPoint.x,
          endPoint.y,
        )
      }

      if (tool === 'rectangle') {
        context.rect(
          startPoint.x,
          startPoint.y,
          endPoint.x - startPoint.x,
          endPoint.y - startPoint.y,
        )
      }

      if (tool === 'circle') {
        const centerX =
          (startPoint.x + endPoint.x) / 2
        const centerY =
          (startPoint.y + endPoint.y) / 2

        const diameter = Math.hypot(
          endPoint.x - startPoint.x,
          endPoint.y - startPoint.y,
        )

        context.arc(
          centerX,
          centerY,
          diameter / 2,
          0,
          Math.PI * 2,
        )
      }

      context.stroke()
    }

    const stopDrawing = (
      event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
      if (!drawingRef.current) return

      if (isShapeTool) {
        const canvas = canvasRef.current

        if (canvas) {
          const context = canvas.getContext('2d')

          if (context) {
            const currentPoint =
              getPointerPosition(event)

            saveHistory(context)

            drawShape(
              context,
              lastPointRef.current,
              currentPoint,
            )
          }
        }
      }

      drawingRef.current = false
    }

    const cancelDrawing = () => {
      drawingRef.current = false
    }

    return (
      <canvas
        ref={canvasRef}
        width={900}
        height={500}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={cancelDrawing}
        className="h-auto w-full touch-none cursor-crosshair rounded-xl bg-[#fffdf7]"
      />
    )
  },
)

DrawingCanvas.displayName = 'DrawingCanvas'

export default DrawingCanvas