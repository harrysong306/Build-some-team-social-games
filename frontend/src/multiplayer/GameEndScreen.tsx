import type { Room } from "@colyseus/sdk";
import { useGameEndActions } from "./useGameEndActions";

type GameEndScreenProps = {
  room: Room | null;
  isHost: boolean;
  score: number;
  total: number;
  onLeft?: () => void;
};

// FE-47: Implement Play Again, Change Mode and Leave actions
function GameEndScreen({ room, isHost, score, total, onLeft }: GameEndScreenProps) {
  const { playAgain, changeMode, leaveRoom } = useGameEndActions(room);

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  let message = "Keep practising!";
  if (percentage === 100) {
    message = "Perfect memory!";
  } else if (percentage >= 60) {
    message = "Great job!";
  } else if (percentage >= 40) {
    message = "Nice try!";
  }

  const handleLeave = () => {
    leaveRoom();
    onLeft?.();
  };

  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#0d0704] px-6 py-12 text-white">
      <section className="w-full max-w-2xl rounded-2xl border border-amber-500/30 bg-[#160b06] p-8 text-center md:p-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
          Round Complete
        </p>

        <h1 className="mt-3 text-4xl font-bold">{message}</h1>

        <p className="mt-3 text-white/50">
          Here is how well the team remembered the drawings.
        </p>

        <div className="mx-auto mt-10 flex h-48 w-48 flex-col items-center justify-center rounded-full border-4 border-amber-400 bg-amber-400/5">
          <span className="text-6xl font-black text-amber-400">{score}</span>
          <span className="mt-1 text-lg text-white/50">out of {total}</span>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {isHost ? (
            <>
              <button
                type="button"
                onClick={playAgain}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-4 font-bold text-black transition hover:brightness-110"
              >
                PLAY AGAIN
              </button>

              <button
                type="button"
                onClick={() => changeMode("competitive")}
                className="rounded-xl border border-amber-500/40 bg-[#211006] px-6 py-4 font-bold text-white transition hover:border-amber-400"
              >
                CHANGE MODE
              </button>
            </>
          ) : (
            <p className="sm:col-span-2 text-sm text-white/60">
              Waiting for the host to choose what's next…
            </p>
          )}

          <button
            type="button"
            onClick={handleLeave}
            className="rounded-xl border border-red-500/30 bg-transparent px-6 py-4 font-bold text-red-400 transition hover:border-red-400 sm:col-span-2"
          >
            LEAVE
          </button>
        </div>
      </section>
    </main>
  );
}

export default GameEndScreen;
