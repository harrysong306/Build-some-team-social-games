import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import DrawingCanvas, {
  type DrawingCanvasHandle,
  type DrawingTool,
} from './DrawingCanvas'

type DrawingPhaseProps = {
  words: readonly string[]
  drawingSpeed: string
  onBack: () => void
  onSubmitDrawing?: (
    bytes: Uint8Array,
    index: number,
  ) => void
  multiplayerSync?: {
    drawingRound: number
    drawingDeadline: number
    drawingReadyCount: number
    totalPlayers: number
    onEnter: () => void
    onReady: (index: number) => void
    onForceSave: (
      handler: (message: { index: number }) => void,
    ) => (() => void) | undefined
  }
  onComplete: (drawings: (string | null)[]) => void
}

const DRAWING_COLORS = [
  {
    name: 'Black',
    value: '#25150b',
  },
  {
    name: 'Red',
    value: '#ef4444',
  },
  {
    name: 'Blue',
    value: '#3b82f6',
  },
  {
    name: 'Green',
    value: '#22c55e',
  },
  {
    name: 'Purple',
    value: '#a855f7',
  },
  {
    name: 'Orange',
    value: '#f97316',
  },
] as const

type DrawingColor =
  (typeof DRAWING_COLORS)[number]['value']

function getDrawingTime(drawingSpeed: string) {
  if (drawingSpeed === 'hard') {
    // 3–6 seconds
    return Math.floor(Math.random() * 4) + 3
  }

  if (drawingSpeed === 'easy') {
    // 8–12 seconds
    return Math.floor(Math.random() * 5) + 8
  }

  // Normal: 6–10 seconds
  return Math.floor(Math.random() * 5) + 6
}

