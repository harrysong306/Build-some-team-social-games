import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'

export type DrawingCanvasHandle = {
  clear: () => void
  getImage: () => string
}

type DrawingCanvasProps = {
  tool: 'brush' | 'eraser'
  brushSize: number
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  ({ tool, brushSize }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const drawingRef = useRef(false)
    const lastPointRef = useRef({ x: 0, y: 0 })

    const clearCanvas = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const context = canvas.getContext('2d')
      if (!context) return

      context.save()
      context.fillStyle = '#fffdf7'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.restore()
    }

    useImperativeHandle(ref, () => ({
      clear: clearCanvas,

      getImage: () => {
        const canvas = canvasRef.current
        return canvas ? canvas.toDataURL('image/png') : ''
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

    const startDrawing = (
      event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
      drawingRef.current = true
      lastPointRef.current = getPointerPosition(event)

      event.currentTarget.setPointerCapture(event.pointerId)
    }

    const draw = (
      event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
      if (!drawingRef.current) return

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
        context.strokeStyle = '#25150b'
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

    const stopDrawing = () => {
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
        onPointerCancel={stopDrawing}
        className="h-auto w-full touch-none cursor-crosshair rounded-xl bg-[#fffdf7]"
      />
    )
  },
)

DrawingCanvas.displayName = 'DrawingCanvas'

export default DrawingCanvas