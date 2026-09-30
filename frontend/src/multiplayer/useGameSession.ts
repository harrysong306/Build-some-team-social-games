import { useEffect, useState } from "react";
import type { Room } from "@colyseus/sdk";

type GameSession = {
  gameMode: string;
  // Keyed by sessionId.
  lives: Record<string, number>;
  usedAbilities: string[];
};

function readSession(room: Room | null): GameSession {
  const state: any = room?.state;
  const players: Map<string, any> | undefined = state?.players;

  return {
    gameMode: state?.gameMode ?? "sketchRecall",
    lives: Object.fromEntries(
      [...(players?.entries() ?? [])].map(
        ([sessionId, player]) => [sessionId, player.lives ?? 0],
      ),
    ),
    usedAbilities: Array.from(state?.usedAbilities ?? []),
  };
}

// In-game state for lives, BE-16 and BE-20, kept
// separate from the lobby's useLobbyState.
export function useGameSession(room: Room | null) {
  const [session, setSession] = useState(() =>
    readSession(room),
  );

  useEffect(() => {
    // Some rooms (e.g. test doubles) don't
    // expose state updates; keep the defaults.
    if (typeof room?.onStateChange !== "function") return;

    const handleStateChange = () => {
      setSession(readSession(room));
    };

    room.onStateChange(handleStateChange);

    return () => {
      room.onStateChange.remove?.(handleStateChange);
    };
  }, [room]);

  return session;
}
