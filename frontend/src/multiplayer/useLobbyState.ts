import { useEffect, useState } from "react";
import type { Room } from "@colyseus/sdk";

export type PlayerView = {
  name: string;
  ready: boolean;
  isHost: boolean;
  questions?: PlayerQuestionView[];
};

export type PlayerQuestionView = {
  prompt: string;
  options: string[];
};

export function useLobbyState(room: Room | null) {
  const [players, setPlayers] = useState<Record<string, PlayerView>>({});
  const [gameMode, setGameModeState] = useState<string>("sketchRecall");
  const [drawingSpeed, setDrawingSpeedState] = useState<string>("normal");
  const [phase, setPhase] = useState<string>("lobby");
  const [gameWords, setGameWords] = useState<string[]>([]);

  useEffect(() => {
    if (!room) return;

    const handleStateChange = (state: any) => {
      setPlayers(Object.fromEntries(state.players.entries()));
      setGameModeState(state.gameMode);

      // Synced from the backend GameState schema
      setDrawingSpeedState(state.drawingSpeed ?? "normal");

      setPhase(state.phase);
      setGameWords(Array.from(state.gameWords ?? []));
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

  // Sends { speed } to LobbyRoom.ts using "setDrawingSpeed"
  const setDrawingSpeed = (speed: string) => {
    room?.send("setDrawingSpeed", { speed });
  };

  // Correct answers are intentionally not sent to the client in this message.
  const submitPlayerQuestion = (
    prompt: string,
    options: string[],
    correctOption: number,
  ) => {
    room?.send("submitPlayerQuestion", {
      prompt,
      options,
      correctOption,
    });
  };

  const startGame = () => {
    room?.send("startGame");
  };

  return {
    players,
    gameMode,
    drawingSpeed,
    phase,
    gameWords,
    mySessionId: room?.sessionId ?? "",
    toggleReady,
    setGameMode,
    setDrawingSpeed,
    submitPlayerQuestion,
    startGame,
  };
}