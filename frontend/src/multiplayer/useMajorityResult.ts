import { useEffect, useState } from "react";
import type { Room } from "@colyseus/sdk";

export type MajorityResultView = {
  word: string;
  majorityGuess: string | null;
  isCorrect: boolean;
  guessCounts: Record<string, number>;
};

const DEFAULT_RESULT: MajorityResultView = {
  word: "",
  majorityGuess: null,
  isCorrect: false,
  guessCounts: {},
};

// Hook for FE-38: reads the majority-vote result for the current word.
// NOTE: backend doesn't broadcast this yet (BE-18 - majority vote judging).
// Defaults keep the UI safe until that lands.
export function useMajorityResult(room: Room | null) {
  const [result, setResult] = useState<MajorityResultView>(DEFAULT_RESULT);

  useEffect(() => {
    if (!room) return;

    const handleStateChange = (state: any) => {
      const roundResult = state.lastRoundResult;
      if (!roundResult) return;

      setResult({
        word: roundResult.word ?? "",
        majorityGuess: roundResult.majorityGuess ?? null,
        isCorrect: roundResult.isCorrect ?? false,
        guessCounts: roundResult.guessCounts ?? {},
      });
    };

    room.onStateChange(handleStateChange);

    return () => {
      room.onStateChange.remove(handleStateChange);
    };
  }, [room]);

  return result;
}
