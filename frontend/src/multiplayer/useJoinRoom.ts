import { useCallback, useRef, useState } from "react";
import type { Room } from "@colyseus/sdk";
import { client } from "./colyseusClient";

// Hook for FE-5: handles joining an existing LobbyRoom by its room code
export function useJoinRoom() {
  const roomRef = useRef<Room | null>(null);

  // true once we've successfully joined a room
  const [connected, setConnected] = useState(false);

  // the room code we joined, useful for confirming to the player
  const [roomId, setRoomId] = useState<string | null>(null);

  // error message if the room code is wrong, full, or already started
  const [error, setError] = useState<string | null>(null);

  const joinRoom = useCallback(async (roomCode: string, playerName: string) => {
    try {
      setError(null);
      // note: unlike creating, joining never fails due to a duplicate name -
      // the backend auto-appends a number if the name is taken
      const room = await client.joinById(roomCode.trim(), { name: playerName });
      roomRef.current = room;
      setRoomId(room.roomId);
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join room. Check the code and try again.");
    }
  }, []);

  // expose the raw room instance so the lobby screen can subscribe to it
  return { connected, roomId, error, joinRoom, room: roomRef.current };
}
