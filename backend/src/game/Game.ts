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

  // BE-26: why the game ended. "" while still playing, then "lives_exhausted" or
  // "rounds_complete" once phase flips to "end". score/lives are already @type fields
  // so clients get those for free from the normal state sync - this is the one extra
  // bit of info they need to know *why* it ended
  @type("string") endReason: string = "";

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
      // BE-26: also clear the previous game's end reason
      this.endReason = "";
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

  // BE-25: lose a shared life. clamped at 0 so it doesn't go negative.
  // BE-26: if that was the last life, end the game right here - no other ticket
  // needs to remember to check this after calling loseLife()
  loseLife() {
    if (this.phase === "end") return; // game's already over, nothing left to lose
    this.lives = Math.max(0, this.lives - 1);
    if (this.isOutOfLives()) {
      this.endGame("lives_exhausted");
    }
  }

  // helper, still useful on its own for anything that wants to check without
  // triggering a state change (e.g. UI showing "last life!" warnings)
  isOutOfLives(): boolean {
    return this.lives <= 0;
  }

  // BE-26: call this once every grid cell has been through recall/guessing
  // (that loop itself is BE-18/24's job, not built yet - this is just the hook
  // for "we made it through the whole game without running out of lives")
  finishAllRounds() {
    if (this.phase === "end") return;
    this.endGame("rounds_complete");
  }

  // BE-26: the actual end-of-game transition. reason is "lives_exhausted" or
  // "rounds_complete" - score/lives are already final @type values at this point,
  // clients get those from normal state sync, no separate broadcast needed
  private endGame(reason: string) {
    this.endReason = reason;
    this.setPhase("end");
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
