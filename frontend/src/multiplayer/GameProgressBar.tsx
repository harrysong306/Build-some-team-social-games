import type { Room } from "@colyseus/sdk";
import { useGameProgress } from "./useGameProgress";

type GameProgressBarProps = {
  room: Room | null;
};

// FE-45: Display game progress, score and lives
function GameProgressBar({ room }: GameProgressBarProps) {
  const { lives, maxLives, playerScores, currentIndex, totalWords } =
    useGameProgress(room);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-[#160b06] px-6 py-4 text-white">
      {/* round progress */}
      <div>
        <p className="text-xs uppercase tracking-widest text-amber-400">
          Progress
        </p>
        <p className="mt-1 font-semibold">
          Drawing {currentIndex + 1} of {totalWords}
        </p>
      </div>

      {/* shared team lives */}
      <div>
        <p className="text-xs uppercase tracking-widest text-amber-400">
          Lives
        </p>
        <p className="mt-1 text-lg">
          {Array.from({ length: maxLives }).map((_, i) => (
            <span key={i}>{i < lives ? "❤️" : "🖤"}</span>
          ))}
        </p>
      </div>

      {/* per-player score */}
      <div>
        <p className="text-xs uppercase tracking-widest text-amber-400">
          Score
        </p>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {playerScores.length === 0 ? (
            <li className="text-white/40">No players yet</li>
          ) : (
            playerScores.map((p) => (
              <li key={p.name}>
                <span className="text-white/70">{p.name}:</span>{" "}
                <span className="font-bold text-amber-300">{p.score}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export default GameProgressBar;
