import { useEffect, useState } from "react";
import type { Room } from "@colyseus/sdk";

export type PlayerView = {
  name: string;
  ready: boolean;
  isHost: boolean;
};

export function useLobbyState(room: Room | null) {
  const [players, setPlayers] = useState<Record<string, PlayerView>>({});
  const [gameMode, setGameModeState] = useState<string>("sketchRecall");
  const [phase, setPhase] = useState<string>("lobby");

  useEffect(() => {
    if (!room) return;

    const handleStateChange = (state: any) => {
      setPlayers(Object.fromEntries(state.players.entries()));
      setGameModeState(state.gameMode);
      setPhase(state.phase);
    };

    room.onStateChange(handleStateChange);

    return () => {
      room.onStateChange.remove(handleStateChange);
    };
  }, [room]);

  const toggleReady = () => {
    if (!room) return;
    const me = players[room.sessionId];
    room.send("markReady", { ready: !me?.ready });
  };

  const setGameMode = (mode: string) => {
    room?.send("setGameMode", { mode });
  };

  const startGame = () => {
    room?.send("startGame");
  };

  return {
    players,
    gameMode,
    phase,
    mySessionId: room?.sessionId ?? "",
    toggleReady,
    setGameMode,
    startGame,
  };
}