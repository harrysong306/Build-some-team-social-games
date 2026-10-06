import { useEffect, useState } from "react";
import type { Room } from "@colyseus/sdk";

export type PlayerView = {
  name: string;
  ready: boolean;
  isHost: boolean;
  questions?: PlayerQuestionView[];
  score: number;
};

export type PlayerQuestionView = {
  prompt: string;
  options: string[];
};

export type PlayerQuestionForGame = PlayerQuestionView & {
  ownerSessionId: string;
  questionIndex: number;
  ownerName: string;
  score: number;
};

export function useLobbyState(room: Room | null) {
  const [players, setPlayers] = useState<Record<string, PlayerView>>({});
  const [gameMode, setGameModeState] = useState<string>("sketchRecall");
  const [drawingSpeed, setDrawingSpeedState] = useState<string>("normal");
  const [drawingCount, setDrawingCountState] = useState<number>(25);
  const [wordTheme, setWordThemeState] = useState<string>("general");
  const [playerQuestionsEnabled, setPlayerQuestionsEnabledState] =
     useState<boolean>(true);
  const [phase, setPhase] = useState<string>("lobby");
  const [gameWords, setGameWords] = useState<string[]>([]);
  const [assignedPlayerQuestions, setAssignedPlayerQuestions] =
    useState<PlayerQuestionForGame[]>([]);

  useEffect(() => {
    if (!room) return;

    const handleStateChange = (state: any) => {
      setPlayers(Object.fromEntries(state.players.entries()));
      setGameModeState(state.gameMode);

      // Synced from the backend GameState schema
      setDrawingSpeedState(state.drawingSpeed ?? "normal");
      setDrawingCountState(state.drawingCount ?? 25);
      setWordThemeState(state.wordTheme ?? "general");
      setPlayerQuestionsEnabledState(
        state.playerQuestionsEnabled ?? true,
      );

      setPhase(state.phase);
      setGameWords(Array.from(state.gameWords ?? []));
    };
    room.onStateChange(handleStateChange);

    const removeAssignedQuestionsListener = room.onMessage?.(
      "assigned_player_questions",
      (questions: PlayerQuestionForGame[]) => {
        setAssignedPlayerQuestions(questions);
      },
    );

    return () => {
      room.onStateChange.remove(handleStateChange);
      removeAssignedQuestionsListener?.();
    };
  }, 
  [room]);
  const setPlayerQuestionsEnabled = (enabled: boolean) => {
     room?.send("setPlayerQuestionsEnabled", { enabled });
     };

  const toggleReady = () => {
    if (!room) return;

    const me = players[room.sessionId];

    room.send("markReady", {
      ready: !me?.ready,
    });
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

  // Sends { count } to LobbyRoom.ts using "setDrawingCount"
  const setDrawingCount = (count: number) => {
    room?.send("setDrawingCount", { count });
  };

  const setWordTheme = (theme: string) => {
    room?.send("setWordTheme", { theme });
  };

  const startGame = () => {
    room?.send("startGame");
  };

  const returnToLobby = () => {
    room?.send("returnToLobby");
  };

  return {
    players,
    gameMode,
    drawingSpeed,
    drawingCount,
    wordTheme,
    playerQuestionsEnabled,
    phase,
    gameWords,
    assignedPlayerQuestions,
    mySessionId: room?.sessionId ?? "",
    toggleReady,
    setGameMode,
    setDrawingSpeed,
    submitPlayerQuestion,
    setDrawingCount,
    setWordTheme,
    setPlayerQuestionsEnabled,
    startGame,
    returnToLobby,
  };
}
