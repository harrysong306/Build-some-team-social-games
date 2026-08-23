import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") name: string = "";
  @type("boolean") ready: boolean = false;
  @type("boolean") isHost: boolean = false;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") gameMode: string = "cooperative"; // Should have this be editable, with some validation after selection from front end menu dropdown.

  // phase of the room, changes when BE-8 (start_game) runs
  // values: "lobby" | "drawing" | "recall" | "end"
  @type("string") phase: string = "lobby";

  // which cell of the 5x5 grid we're on (0 to 24)
  @type("number") currentGridIndex: number = 0;
}
