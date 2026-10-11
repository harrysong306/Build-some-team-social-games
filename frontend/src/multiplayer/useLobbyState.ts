import { useEffect, useState } from "react";
import type { Room } from "@colyseus/sdk";

export type PlayerView = {
  name: string;
  ready: boolean;
  isHost: boolean;
  questions?: PlayerQuestionView[];
  score: number;
  distractionReady?: boolean;
  distractionDone?: boolean;
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
  const [phase, setPhase] = useState<string>("lobby");
  const [gameWords, setGameWords] = useState<string[]>([]);
  const [assignedPlayerQuestions, setAssignedPlayerQuestions] =
    useState<PlayerQuestionForGame[]>([]);
  // set when the backend rejects a changeName request (empty or taken name)
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!room) return;

    const handleStateChange = (state: any) => {
      // the decoded state instance can exist for a brief moment before
      // its players map has actually been populated by the first data
      // patch (a real race - much more visible in a fast production
      // build than in dev), so guard every field rather than assume
      // a truthy state means fully-populated state
      if (!state) return;

      setPlayers(
        state.players ? Object.fromEntries(state.players.entries()) : {},
      );
      setGameModeState(state.gameMode ?? "sketchRecall");

      // Synced from the backend GameState schema
      setDrawingSpeedState(state.drawingSpeed ?? "normal");
      setDrawingCountState(state.drawingCount ?? 25);
      setWordThemeState(state.wordTheme ?? "general");

      setPhase(state.phase ?? "lobby");
      setGameWords(Array.from(state.gameWords ?? []));
    };

    // onStateChange only fires on the NEXT patch broadcast - a late
    // subscriber (e.g. a component that mounts well after the room
    // joined, like DistractionPhase) would otherwise sit on the empty
    // initial state until some unrelated mutation happens to trigger
    // the next broadcast. room.state is always the current synced
    // state regardless of subscriptions, so seed from it immediately.
    handleStateChange(room.state);

    // some callers pass a minimal room-like object (e.g. test stubs
    // covering only send/onMessage) that doesn't implement state sync
    // at all - skip tracking rather than throw in that case
    const tracksState = typeof room.onStateChange === "function";
    if (tracksState) room.onStateChange(handleStateChange);

    const removeAssignedQuestionsListener = room.onMessage?.(
      "assigned_player_questions",
      (questions: PlayerQuestionForGame[]) => {
        setAssignedPlayerQuestions(questions);
      },
    );

    const unsubscribeNameError = room.onMessage?.(
      "name_error",
      (message: { reason: string }) => {
        setNameError(message.reason);
      },
    );

    return () => {
      if (tracksState) room.onStateChange.remove(handleStateChange);
      removeAssignedQuestionsListener?.();
      unsubscribeNameError?.();
    };
  }, [room]);

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

  const changeName = (name: string) => {
    if (!room) return;
    setNameError(null);
    room.send("changeName", { name });
  };

  return {
    players,
    gameMode,
    drawingSpeed,
    drawingCount,
    wordTheme,
    phase,
    gameWords,
    assignedPlayerQuestions,
    mySessionId: room?.sessionId ?? "",
    nameError,
    toggleReady,
    setGameMode,
    setDrawingSpeed,
    submitPlayerQuestion,
    setDrawingCount,
    setWordTheme,
    startGame,
    returnToLobby,
    changeName,
  };
}