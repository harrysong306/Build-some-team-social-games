import { Room, Client, CloseCode } from "colyseus";
import { GameState, Player } from "./schema/GameState.js";

const VALID_GAME_MODES = ["sketchRecall", "test"] as const;
type GameMode = typeof VALID_GAME_MODES[number];


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
      console.log(player.name, "changed ready to", player.ready);
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
    
    setGameMode: (client: Client, message: { mode: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.isHost) return; // only host may change mode
    
      if (!VALID_GAME_MODES.includes(message.mode as GameMode)) {
        client.send("mode_error", { reason: `Invalid game mode: ${message.mode}` });
        return;
      }
    
      console.log(this.state.gameMode, "Changed to:", message.mode);
      this.state.gameMode = message.mode;
    },

    startGame: (client: Client, message: any) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.isHost) return;
      const allReady = [...this.state.players.values()].every(p => p.ready);
      if (!allReady) return;
      this.state.phase = "playing";
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

  onDispose() {
    /**
     * Called when the room is disposed.
     */

    console.log("room", this.roomId, "disposing...");
  }
}
