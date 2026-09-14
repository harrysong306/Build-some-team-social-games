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
  const [gameMode, setGameModeState] = useState<string>("sketchRecall");

  // phase lives on state.game (not state.phase) - see backend/src/game/Game.ts
  const [phase, setPhase] = useState<string>("lobby");

  // FE-18: which of the 25 grid cells is currently active, and when the
  // server will auto-advance to the next one. Both are server-authoritative
  // (BE-12) - the drawing phase UI should follow these, not run its own timer
  const [currentGridIndex, setCurrentGridIndex] = useState(0);
  const [roundEndTime, setRoundEndTime] = useState(0);

  useEffect(() => {
    if (!room) return;

    // re-sync everything whenever room state changes
    const handleStateChange = (state: any) => {
      setPlayers(Object.fromEntries(state.players.entries()));
      setGameModeState(state.gameMode);
      setPhase(state.game.phase);
      setCurrentGridIndex(state.game.currentGridIndex);
      setRoundEndTime(state.game.roundEndTime);
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

  // FE-10: host starts the game (matches backend BE-8 "startGame" handler)
  // optional early start - game also auto-starts once half the lobby is ready
  const startGame = () => {
    room?.send("startGame");
  };

  return {
    players,
    gameMode,
    phase,
    currentGridIndex,
    roundEndTime,
    mySessionId: room?.sessionId ?? "",
    toggleReady,
    setGameMode,
    startGame,
  };
}
