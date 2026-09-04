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

function LobbyScreen({ room, roomId }: LobbyScreenProps) {
  const { players, gameMode, phase, mySessionId, toggleReady, setGameMode, startGame } =
    useLobbyState(room);

  // once the host starts the round, every player locally moves into
  // the existing single-player game (not yet actually multiplayer-synced)
  const [roundStarted, setRoundStarted] = useState(false);

  const playerList = Object.entries(players);
  const me = players[mySessionId];
  const isHost = me?.isHost ?? false;
  const allReady = playerList.length > 0 && playerList.every(([, p]) => p.ready);

  if (roundStarted) {
    return <SketchRecallGame onExit={() => setRoundStarted(false)} />;
  }

  if (phase === "playing") {
    return (
      <InstructionsScreen
        onStart={() => setRoundStarted(true)}
        onBack={() => console.log("Back clicked")}
      />
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-12 text-white">
      <div className="mx-auto max-w-md">
        <h2 className="text-2xl font-extrabold">Lobby</h2>
        <p className="mt-1 text-sm text-white/60">Room code: {roomId}</p>

        <ul className="mt-6 space-y-2">
          {playerList.map(([sessionId, player]) => (
            <li
              key={sessionId}
              className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-[#211006] px-4 py-3"
            >
              <span>
                {player.name}
                {player.isHost && " 👑"}
              </span>
              <span className={player.ready ? "text-emerald-400" : "text-white/50"}>
                {player.ready ? "✅ Ready" : "⏳ Not ready"}
              </span>
            </li>
          ))}
        </ul>

        <button
          onClick={toggleReady}
          className="mt-6 w-full rounded-lg border border-amber-400 px-6 py-3 font-bold text-amber-300 transition hover:bg-amber-500/10"
        >
          {me?.ready ? "Cancel Ready" : "Ready"}
        </button>

        {isHost ? (
          <div className="mt-6">
            <label className="mb-2 block text-sm text-white/60">Game mode</label>
            <select
              value={gameMode}
              onChange={(e) => setGameMode(e.target.value)}
              className="w-full rounded-lg border border-amber-500/30 bg-[#211006] px-4 py-3 text-white focus:border-amber-400 focus:outline-none"
            >
              {GAME_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mt-6 text-sm text-white/60">Mode: {gameMode}</p>
        )}

        {isHost ? (
          <button
            disabled={!allReady}
            onClick={() => {
              console.log("Start Game clicked, allReady:", allReady);
              startGame();
            }}
            className="mt-4 w-full rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-3 font-bold text-black transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
          >
            Start Game
          </button>
        ) : (
          <p className="mt-4 text-sm text-white/60">Waiting for host to start…</p>
        )}
      </div>
    </main>
  );
}

export default LobbyScreen;