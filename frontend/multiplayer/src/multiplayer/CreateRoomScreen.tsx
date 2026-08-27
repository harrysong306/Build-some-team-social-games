import { useState } from "react";
import { useCreateRoom } from "./useCreateRoom";

// FE-4: Implement Create Room UI and connect room creation to backend
function CreateRoomScreen() {
  // draft name typed by the player before creating a room
  const [name, setName] = useState("");

  const { connected, roomId, error, createRoom } = useCreateRoom();

  // once the room is created, show the room code instead of the form
  if (connected) {
    return (
      <div>
        <h2>Room created!</h2>
        <p>Room code: {roomId}</p>
      </div>
    );
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
