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

  // BE-17: guesses submitted during recall, kept private (not @type) so nobody sees
  // anyone else's guess before reveal - same reasoning as submittedDrawings above.
  // keyed by grid index -> sessionId -> { word, guess }, so BE-18/24 can pull
  // "everyone's guess for this round" later to compute majority / broadcast results.
  // "word" is whatever the frontend sent (the target word for that drawing) - can't
  // validate it against anything server-side yet since word-gen isn't wired in
  private submittedGuesses = new Map<number, Map<string, { word: string; guess: string }>>();

  // BE-19: votes for a currently-proposed ability, keyed by abilityId -> set of
  // sessionIds who voted yes. an abilityId's entry clears once the vote passes,
  // so it can be proposed and voted on again later (BE-20 enforces how many
  // times an ability can actually activate per game, not this). there's no
  // explicit "vote no" here - not sure if that's needed, worth asking the team;
  // for now this only tracks yes votes and checks whether enough are in yet
  private abilityVotes = new Map<string, Set<string>>();

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
      // BE-17: also clear any leftover guesses from a previous game
      this.submittedGuesses.clear();
      // BE-19: also clear any pending ability votes from a previous game
      this.abilityVotes.clear();
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

    // BE-24: broadcast the correct answer + everyone's submitted guesses for a round.
  // this doesn't own guess storage or word data itself - guess storage is BE-17's job
  // and the correct answer comes from word-gen (Aidin's backend_word_gen branch),
  // neither of which exist yet. this is just the broadcast mechanism, so whoever wires
  // those in later has one clear place to call into instead of reinventing it
  broadcastRoundResult(gridIndex: number, correctAnswer: string, guesses: Record<string, string>) {
    this.broadcast?.("round_result", { gridIndex, correctAnswer, guesses });
  }

  // BE-13: store the finished drawing server-side, don't broadcast it to other players yet
  submitDrawing(imageData: string) {
    if (this.phase !== "drawing") return;
    this.submittedDrawings.set(this.currentGridIndex, imageData);
  }

  // BE-17: store a player's guess server-side, without broadcasting it to anyone
  // until reveal (BE-24's broadcastRoundResult is what actually sends it out later).
  // only accepted during recall - a guess sent at any other time is silently dropped
  submitGuess(sessionId: string, word: string, guess: string) {
    if (this.phase !== "recall") return;

    if (!this.submittedGuesses.has(this.currentGridIndex)) {
      this.submittedGuesses.set(this.currentGridIndex, new Map());
    }
    this.submittedGuesses.get(this.currentGridIndex)!.set(sessionId, { word, guess });
  }

  // BE-18/24 will call this to get everyone's guesses for a round (majority calc,
  // then broadcasting via broadcastRoundResult). empty map if nobody's guessed yet
  getGuessesForRound(gridIndex: number): Map<string, { word: string; guess: string }> {
    return this.submittedGuesses.get(gridIndex) ?? new Map();
  }

    // BE-18: call this once all eligible guesses for a round are in, or the guessing
  // timer runs out - neither trigger exists yet, since recall doesn't have its own
  // timer or round-advancement built (that overlaps BE-19/20/21/22, still unbuilt).
  // "eligible" here just means "everyone who actually submitted a guess" - excluding
  // the artist isn't possible yet since drawnBy isn't tracked server-side (BE-16)
  computeMajorityResult(gridIndex: number, correctAnswer: string): {
    correctCount: number;
    totalGuesses: number;
    majorityCorrect: boolean;
  } {
    const guesses = this.getGuessesForRound(gridIndex);
    const normalizedAnswer = correctAnswer.trim().toLowerCase();

    let correctCount = 0;
    const guessesRecord: Record<string, string> = {};
    for (const [sessionId, { guess }] of guesses) {
      guessesRecord[sessionId] = guess;
      if (guess.trim().toLowerCase() === normalizedAnswer) {
        correctCount++;
      }
    }

    const totalGuesses = guesses.size;
    // strict majority - a tie (e.g. 2 correct out of 4) does NOT count, and nobody
    // guessing at all counts as a fail. not 100% sure this is the right call for
    // either case, worth confirming with the team like STARTING_LIVES above
    const majorityCorrect = totalGuesses > 0 && correctCount > totalGuesses / 2;

    if (majorityCorrect) {
      this.addScore(1); // point value per round isn't settled yet either
    } else {
      this.loseLife();
    }

    this.broadcastRoundResult(gridIndex, correctAnswer, guessesRecord);

    return { correctCount, totalGuesses, majorityCorrect };
  }

  // BE-19: record this player's yes vote for an ability, then check if the team
  // has hit the threshold to activate it. threshold is "more than half of
  // everyone currently in the room" - same majority style as BE-18's guesses,
  // but NOT confirmed with the team, worth checking like the other magic
  // numbers in this file. totalPlayers is passed in rather than owned here,
  // same reasoning as computeMajorityResult - Game doesn't have the players map
  voteAbility(sessionId: string, abilityId: string, totalPlayers: number): {
    votes: number;
    totalPlayers: number;
    passed: boolean;
  } {
    if (!this.abilityVotes.has(abilityId)) {
      this.abilityVotes.set(abilityId, new Set());
    }
    const voters = this.abilityVotes.get(abilityId)!;
    voters.add(sessionId);

    const votes = voters.size;
    const passed = totalPlayers > 0 && votes > totalPlayers / 2;

    if (passed) {
      // resolved - clear so this ability can be proposed and voted on again
      // later in the game (BE-20 decides whether it's actually allowed to
      // fire again, based on its own usage-limit tracking)
      this.abilityVotes.delete(abilityId);
    }

    this.broadcast?.("ability_vote_result", { abilityId, votes, totalPlayers, passed });

    return { votes, totalPlayers, passed };
  }

  // BE-19: call this when a player disconnects, so their vote doesn't keep
  // counting toward a threshold they're no longer part of. LobbyRoom's onLeave
  // should call this for every ability the player might have voted on
  removeVoter(sessionId: string) {
    for (const voters of this.abilityVotes.values()) {
      voters.delete(sessionId);
    }
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
