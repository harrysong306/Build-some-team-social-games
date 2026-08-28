import { useState } from "react";
import { useJoinRoom } from "./useJoinRoom";

// FE-5: Implement Join Room UI using room code or invite link
function JoinRoomScreen() {
  // draft name typed by the player before joining
  const [name, setName] = useState("");

  // room code typed by the player
  const [roomCode, setRoomCode] = useState("");

  const { connected, roomId, error, joinRoom } = useJoinRoom();

  const canJoin = name.trim().length > 0 && roomCode.trim().length > 0;

  // once joined, show a simple confirmation instead of the form
  if (connected) {
    return (
      <div>
        <h2>Joined room!</h2>
        <p>Room code: {roomId}</p>
      </div>
    );
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
