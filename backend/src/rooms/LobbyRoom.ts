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

      // BE-8: auto start once at least half the lobby is ready, no more explicit start_game message
      this.checkAutoStart();
    },

    changeName: (client: Client, message: { name: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
  
      const trimmed = message.name?.trim().slice(0, 20);
      if (!trimmed) {
        client.send("name_error", { reason: "Name cannot be empty." });
        return;
      }
    const nameTaken = [...this.state.players.entries()].some(
      ([sessionId, p]) => sessionId !== client.sessionId &&
        p.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (nameTaken) {
      client.send("name_error", { reason: "That name is already taken." });
      return;
    }
    console.log(player.name, "change to:",trimmed);
    player.name = trimmed;
    },
  }

  onCreate (options: any) {
    /**
     * Called when a new room is created.
     */
    this.state.game.init(this.clock);
  }

  onJoin (client: Client, options: any) {
    /**
     * Called when a client joins the room.
     */

    let name = options.name?.trim().slice(0, 20) || "Player";
    const nameTaken = [...this.state.players.values()].some(
      p => p.name.toLowerCase() === name.toLowerCase()
    );
    if (nameTaken) {
      name = `${name}${Math.floor(Math.random() * 1000)}`;
    }
  
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

  // BE-8: start the game once at least half the players in the lobby are ready
  private checkAutoStart() {
    if (this.state.game.phase !== "lobby") return;

    const total = this.state.players.size;
    if (total === 0) return;

    const readyCount = [...this.state.players.values()].filter(p => p.ready).length;

    if (readyCount >= Math.ceil(total / 2)) {
      this.state.game.setPhase("drawing");
    }
  }

  onDispose() {
    /**
     * Called when the room is disposed.
     */
    this.state.game.clearTurnTimer();
    console.log("room", this.roomId, "disposing...");
  }
}
