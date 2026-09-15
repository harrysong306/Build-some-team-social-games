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
  const [gameWords, setGameWords] = useState<string[]>([]);
  // set when the backend rejects a changeName request (empty or taken name)
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!room) return;

    const handleStateChange = (state: any) => {
      setPlayers(Object.fromEntries(state.players.entries()));
      setGameModeState(state.gameMode);
      setPhase(state.phase);
      setGameWords(Array.from(state.gameWords ?? []));
    };

    room.onStateChange(handleStateChange);

    const unsubscribeNameError = room.onMessage(
      "name_error",
      (message: { reason: string }) => {
        setNameError(message.reason);
      },
    );

    return () => {
      room.onStateChange.remove(handleStateChange);
      unsubscribeNameError();
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

  const changeName = (name: string) => {
    if (!room) return;
    setNameError(null);
    room.send("changeName", { name });
  };

  return {
    players,
    gameMode,
    phase,
    gameWords,
    mySessionId: room?.sessionId ?? "",
    nameError,
    toggleReady,
    setGameMode,
    startGame,
    changeName,
  };
}