import { useState } from "react";
import type { Room } from "@colyseus/sdk";
import { useSubmitGuess } from "./useSubmitGuess";

type RecallGuessScreenProps = {
  room: Room | null;
  drawing: string | null;
  word: string;
  drawingIndex: number;
  totalDrawings: number;
  onSubmitted?: () => void;
};

// FE-37: Implement private guess submission for cooperative mode.
// Each player sees only their own drawing and types their own guess -
// once submitted, the guess is hidden even from this player's own screen
// until the backend reveals everyone's answers together.
// Players can still edit their guess before the reveal happens.
function RecallGuessScreen({
  room,
  drawing,
  word,
  drawingIndex,
  totalDrawings,
  onSubmitted,
}: RecallGuessScreenProps) {
  const [guess, setGuess] = useState("");
  const { submitted, error, submitGuess, resetSubmission } = useSubmitGuess(room);

  const handleSubmit = () => {
    if (!guess.trim()) return;
    submitGuess(word, guess.trim());
    onSubmitted?.();
  };

  const handleEdit = () => {
    resetSubmission();
  };

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <section className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
            Recall Phase
          </p>
          <h1 className="mt-3 text-4xl font-bold">What did you draw?</h1>
          <p className="mt-3 text-white/50">
            Your guess stays private until everyone has answered.
          </p>
        </section>

        <div className="mt-8 text-center text-white/50">
          Drawing {drawingIndex + 1} of {totalDrawings}
        </div>

        <section className="mt-6 grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-amber-500/30 bg-[#160b06] p-6">
                        <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-amber-300">
                YOUR DRAWING
              </p>
              {/* FE-36: never reveal who drew this - keeps recall guessing fair */}
              <span className="text-xs text-white/40">Drawn anonymously</span>
            </div>

            <div className="flex min-h-[380px] items-center justify-center overflow-hidden rounded-xl bg-[#fffdf7]">
              {drawing ? (
                <img
                  src={drawing}
                  alt={`Drawing ${drawingIndex + 1}`}
                  className="max-h-[430px] w-full object-contain"
                />
              ) : (
                <p className="text-black/40">No drawing saved</p>
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-amber-500/30 bg-[#160b06] p-7">
            <p className="text-sm font-semibold uppercase text-amber-400">
              Your Answer
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              What was the original word?
            </h2>

            {submitted ? (
              <div className="mt-7 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
                <p className="font-bold text-amber-300">Guess submitted</p>
                <p className="mt-2 text-sm text-white/60">
                  Waiting for other players…
                </p>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="mt-4 text-sm font-semibold text-amber-400 underline hover:text-amber-300"
                >
                  Edit answer
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                  placeholder="Enter your answer..."
                  className="mt-7 rounded-xl border border-amber-500/30 bg-[#211006] px-5 py-4 text-lg text-white outline-none focus:border-amber-400"
                />

                {error && (
                  <p className="mt-3 text-sm text-red-400" role="alert">
                    {error}
                  </p>
                )}

                <div className="mt-auto pt-7">
                  <button
                    type="button"
                    disabled={!guess.trim()}
                    onClick={handleSubmit}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 py-4 font-bold text-black disabled:opacity-30"
                  >
                    SUBMIT GUESS
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default RecallGuessScreen;
