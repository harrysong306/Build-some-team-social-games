import { Schema, type } from "@colyseus/schema";

// everything related to the actual game (not lobby/player stuff) lives here
export class Game extends Schema {
  // values: "lobby" | "drawing" | "recall" | "end"
  @type("string") phase: string = "lobby";

  // which cell of the 5x5 grid we're on (0 to 24)
  @type("number") currentGridIndex: number = 0;

  // timestamp (ms) for when the current turn ends, so clients can show a countdown (BE-12)
  @type("number") roundEndTime: number = 0;

  // 5x5 grid = 25 cells total
  private static readonly GRID_SIZE = 25;
  // how long each turn lasts, not sure if this is the real value yet, need to check with Abbas
  private static readonly TURN_DURATION_MS = 60_000;

  private clock: any = null;
  private turnTimer: { clear: () => void } | null = null;

  // room calls this once after creating the game, so we can use the room's clock
  init(clock: any) {
    this.clock = clock;
  }

  setPhase(phase: string) {
    if (this.phase === phase) return;

    this.phase = phase;
    this.clearTurnTimer();
    this.currentGridIndex = 0;

    if (phase === "drawing") {
      this.startTurnTimer();
    }

    console.log("game phase ->", phase);
  }

  advanceGridIndex() {
    if (this.phase !== "drawing") return;

    const next = this.currentGridIndex + 1;

    if (next >= Game.GRID_SIZE) {
      this.setPhase("recall");
      return;
    }

    this.currentGridIndex = next;
    this.startTurnTimer();
  }

  private startTurnTimer() {
    this.clearTurnTimer();
    this.roundEndTime = Date.now() + Game.TURN_DURATION_MS;
    this.turnTimer = this.clock.setTimeout(
      () => this.advanceGridIndex(),
      Game.TURN_DURATION_MS
    );
  }

  clearTurnTimer() {
    if (this.turnTimer) {
      this.turnTimer.clear();
      this.turnTimer = null;
    }
  }
}
