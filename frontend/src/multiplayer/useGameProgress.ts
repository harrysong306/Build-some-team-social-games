import { useEffect, useState } from "react";
import type { Room } from "@colyseus/sdk";

export type PlayerScoreView = {
  name: string;
  score: number;
};

export type GameProgressView = {
  // shared/team lives (cooperative mode) - see BE-18
  lives: number;
  maxLives: number;
  // per-player individual scores - see BE-23
  playerScores: PlayerScoreView[];
  // round progress - not on backend GameState yet
  currentIndex: number;
  totalWords: number;
};

const DEFAULT_PROGRESS: GameProgressView = {
  lives: 3,
  maxLives: 3,
  playerScores: [],
  currentIndex: 0,
  totalWords: 25,
};

// Hook for FE-45: displays game progress, shared lives, and per-player score.
// NOTE: backend GameState doesn't have score/lives/round fields yet
// (BE-23, BE-25). This hook reads them defensively so the UI still
// renders sensible defaults until those land, then will pick up real
// values automatically once the schema is extended.
export function useGameProgress(room: Room | null) {
  const [progress, setProgress] = useState<GameProgressView>(DEFAULT_PROGRESS);

  useEffect(() => {
    if (!room) return;

    const handleStateChange = (state: any) => {
      // state.players is a Colyseus MapSchema, not a plain object -
      // Object.values() on it returns internal implementation details,
      // not the actual player records. Must go through .values() instead.
      const players = state.players ? Array.from(state.players.values()) as any[] : [];

      setProgress({
        lives: state.sharedLives ?? DEFAULT_PROGRESS.lives,
        maxLives: state.maxLives ?? DEFAULT_PROGRESS.maxLives,
        playerScores: players.map((p) => ({
          name: p.name,
          score: p.score ?? 0,
        })),
        currentIndex: state.currentWordIndex ?? DEFAULT_PROGRESS.currentIndex,
        totalWords: state.roundWords?.length ?? DEFAULT_PROGRESS.totalWords,
      });
    };

    room.onStateChange(handleStateChange);

    return () => {
      room.onStateChange.remove(handleStateChange);
    };
  }, [room]);

  return progress;
}
