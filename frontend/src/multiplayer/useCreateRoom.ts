import { useCallback, useRef, useState } from "react";
import type { Room } from "@colyseus/sdk";
import { client } from "./colyseusClient";

// Hook for FE-4: handles creating a new LobbyRoom on the backend
export function useCreateRoom() {
  // holds the actual Colyseus room instance once created
  const roomRef = useRef<Room | null>(null);

  // true once we've successfully created and joined a room
  const [connected, setConnected] = useState(false);

  // the room code, shown to the player so others could join later (FE-5)
  const [roomId, setRoomId] = useState<string | null>(null);

  // any error message from the backend (e.g. connection failure)
  const [error, setError] = useState<string | null>(null);

  const createRoom = useCallback(async (playerName: string) => {
    try {
      setError(null);
      // ask the backend to create a new LobbyRoom, passing our name
      const room = await client.create("LobbyRoom", { name: playerName });
      roomRef.current = room;
      setRoomId(room.roomId);
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    }
  }, []);

  // expose the raw room instance so the lobby screen can subscribe to it
  return { connected, roomId, error, createRoom, room: roomRef.current };
}
