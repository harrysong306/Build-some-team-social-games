import { createContext } from "react";

// Lets anything inside a room (e.g. the game end
// screen) send the player back to the game list
// after leaving. Provided by App.
export const LeaveRoomContext = createContext<(() => void) | null>(null);
