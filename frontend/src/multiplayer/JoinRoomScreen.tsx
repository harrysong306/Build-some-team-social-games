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
    <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-12 text-white">
      <div className="mx-auto max-w-md">
        <h2 className="text-2xl font-extrabold">Join a Game</h2>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={20}
          className="mt-6 w-full rounded-lg border border-amber-500/30 bg-[#211006] px-4 py-3 text-white placeholder:text-white/40 focus:border-amber-400 focus:outline-none"
        />

        <input
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          placeholder="Room code"
          className="mt-4 w-full rounded-lg border border-amber-500/30 bg-[#211006] px-4 py-3 text-white placeholder:text-white/40 focus:border-amber-400 focus:outline-none"
        />

        <button
          disabled={!canJoin}
          onClick={() => joinRoom(roomCode.trim(), name.trim())}
          className="mt-4 w-full rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-3 font-bold text-black transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
        >
          Join Room
        </button>

        {error && <p className="mt-3 text-sm text-red-400" role="alert">{error}</p>}
      </div>
    </main>
  );
}

export default JoinRoomScreen;
