import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import DrawingCanvas, {
  type DrawingCanvasHandle,
} from './DrawingCanvas'

type DrawingPhaseProps = {
  words: string[]
  onBack: () => void
  onComplete: (drawings: (string | null)[]) => void
}

function DrawingPhase({
  words,
  onBack,
  onComplete,
}: DrawingPhaseProps) {
  const canvasRef = useRef<DrawingCanvasHandle>(null)
  const isAdvancingRef = useRef(false)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [tool, setTool] =
    useState<'brush' | 'eraser'>('brush')
  const [brushSize, setBrushSize] = useState(8)
  const [timeLeft, setTimeLeft] = useState(15)

  const [drawings, setDrawings] =
    useState<(string | null)[]>(
      Array(words.length).fill(null),
    )

  const [finished, setFinished] = useState(false)

  const saveAndNext = useCallback(() => {
    if (isAdvancingRef.current) return

    isAdvancingRef.current = true

    const image =
      canvasRef.current?.getImage() ?? ''

    setDrawings((previous) => {
      const updated = [...previous]
      updated[currentIndex] = image
      return updated
    })

    if (currentIndex >= words.length - 1) {
      setFinished(true)
      return
    }

    setCurrentIndex((current) => current + 1)
    setTimeLeft(15)

    canvasRef.current?.clear()

    window.setTimeout(() => {
      isAdvancingRef.current = false
    }, 500)
  }, [currentIndex, words.length])

  useEffect(() => {
    if (finished) return

    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [currentIndex, finished])

  useEffect(() => {
    if (timeLeft === 0 && !finished) {
      saveAndNext()
    }
  }, [timeLeft, finished, saveAndNext])

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
                className={`rounded-lg px-5 py-2 text-sm font-semibold ${
                  tool === 'brush'
                    ? 'bg-amber-400 text-black'
                    : 'border border-amber-500/30 bg-[#211006] text-white'
                }`}
              >
                Pencil
              </button>

              <button
                type="button"
                onClick={() => setTool('eraser')}
                className={`rounded-lg px-5 py-2 text-sm font-semibold ${
                  tool === 'eraser'
                    ? 'bg-amber-400 text-black'
                    : 'border border-amber-500/30 bg-[#211006] text-white'
                }`}
              >
                Eraser
              </button>

              <button
                type="button"
                onClick={() =>
                  canvasRef.current?.clear()
                }
                className="rounded-lg border border-amber-500/30 bg-[#211006] px-5 py-2 text-sm font-semibold text-white"
              >
                Clear
              </button>

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

              {Array.from({ length: 25 }).map(
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