function DrawingPhase({
  words,
  drawingSpeed,
  onBack,
  onSubmitDrawing,
  multiplayerSync,
  onComplete,
}: DrawingPhaseProps) {
  const canvasRef = useRef<DrawingCanvasHandle>(null)
  const isAdvancingRef = useRef(false)
  const drawingsRef = useRef<(string | null)[]>(
    Array(words.length).fill(null),
  )
  const completedRef = useRef(false)
  const sentEnterRef = useRef(false)

  const [currentIndex, setCurrentIndex] = useState(0)

  const [tool, setTool] =
    useState<DrawingTool>('brush')

  const [brushSize, setBrushSize] = useState(8)

  const [color, setColor] =
    useState<DrawingColor>(
      DRAWING_COLORS[0].value,
    )

  const [canUndo, setCanUndo] = useState(false)

  const [timeLeft, setTimeLeft] =
    useState(() => getDrawingTime(drawingSpeed))

  const [drawings, setDrawings] =
    useState<(string | null)[]>(
      Array(words.length).fill(null),
    )

  const [finished, setFinished] = useState(false)
  const [waitingForRound, setWaitingForRound] =
    useState<number | null>(null)

  useEffect(() => {
    if (
      !multiplayerSync ||
      sentEnterRef.current
    ) {
      return
    }

    sentEnterRef.current = true
    multiplayerSync.onEnter()
  }, [multiplayerSync])

  const saveAndNext = useCallback(async () => {
    if (isAdvancingRef.current) return
    if (
      multiplayerSync &&
      waitingForRound === currentIndex
    ) {
      return
    }

    isAdvancingRef.current = true

    const drawing =
      await canvasRef.current?.getDrawing() ?? null

    // submits bytes to colyseus while keeping url
    if (drawing) {
      onSubmitDrawing?.(drawing.bytes, currentIndex)
    }

    setDrawings((previous) => {
      const updated = [...previous]
      updated[currentIndex] = drawing?.url ?? null
      drawingsRef.current = updated
      return updated
    })

    if (multiplayerSync) {
      setWaitingForRound(currentIndex)
      multiplayerSync.onReady(currentIndex)
      isAdvancingRef.current = false
      return
    }

    if (currentIndex >= words.length - 1) {
      setFinished(true)
      return
    }

    setCurrentIndex((current) => current + 1)
    setTimeLeft(getDrawingTime(drawingSpeed))

    canvasRef.current?.clear()

    window.setTimeout(() => {
      isAdvancingRef.current = false
    }, 500)
  }, [
    currentIndex,
    words.length,
    onSubmitDrawing,
    drawingSpeed,
    multiplayerSync,
    waitingForRound,
  ])

  useEffect(() => {
    if (finished || multiplayerSync) return

    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [currentIndex, finished, multiplayerSync])

  useEffect(() => {
    if (
      !multiplayerSync ||
      finished ||
      multiplayerSync.drawingDeadline <= 0
    ) {
      return
    }

    const updateTimeLeft = () => {
      setTimeLeft(
        Math.max(
          0,
          Math.ceil(
            (multiplayerSync.drawingDeadline -
              Date.now()) /
              1000,
          ),
        ),
      )
    }

    updateTimeLeft()
    const timer = window.setInterval(updateTimeLeft, 250)

    return () => window.clearInterval(timer)
  }, [
    multiplayerSync?.drawingDeadline,
    finished,
    multiplayerSync,
  ])

  useEffect(() => {
    if (!multiplayerSync) return

    if (multiplayerSync.drawingRound >= words.length) {
      if (!completedRef.current) {
        completedRef.current = true
        onComplete(drawingsRef.current)
      }
      return
    }

    if (
      multiplayerSync.drawingRound !== currentIndex
    ) {
      setCurrentIndex(multiplayerSync.drawingRound)
      setWaitingForRound(null)
      setTimeLeft(
        Math.max(
          0,
          Math.ceil(
            (multiplayerSync.drawingDeadline -
              Date.now()) /
              1000,
          ),
        ),
      )
      canvasRef.current?.clear()
      isAdvancingRef.current = false
    }
  }, [
    multiplayerSync?.drawingRound,
    multiplayerSync?.drawingDeadline,
    multiplayerSync,
    currentIndex,
    words.length,
    onComplete,
  ])

  useEffect(() => {
    if (!multiplayerSync) return

    return multiplayerSync.onForceSave((message) => {
      if (
        message.index !== currentIndex ||
        waitingForRound === currentIndex
      ) {
        return
      }

      void saveAndNext()
    })
  }, [
    multiplayerSync,
    currentIndex,
    waitingForRound,
    saveAndNext,
  ])

  useEffect(() => {
    if (
      timeLeft === 0 &&
      !finished &&
      (!multiplayerSync ||
        multiplayerSync.drawingDeadline > 0) &&
      waitingForRound !== currentIndex
    ) {
      if (!multiplayerSync) {
        saveAndNext()
      }
    }
  }, [
    timeLeft,
    finished,
    saveAndNext,
    waitingForRound,
    currentIndex,
    multiplayerSync,
  ])

  if (finished) {
    return (
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#0d0704] px-6 text-white">
        <div className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-[#160b06] p-10 text-center">

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/10 text-4xl text-amber-400">
            ✓
          </div>

          <h1 className="mt-6 text-3xl font-bold">
            Drawing phase complete
          </h1>

          <p className="mt-3 text-white/55">
            Your drawings are now hidden. Next comes
            the distraction phase.
          </p>

          <button
            type="button"
            onClick={() => onComplete(drawings)}
            className="mt-8 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-8 py-4 font-bold text-black transition hover:brightness-110"
          >
            CONTINUE →
          </button>

        </div>
      </main>
    )
  }

  if (
    multiplayerSync &&
    (waitingForRound === currentIndex ||
      multiplayerSync.drawingDeadline <= 0)
  ) {
    return (
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#0d0704] px-6 text-white">
        <section className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-[#160b06] p-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/10 text-4xl text-amber-400">
            ⏳
          </div>

          <h1 className="mt-6 text-3xl font-bold">
            Waiting for other players
          </h1>

          <p className="mt-3 text-white/55">
            The next word starts when everyone finishes or the timer runs out.
          </p>

          {multiplayerSync.drawingDeadline > 0 ? (
            <p className="mt-6 text-lg font-bold text-amber-300">
              {multiplayerSync.drawingReadyCount} / {multiplayerSync.totalPlayers} players ready
            </p>
          ) : null}

          <p className="mt-3 text-sm text-white/45">
            {multiplayerSync.drawingDeadline > 0
              ? `${timeLeft}s remaining`
              : 'Waiting for the drawing round to start'}
          </p>
        </section>
      </main>
    )
  }

  const toolButtonClass = (
    drawingTool: DrawingTool,
  ) =>
    `rounded-lg px-5 py-2 text-sm font-semibold ${
      tool === drawingTool
        ? 'bg-amber-400 text-black'
        : 'border border-amber-500/30 bg-[#211006] text-white'
    }`

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-8 text-white">

      <div className="mx-auto max-w-7xl">

        <div className="flex items-center justify-between">

          <button
            type="button"
            onClick={onBack}
            className="text-sm text-amber-300 hover:text-amber-200"
          >
            ← Instructions
          </button>

          <div className="rounded-full border border-amber-500/30 bg-[#160b06] px-5 py-2 text-sm text-white/70">
            Drawing {currentIndex + 1} / {words.length}
          </div>

        </div>

        <div className="mt-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">

          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
              Draw this word
            </p>

            <h1 className="mt-2 text-5xl font-black">
              {words[currentIndex]}
            </h1>
          </div>

          <div
            className={`text-4xl font-black ${
              timeLeft <= 5
                ? 'text-red-400'
                : 'text-amber-400'
            }`}
          >
            {timeLeft}s
          </div>

        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_300px]">

          <section className="rounded-2xl border border-amber-500/30 bg-[#160b06] p-5">

            <div className="mb-5 flex flex-wrap items-center gap-3">

              <button
                type="button"
                onClick={() => setTool('brush')}
                className={toolButtonClass('brush')}
              >
                Pencil
              </button>

              <button
                type="button"
                onClick={() => setTool('line')}
                className={toolButtonClass('line')}
              >
                Line
              </button>

              <button
                type="button"
                onClick={() => setTool('rectangle')}
                className={toolButtonClass('rectangle')}
              >
                Rectangle
              </button>

              <button
                type="button"
                onClick={() => setTool('circle')}
                className={toolButtonClass('circle')}
              >
                Circle
              </button>

              <button
                type="button"
                onClick={() => setTool('fill')}
                className={toolButtonClass('fill')}
              >
                Fill
              </button>

              <button
                type="button"
                onClick={() => setTool('eraser')}
                className={toolButtonClass('eraser')}
              >
                Eraser
              </button>

              <button
                type="button"
                disabled={!canUndo}
                onClick={() =>
                  canvasRef.current?.undo()
                }
                className={`rounded-lg border border-amber-500/30 px-5 py-2 text-sm font-semibold ${
                  canUndo
                    ? 'bg-[#211006] text-white'
                    : 'cursor-not-allowed bg-[#160b06] text-white/30'
                }`}
              >
                Undo
              </button>

              <button
                type="button"
                onClick={() =>
                  canvasRef.current?.clear(true)
                }
                className="rounded-lg border border-amber-500/30 bg-[#211006] px-5 py-2 text-sm font-semibold text-white"
              >
                Clear
              </button>

              <div
                role="group"
                aria-label="Drawing colours"
                className="flex items-center gap-2"
              >
                <span className="text-xs text-white/50">
                  Colour
                </span>

                {DRAWING_COLORS.map(
                  (drawingColor) => {
                    const selected =
                      color === drawingColor.value

                    return (
                      <button
                        key={drawingColor.value}
                        type="button"
                        aria-label={`${drawingColor.name} drawing colour`}
                        aria-pressed={selected}
                        title={drawingColor.name}
                        onClick={() =>
                          setColor(
                            drawingColor.value,
                          )
                        }
                        style={{
                          backgroundColor:
                            drawingColor.value,
                        }}
                        className={`h-7 w-7 rounded-full border-2 transition ${
                          selected
                            ? 'border-white ring-2 ring-amber-400'
                            : 'border-white/30 hover:border-white/70'
                        }`}
                      />
                    )
                  },
                )}

              </div>

              <div className="ml-auto flex items-center gap-3">

                <span className="text-xs text-white/50">
                  Brush size
                </span>

                <input
                  type="range"
                  min="3"
                  max="25"
                  value={brushSize}
                  onChange={(event) =>
                    setBrushSize(
                      Number(event.target.value),
                    )
                  }
                  className="accent-amber-400"
                />

              </div>

            </div>

            <DrawingCanvas
              ref={canvasRef}
              tool={tool}
              brushSize={brushSize}
              color={color}
              onUndoStateChange={setCanUndo}
            />

            <button
              type="button"
              onClick={saveAndNext}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 py-4 text-lg font-bold text-black transition hover:brightness-110"
            >
              SAVE & NEXT →
            </button>

          </section>

          <aside className="rounded-2xl border border-amber-500/30 bg-[#160b06] p-5">

            <h2 className="font-bold">
              Memory Grid
            </h2>

            <p className="mt-1 text-xs text-white/45">
              Your drawings are stored here during this phase.
            </p>

            <div className="mt-5 grid grid-cols-5 gap-2">

              {Array.from({ length: words.length }).map(
                (_, index) => {
                  const drawing = drawings[index]

                  const active =
                    index === currentIndex

                  return (
                    <div
                      key={index}
                      className={`aspect-square overflow-hidden rounded-md border ${
                        active
                          ? 'border-amber-400 bg-amber-400/10'
                          : drawing
                            ? 'border-amber-500/30 bg-white'
                            : 'border-white/10 bg-white/5'
                      }`}
                    >

                      {drawing ? (
                        <img
                          src={drawing}
                          alt={`Drawing ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-white/25">
                          {index + 1}
                        </div>
                      )}

                    </div>
                  )
                },
              )}

            </div>

            <div className="mt-6 rounded-xl bg-amber-400/10 p-4">
              <p className="text-xs leading-5 text-amber-100/70">
                Keep your sketches simple. You will
                need them later to remember the original
                words.
              </p>
            </div>

          </aside>

        </div>

      </div>

    </main>
  )
}

export default DrawingPhase
