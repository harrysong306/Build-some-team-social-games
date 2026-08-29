import { useEffect, useState } from "react";
import type { Room } from "@colyseus/sdk";

export type PlayerView = {
  name: string;
  ready: boolean;
  isHost: boolean;
};

// Hook for FE-7/FE-8: subscribes to the room's player list and
// exposes a way to toggle this player's ready state
export function useLobbyState(room: Room | null) {
  // mirrors the backend's players MapSchema as a plain object,
  // keyed by sessionId, so React can re-render on changes
  const [players, setPlayers] = useState<Record<string, PlayerView>>({});

  useEffect(() => {
    if (!room) return;

    // re-sync the player list whenever the room state changes
    const handleStateChange = (state: any) => {
      setPlayers(Object.fromEntries(state.players.entries()));
    };

    room.onStateChange(handleStateChange);

    return () => {
      room.onStateChange.remove(handleStateChange);
    };
  }, [room]);

  // FE-8: sends a message to the backend to flip this player's ready flag
  const toggleReady = () => {
    if (!room) return;
    const me = players[room.sessionId];
    room.send("markReady", { ready: !me?.ready });
  };

  return {
    players,
    mySessionId: room?.sessionId ?? "",
    toggleReady,
  };
}
