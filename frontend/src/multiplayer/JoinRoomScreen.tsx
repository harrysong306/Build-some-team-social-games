import { useState } from "react";
import { useJoinRoom } from "./useJoinRoom";
import LobbyScreen from "./LobbyScreen";

// FE-5: Implement Join Room UI using room code or invite link
function JoinRoomScreen() {
  // draft name typed by the player before joining
  const [name, setName] = useState("");

  // room code typed by the player
  const [roomCode, setRoomCode] = useState("");

  const { connected, roomId, error, joinRoom, room } = useJoinRoom();

  const canJoin = name.trim().length > 0 && roomCode.trim().length > 0;

  // once joined, hand off to the lobby screen (FE-7/FE-8)
  if (connected) {
    return <LobbyScreen room={room} roomId={roomId} />;
  }

  return (
    <div>
      <h2>Join a Game</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        maxLength={20}
      />
      <input
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        placeholder="Room code"
      />
      <button disabled={!canJoin} onClick={() => joinRoom(roomCode.trim(), name.trim())}>
        Join Room
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export default JoinRoomScreen;
