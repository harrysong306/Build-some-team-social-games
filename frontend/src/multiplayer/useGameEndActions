import { useCallback } from "react";
import type { Room } from "@colyseus/sdk";

// Hook for FE-47: play again, change mode, and leave actions after a round ends.
export function useGameEndActions(room: Room | null) {
  // NOTE: backend "play_again" handler (BE-27) doesn't exist yet.
  // Sending an unregistered message type disconnects the client
  // (Colyseus closes with error code 4002), so we hold off sending
  // until BE-27 ships.
  const playAgain = useCallback(() => {
    if (!room) return;
    console.warn("play_again not sent - waiting on backend BE-27");
    // TODO: uncomment once BE-27 is merged
    // room.send("play_again");
  }, [room]);

  // Same story as playAgain - "change_mode" also needs BE-27.
  const changeMode = useCallback(
    (mode: string) => {
      if (!room) return;
      console.warn("change_mode not sent - waiting on backend BE-27:", mode);
      // TODO: uncomment once BE-27 is merged
      // room.send("change_mode", { mode });
    },
    [room],
  );

  // room.leave() is a built-in Colyseus SDK method, not a custom message -
  // this works today regardless of BE-27, since the backend's existing
  // onLeave handler already removes the player from room state.
  const leaveRoom = useCallback(() => {
    room?.leave();
  }, [room]);

  return { playAgain, changeMode, leaveRoom };
}
