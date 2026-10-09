import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class PlayerQuestion extends Schema {
  @type("string") prompt: string = "";
  @type(["string"]) options = new ArraySchema<string>();
}

export class Player extends Schema {
  @type("string") name: string = "";
  @type("boolean") ready: boolean = false;
  @type("boolean") isHost: boolean = false;
  // The prompt and options are public; the correct option stays server-side.
  @type([PlayerQuestion]) questions = new ArraySchema<PlayerQuestion>();
  @type("number") score: number = 0;
  // Reset to STARTING_LIVES (LobbyRoom.ts) when a game starts.
  @type("number") lives: number = 3;
}

export class DrawingSlot extends Schema {
  @type("string") playerId: string = "";
  @type("string") drawingId: string = "";
  @type("boolean") submitted: boolean = false;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") gameMode: string = "sketchRecall"; // Should have this be editable, with some validation after selection from front end menu dropdown.
  @type("string") drawingSpeed: string = "normal"; // Updated by the host through setDrawingSpeed.
  @type("number") drawingCount: number = 25; // Updated by the host through setDrawingCount. Independent of drawingSpeed.
  @type("string") wordTheme: string = "general";
  @type("boolean") playerQuestionsEnabled: boolean = true;
  @type("string") phase: string = "lobby";
  //not sure if at some point we will want different game state schemas for each game
  @type(["string"])
  gameWords = new ArraySchema<string>();

  @type([DrawingSlot])
  drawingSlots = new ArraySchema<DrawingSlot>();

  // Team abilities already spent this game (BE-20).
  @type(["string"])
  usedAbilities = new ArraySchema<string>();

}
