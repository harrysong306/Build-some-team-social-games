import { useEffect, useState } from "react";
import type { Room } from "@colyseus/sdk";

export type PlayerView = {
  name: string;
  ready: boolean;
  isHost: boolean;
};

// Hook for FE-7/FE-8/FE-9/FE-10: subscribes to the room's player list,
// exposes ready toggle, host game-mode selection, and start game controls
export function useLobbyState(room: Room | null) {
  // mirrors the backend's players MapSchema as a plain object,
  // keyed by sessionId, so React can re-render on changes
  const [players, setPlayers] = useState<Record<string, PlayerView>>({});

  // mirrors the backend's gameMode field
  const [gameMode, setGameModeState] = useState<string>("cooperative");

  useEffect(() => {
    if (!room) return;

    // re-sync the player list and game mode whenever the room state changes
    const handleStateChange = (state: any) => {
      setPlayers(Object.fromEntries(state.players.entries()));
      setGameModeState(state.gameMode);
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

  // FE-9: host selects a game mode (matches backend BE-7 "setGameMode" handler)
  const setGameMode = (mode: string) => {
    room?.send("setGameMode", { mode });
  };

  // FE-10: host starts the game
  // NOTE: backend "start_game" handler (BE-8) doesn't exist yet.
  // Sending an unregistered message type disconnects the client (Colyseus
  // closes with error code 4002), so we hold off sending until BE-8 ships.
  const startGame = () => {
    console.warn("start_game not sent - waiting on backend BE-8");
    // TODO: uncomment once BE-8 is merged
    // room?.send("start_game");
  };

  return {
    players,
    gameMode,
    mySessionId: room?.sessionId ?? "",
    toggleReady,
    setGameMode,
    startGame,
  };
}
