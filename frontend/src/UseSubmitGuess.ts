import { useCallback, useState } from "react";
import type { Room } from "@colyseus/sdk";

// Hook for FE-37: lets a player privately submit their recall guess.
// The guess is sent to the backend (BE-17) and never shown to other
// players until the reveal step - so this hook intentionally does NOT
// expose other players' guesses, only whether *this* player has submitted.
export function useSubmitGuess(room: Room | null) {
  // true once this player has submitted a guess for the current word
  const [submitted, setSubmitted] = useState(false);

  // any error coming back from the backend (e.g. already submitted)
  const [error, setError] = useState<string | null>(null);

  const submitGuess = useCallback(
    (word: string, guess: string) => {
      if (!room) return;
      setError(null);
      room.send("submit_guess", { word, guess });
      setSubmitted(true);
    },
    [room],
  );

  // call this when moving to the next word/drawing, so the submit
  // button resets and the player can guess again
  const resetSubmission = useCallback(() => {
    setSubmitted(false);
    setError(null);
  }, []);

  return { submitted, error, submitGuess, resetSubmission };
}
