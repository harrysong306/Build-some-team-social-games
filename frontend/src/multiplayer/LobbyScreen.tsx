import { useState } from "react";
import type { Room } from "@colyseus/sdk";
import { useLobbyState } from "./useLobbyState";
import InstructionsScreen from "../sketch-recall/InstructionsScreen";
import SketchRecallGame from "../sketch-recall/SketchRecallGame";

type LobbyScreenProps = {
  room: Room | null;
  roomId: string | null;
};

const GAME_MODES = [
  { value: "sketchRecall", label: "Sketch Recall" },
];

const DRAWING_SPEEDS = [
  { value: "easy", label: "Easy" },
  { value: "normal", label: "Normal" },
  { value: "hard", label: "Hard" },
]

// Must stay within MIN_DRAWING_COUNT and
// MAX_DRAWING_COUNT in backend LobbyRoom.ts.
const DRAWING_COUNTS = [10, 15, 20, 25, 30];

const WORD_THEMES = [
  { value: "general", label: "General" },
  { value: "animals", label: "Animals" },
  { value: "food", label: "Food" },
  { value: "sports", label: "Sports" },
  { value: "transport", label: "Transport" },
  { value: "nature", label: "Nature" },
];

function LobbyScreen({ room, roomId }: LobbyScreenProps) {
  const {
    players,
    gameMode,
    drawingSpeed,
    drawingCount,
    wordTheme,
    phase,
    gameWords,
    mySessionId,
    toggleReady,
    setGameMode,
    setDrawingSpeed,
    setDrawingCount,
    setWordTheme,
    startGame,
  } = useLobbyState(room);

  const [roundStarted, setRoundStarted] = useState(false);

  const playerList = Object.entries(players);
  const me = players[mySessionId];

  const isHost = me?.isHost ?? false;

  const allReady =
    playerList.length > 0 &&
    playerList.every(([, player]) => player.ready);

  if (roundStarted) {
    return (
      <SketchRecallGame
        room={room}
        onExit={() => setRoundStarted(false)}
        gameWords={gameWords}
        drawingSpeed={drawingSpeed}
        onPlayAgain={startGame}
        onSubmitDrawing={(bytes, index) => {
          room?.send("submit-drawing-meta", {
            index,
          });

          room?.sendBytes(
            "submit-drawing",
            bytes,
          );
        }}
      />
    );
  }

  if (phase === "playing") {
    return (
      <InstructionsScreen
        onStart={() => setRoundStarted(true)}
        onBack={() =>
          console.log("Back clicked")
        }
      />
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-12 text-white">
      <div className="mx-auto max-w-md">
        <h2 className="text-2xl font-extrabold">
          Lobby
        </h2>

        <p className="mt-1 text-sm text-white/60">
          Room code: {roomId}
        </p>

        <ul className="mt-6 space-y-2">
          {playerList.map(
            ([sessionId, player]) => (
              <li
                key={sessionId}
                className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-[#211006] px-4 py-3"
              >
                <span>
                  {player.name}
                  {player.isHost && " 👑"}
                </span>

                <span
                  className={
                    player.ready
                      ? "text-emerald-400"
                      : "text-white/50"
                  }
                >
                  {player.ready
                    ? "✅ Ready"
                    : "⏳ Not ready"}
                </span>
              </li>
            ),
          )}
        </ul>

        <button
          onClick={toggleReady}
          className="mt-6 w-full rounded-lg border border-amber-400 px-6 py-3 font-bold text-amber-300 transition hover:bg-amber-500/10"
        >
          {me?.ready
            ? "Cancel Ready"
            : "Ready"}
        </button>

        {isHost ? (
          <div className="mt-6">
            <label className="mb-2 block text-sm text-white/60">
              Game mode
            </label>

            <select
              value={gameMode}
              onChange={(event) =>
                setGameMode(
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-amber-500/30 bg-[#211006] px-4 py-3 text-white focus:border-amber-400 focus:outline-none"
            >
              {GAME_MODES.map((mode) => (
                <option
                  key={mode.value}
                  value={mode.value}
                >
                  {mode.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mt-6 text-sm text-white/60">
            Mode: {gameMode}
          </p>
        )}

        {isHost ? (
          <div className="mt-4">
            <label className="mb-2 block text-sm text-white/60">
              Drawing speed
            </label>

            <select
              value={drawingSpeed}
              onChange={(event) =>
                setDrawingSpeed(event.target.value)
              }
              className="w-full rounded-lg border border-amber-500/30 bg-[#211006] px-4 py-3 text-white focus:border-amber-400 focus:outline-none"
            >
              {DRAWING_SPEEDS.map((speed) => (
                <option
                  key={speed.value}
                  value={speed.value}
                >
                  {speed.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/60">
            Drawing speed: {drawingSpeed}
          </p>
        )}

        {isHost ? (
          <div className="mt-4">
            <label
              htmlFor="drawing-count"
              className="mb-2 block text-sm text-white/60"
            >
              Number of drawings
            </label>

            <select
              id="drawing-count"
              value={drawingCount}
              onChange={(event) =>
                setDrawingCount(Number(event.target.value))
              }
              className="w-full rounded-lg border border-amber-500/30 bg-[#211006] px-4 py-3 text-white focus:border-amber-400 focus:outline-none"
            >
              {DRAWING_COUNTS.map((count) => (
                <option
                  key={count}
                  value={count}
                >
                  {count}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/60">
            Number of drawings: {drawingCount}
          </p>
        )}

        {isHost ? (
          <div className="mt-4">
            <label
              htmlFor="word-theme"
              className="mb-2 block text-sm text-white/60"
            >
              Word theme
            </label>

            <select
              id="word-theme"
              value={wordTheme}
              onChange={(event) =>
                setWordTheme(event.target.value)
              }
              className="w-full rounded-lg border border-amber-500/30 bg-[#211006] px-4 py-3 text-white focus:border-amber-400 focus:outline-none"
            >
              {WORD_THEMES.map((theme) => (
                <option
                  key={theme.value}
                  value={theme.value}
                >
                  {theme.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/60">
            Word theme: {wordTheme}
          </p>
        )}

        {isHost ? (
          <button
            disabled={!allReady}
            onClick={() => {
              console.log(
                "Start Game clicked, allReady:",
                allReady,
              );

              startGame();
            }}
            className="mt-4 w-full rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-3 font-bold text-black transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
          >
            Start Game
          </button>
        ) : (
          <p className="mt-4 text-sm text-white/60">
            Waiting for host to start…
          </p>
        )}
      </div>
    </main>
  );
}

export default LobbyScreen;
