import type { Room } from "@colyseus/sdk";
import { useMajorityResult } from "./useMajorityResult";

type MajorityResultScreenProps = {
  room: Room | null;
  onContinue?: () => void;
};

// FE-38: Display cooperative majority result and team outcome
function MajorityResultScreen({ room, onContinue }: MajorityResultScreenProps) {
  const { word, majorityGuess, isCorrect, guessCounts } = useMajorityResult(room);

  const guessEntries = Object.entries(guessCounts).sort((a, b) => b[1] - a[1]);

  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#0d0704] px-6 py-12 text-white">
      <section className="w-full max-w-2xl rounded-2xl border border-amber-500/30 bg-[#160b06] p-8 text-center md:p-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
          Round Result
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          {isCorrect ? "Team got it right!" : "Not quite…"}
        </h1>

        <div className="mt-6 grid gap-4 text-left sm:grid-cols-2">
          <div className="rounded-xl border border-amber-500/20 bg-[#211006] p-4">
            <p className="text-xs uppercase text-amber-400">Correct word</p>
            <p className="mt-1 text-lg font-bold">{word || "—"}</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-[#211006] p-4">
            <p className="text-xs uppercase text-amber-400">Team's answer</p>
            <p className="mt-1 text-lg font-bold">{majorityGuess ?? "—"}</p>
          </div>
        </div>

        {guessEntries.length > 0 && (
          <div className="mt-6 text-left">
            <p className="mb-2 text-xs uppercase text-amber-400">
              How everyone answered
            </p>
            <ul className="space-y-1 text-sm text-white/70">
              {guessEntries.map(([guess, count]) => (
                <li key={guess} className="flex justify-between">
                  <span>{guess}</span>
                  <span className="text-amber-300">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={onContinue}
          className="mt-8 w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-4 font-bold text-black transition hover:brightness-110"
        >
          CONTINUE
        </button>
      </section>
    </main>
  );
}

export default MajorityResultScreen;
