import { useState } from "react";
import { useCreateRoom } from "./useCreateRoom";
import LobbyScreen from "./LobbyScreen";

// FE-4: Implement Create Room UI and connect room creation to backend
function CreateRoomScreen() {
  // draft name typed by the player before creating a room
  const [name, setName] = useState("");

  const { connected, roomId, error, createRoom, room } = useCreateRoom();

  // once the room is created, hand off to the lobby screen (FE-7/FE-8)
  if (connected) {
    return <LobbyScreen room={room} roomId={roomId} />;
  }

  return (
    <div>
      <h2>Sketch Recall</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        maxLength={20}
      />
      <button disabled={!name.trim()} onClick={() => createRoom(name.trim())}>
        Create Room
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export default CreateRoomScreen;
