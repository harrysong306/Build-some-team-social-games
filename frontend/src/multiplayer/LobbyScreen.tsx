import type { Room } from "colyseus.js";
import { useLobbyState } from "./useLobbyState";

type LobbyScreenProps = {
  room: Room | null;
  roomId: string | null;
};

// FE-7: Display lobby player list and ready status in real time
// FE-8: Implement Ready / Not Ready controls in lobby
function LobbyScreen({ room, roomId }: LobbyScreenProps) {
  const { players, mySessionId, toggleReady } = useLobbyState(room);

  const playerList = Object.entries(players);
  const me = players[mySessionId];

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
    </div>
  );
}

export default LobbyScreen;
