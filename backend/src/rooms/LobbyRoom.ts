import { Room, Client, CloseCode } from "colyseus";
import { GameState, Player } from "./schema/GameState.js";

export class LobbyRoom extends Room {
  maxClients = 8;
  state = new GameState();

  messages = {
    yourMessageType: (client: Client, message: any) => {
      /**
       * Handle "yourMessageType" message.
       */
      console.log(client.sessionId, "sent a message:", message);
    },
    markReady: (client: Client, message: { ready: boolean }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) player.ready = message.ready;
    },


    changeName: (client: Client, message: { name: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
  
      const trimmed = message.name?.trim().slice(0, 20);
      if (!trimmed) {
        client.send("name_error", { reason: "Name cannot be empty." });
        return;
      }
    },

  }

  onCreate (options: any) {
    /**
     * Called when a new room is created.
     */
  }

  onJoin (client: Client, options: any) {
    /**
     * Called when a client joins the room.
     */
    const player = new Player();
    player.name = name;
    player.isHost = this.state.players.size === 0;
    this.state.players.set(client.sessionId, player);
  
    console.log(client.sessionId, "joined as", player.name);
  } 

  onLeave (client: Client, code: CloseCode) {
    /**
     * Called when a client leaves the room.
     */
    const wasHost = this.state.players.get(client.sessionId)?.isHost;
    this.state.players.delete(client.sessionId);

    // reassign host if the host left and players remain
    if (wasHost && this.state.players.size > 0) {
      const nextHost = [...this.state.players.values()][0];
      nextHost.isHost = true;
    }

    console.log(client.sessionId, "left!", code);
  }

  onDispose() {
    /**
     * Called when the room is disposed.
     */
    console.log("room", this.roomId, "disposing...");
  }

}
