import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") name: string = "";
  @type("boolean") ready: boolean = false;
  @type("boolean") isHost: boolean = false;
  // sync points for the distraction phase: set once this player has
  // finished drawing and is ready to start the distraction questions,
  // and once they've finished answering them - the room only lets
  // everyone move on together once every player has each flag set
  @type("boolean") distractionReady: boolean = false;
  @type("boolean") distractionDone: boolean = false;
}


export class DrawingSlot extends Schema {
  @type("string") playerId: string = "";
  @type("string") drawingId: string = "";
  @type("boolean") submitted: boolean = false;
}


export class DrawingSlot extends Schema {
  @type("string") playerId: string = "";
  @type("string") drawingId: string = "";
  @type("boolean") submitted: boolean = false;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") gameMode: string = "sketchRecall"; // Should have this be editable, with some validation after selection from front end menu dropdown.
  @type("string") phase: string = "lobby";
  //not sure if at some point we will want different game state schemas for each game
  @type(["string"])
  gameWords = new ArraySchema<string>();

  @type([DrawingSlot])
  drawingSlots = new ArraySchema<DrawingSlot>();

}

