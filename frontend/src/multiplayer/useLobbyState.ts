import { useEffect, useState } from "react";
import type { Room } from "@colyseus/sdk";

export type PlayerView = {
  name: string;
  ready: boolean;
  isHost: boolean;
  distractionReady: boolean;
  distractionDone: boolean;
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