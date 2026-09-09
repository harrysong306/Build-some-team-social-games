import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") name: string = "";
  @type("boolean") ready: boolean = false;
  @type("boolean") isHost: boolean = false;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") gameMode: string = "sketchRecall"; // Should have this be editable, with some validation after selection from front end menu dropdown.
  @type("string") phase: string = "lobby";
}