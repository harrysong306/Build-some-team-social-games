import { useEffect, useMemo, useRef, useState } from "react";
import type { Room } from "@colyseus/sdk";

import DrawingCanvas, {
  type DrawingCanvasHandle,
} from "../sketch-recall/DrawingCanvas";
import { generateGameWordsForRoom } from "../sketch-recall/sketchRecallWords";

type MultiplayerDrawingPhaseProps = {
  room: Room | null;
  roomId: string | null;
  currentGridIndex: number;
  roundEndTime: number;
};

// FE-18: multiplayer version of DrawingPhase. Reuses the same DrawingCanvas
// widget but, unlike the local/pass-and-play DrawingPhase, does NOT run its
// own timer or advance its own index - the server (BE-12/Game.ts) owns the
// shared 60s-per-cell clock and currentGridIndex, this just follows it.
//
// hiding other players' drawings needs nothing extra here: this component
// only ever reads its own canvas (via canvasRef) and its own local
// `drawings` array. it has no way to see anyone else's data even if it
// wanted to - the server (BE-13) never sends it to us in the first place.
function MultiplayerDrawingPhase({
  room,
  roomId,
  currentGridIndex,
  roundEndTime,
}: MultiplayerDrawingPhaseProps) {
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  // every player in the room independently derives the same 25 words from
  // the room id - see the comment on generateGameWordsForRoom for why
  const words = useMemo(
    () => generateGameWordsForRoom(roomId ?? "sketch-recall-room"),
    [roomId],
  );

  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [brushSize, setBrushSize] = useState(8);
  const [timeLeft, setTimeLeft] = useState(0);

  // this player's own drawings only, indexed by grid cell - purely local,
  // never sent anywhere except one at a time via submitDrawing below
  const [drawings, setDrawings] = useState<(string | null)[]>(
    Array(words.length).fill(null),
  );

  // tracks which grid index the canvas currently represents, so when the
  // server moves on we know what we just finished (and can still read it
  // off the canvas before clearing for the new cell)
  const trackedIndexRef = useRef(currentGridIndex);

  // countdown display only - purely derived from the server's roundEndTime,
  // never used to decide when to advance
  useEffect(() => {
    const tick = () => {
      const secondsLeft = Math.max(
        0,
        Math.ceil((roundEndTime - Date.now()) / 1000),
      );
      setTimeLeft(secondsLeft);
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [roundEndTime]);

  // fires whenever the server advances to a new grid cell. submits whatever
  // is on the canvas for the cell that just ended, then clears for the new one
  useEffect(() => {
    if (trackedIndexRef.current === currentGridIndex) return;

    const finishedIndex = trackedIndexRef.current;
    const imageData = canvasRef.current?.getImage();

    if (imageData) {
      room?.send("submitDrawing", { imageData });
    }

    setDrawings((previous) => {
      const updated = [...previous];
      updated[finishedIndex] = imageData ?? null;
      return updated;
    });

    canvasRef.current?.clear();
    trackedIndexRef.current = currentGridIndex;
  }, [currentGridIndex, room]);

  // safety net: if this component unmounts mid-cell (phase changes away from
  // "drawing" while the timer's still running), still submit what's there
  // instead of silently losing it. mount/unmount only on purpose - this
  // should not re-run just because `room` changes identity
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- want the
      // canvas's latest content right up to unmount, not a stale snapshot
      const imageData = canvasRef.current?.getImage();
      if (imageData) {
        room?.send("submitDrawing", { imageData });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentWord = words[currentGridIndex] ?? "";

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="rounded-full border border-amber-500/30 bg-[#160b06] px-5 py-2 text-sm text-white/70">
            Drawing {currentGridIndex + 1} / {words.length}
          </div>
        </div>

        <div className="mt-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
              Draw this word
            </p>
            <h1 className="mt-2 text-5xl font-black">{currentWord}</h1>
          </div>

          <div
            className={`text-4xl font-black ${
              timeLeft <= 5 ? "text-red-400" : "text-amber-400"
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
                onClick={() => setTool("brush")}
                className={`rounded-lg px-5 py-2 text-sm font-semibold ${
                  tool === "brush"
                    ? "bg-amber-400 text-black"
                    : "border border-amber-500/30 bg-[#211006] text-white"
                }`}
              >
                Pencil
              </button>

              <button
                type="button"
                onClick={() => setTool("eraser")}
                className={`rounded-lg px-5 py-2 text-sm font-semibold ${
                  tool === "eraser"
                    ? "bg-amber-400 text-black"
                    : "border border-amber-500/30 bg-[#211006] text-white"
                }`}
              >
                Eraser
              </button>

              <button
                type="button"
                onClick={() => canvasRef.current?.clear()}
                className="rounded-lg border border-amber-500/30 bg-[#211006] px-5 py-2 text-sm font-semibold text-white"
              >
                Clear
              </button>

              <div className="ml-auto flex items-center gap-3">
                <span className="text-xs text-white/50">Brush size</span>
                <input
                  type="range"
                  min="3"
                  max="25"
                  value={brushSize}
                  onChange={(event) => setBrushSize(Number(event.target.value))}
                  className="accent-amber-400"
                />
              </div>
            </div>

            <DrawingCanvas ref={canvasRef} tool={tool} brushSize={brushSize} />

            <p className="mt-5 text-center text-sm text-white/40">
              Everyone moves on together when the timer hits 0 - no need to
              click anything.
            </p>
          </section>

          <aside className="rounded-2xl border border-amber-500/30 bg-[#160b06] p-5">
            <h2 className="font-bold">Memory Grid</h2>
            <p className="mt-1 text-xs text-white/45">
              Your own drawings only - everyone else's stay hidden until
              recall.
            </p>

            <div className="mt-5 grid grid-cols-5 gap-2">
              {Array.from({ length: 25 }).map((_, index) => {
                const drawing = drawings[index];
                const active = index === currentGridIndex;

                return (
                  <div
                    key={index}
                    className={`aspect-square overflow-hidden rounded-md border ${
                      active
                        ? "border-amber-400 bg-amber-400/10"
                        : drawing
                          ? "border-amber-500/30 bg-white"
                          : "border-white/10 bg-white/5"
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
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default MultiplayerDrawingPhase;
