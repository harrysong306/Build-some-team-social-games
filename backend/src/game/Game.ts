import { Schema, type } from "@colyseus/schema";

// everything related to the actual game (not lobby/player stuff) lives here
export class Game extends Schema {
  // values: "lobby" | "drawing" | "recall" | "end"
  @type("string") phase: string = "lobby";

  // which cell of the 5x5 grid we're on (0 to 24)
  @type("number") currentGridIndex: number = 0;

  // timestamp (ms) for when the current turn ends, so clients can show a countdown (BE-12)
  @type("number") roundEndTime: number = 0;

  // BE-25: shared team score/lives, game is cooperative by default so these live on the
  // Game itself rather than per-player. not sure STARTING_LIVES is the real value yet,
  // same situation as TURN_DURATION_MS below - need to confirm with Abbas
  @type("number") score: number = 0;
  @type("number") lives: number = Game.STARTING_LIVES;

  // 5x5 grid = 25 cells total
  private static readonly GRID_SIZE = 25;
  // how long each turn lasts, not sure if this is the real value yet, need to check with Abbas
  private static readonly TURN_DURATION_MS = 60_000;
  private static readonly STARTING_LIVES = 3;

  private clock: any = null;
  private turnTimer: { clear: () => void } | null = null;
  private broadcast: ((type: string, message?: any) => void) | null = null;

  // finished drawings, keyed by grid index. NOT a @type field on purpose -
  // this way colyseus never auto-syncs it to clients while drawing is happening (BE-13)
  private submittedDrawings = new Map<number, string>();

  // room calls this once after creating the game, so we can use the room's clock + broadcast
  init(clock: any, broadcast: (type: string, message?: any) => void) {
    this.clock = clock;
    this.broadcast = broadcast;
  }

  setPhase(phase: string) {
    if (this.phase === phase) return;

    this.phase = phase;
    this.clearTurnTimer();
    this.currentGridIndex = 0;

    if (phase === "drawing") {
      this.submittedDrawings.clear();
      // BE-25: fresh game starting (or play again via BE-27), reset shared score/lives
      this.score = 0;
      this.lives = Game.STARTING_LIVES;
      this.startTurnTimer();
    }

    // BE-14: only reveal drawing data once we actually reach recall, not before
    if (phase === "recall") {
      this.broadcast?.("reveal_drawings", this.revealDrawings());
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

  // BE-25: bump shared score. actual point values/rules are BE-23's job, this just
  // owns the state update so BE-23 doesn't need to touch @type fields directly
  addScore(amount: number) {
    this.score += amount;
  }

  // BE-25: lose a shared life. clamped at 0 so it doesn't go negative -
  // BE-26 checks this.lives === 0 for the end-of-game condition
  loseLife() {
    this.lives = Math.max(0, this.lives - 1);
  }

  // BE-26 will likely call this to decide when to move to "end" phase
  isOutOfLives(): boolean {
    return this.lives <= 0;
  }

  // BE-13: store the finished drawing server-side, don't broadcast it to other players yet
  submitDrawing(imageData: string) {
    if (this.phase !== "drawing") return;
    this.submittedDrawings.set(this.currentGridIndex, imageData);
  }

  // called once we move to "recall", sends everything that was submitted during drawing
  private revealDrawings() {
    return Array.from(this.submittedDrawings.entries()).map(([gridIndex, imageData]) => ({
      gridIndex,
      imageData,
    }));
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
