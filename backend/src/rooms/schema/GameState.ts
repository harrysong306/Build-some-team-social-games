import { Schema, type, MapSchema } from "@colyseus/schema";
import { Game } from "../../game/Game.js";

export class Player extends Schema {
  @type("string") name: string = "";
  @type("boolean") ready: boolean = false;
  @type("boolean") isHost: boolean = false;
  // BE-25: individual point total. game is cooperative by default (shared score/lives
  // live on Game instead) but this is here so a competitive mode can track per-player
  // contribution later without a schema change
  @type("number") points: number = 0;

  // BE-23: bump this player's score on a scoring event (e.g. correct guess).
  // mirrors Game.addScore() - same idea, just scoped to one player instead of the team
  awardPoints(amount: number) {
    this.points += amount;
  }
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") gameMode: string = "sketchRecall"; // Should have this be editable, with some validation after selection from front end menu dropdown.

  @type(Game) game = new Game();
}
