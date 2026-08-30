import type { Room } from "@colyseus/sdk";
import { useLobbyState } from "./useLobbyState";

type LobbyScreenProps = {
  room: Room | null;
  roomId: string | null;
};

const GAME_MODES = [
  { value: "cooperative", label: "Cooperative" },
  { value: "competitive", label: "Competitive" },
];

// FE-7: Display lobby player list and ready status in real time
// FE-8: Implement Ready / Not Ready controls in lobby
// FE-9: Implement host game-mode selection controls
// FE-10: Implement host Start Game button and start-state handling
function LobbyScreen({ room, roomId }: LobbyScreenProps) {
  const { players, gameMode, mySessionId, toggleReady, setGameMode, startGame } =
    useLobbyState(room);

  const playerList = Object.entries(players);
  const me = players[mySessionId];
  const isHost = me?.isHost ?? false;
  const allReady = playerList.length > 0 && playerList.every(([, p]) => p.ready);

  return (
    <div>
      <h2>Lobby</h2>
      <p>Room code: {roomId}</p>

      <ul>
        {playerList.map(([sessionId, player]) => (
          <li key={sessionId}>
            {player.name}
            {player.isHost && " 👑"}
            {" — "}
            {player.ready ? "✅ Ready" : "⏳ Not ready"}
          </li>
        ))}
      </ul>

      <button onClick={toggleReady}>
        {me?.ready ? "Cancel Ready" : "Ready"}
      </button>

      {/* FE-9: only the host can change the game mode */}
      {isHost ? (
        <div>
          <label>Game mode: </label>
          <select value={gameMode} onChange={(e) => setGameMode(e.target.value)}>
            {GAME_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p>Mode: {gameMode}</p>
      )}

      {/* FE-10: only the host can start the game, and only once everyone is ready */}
      {isHost ? (
        <button disabled={!allReady} onClick={startGame}>
          Start Game
        </button>
      ) : (
        <p>Waiting for host to start…</p>
      )}
    </div>
  );
}

export default LobbyScreen;
