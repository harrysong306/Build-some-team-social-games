/*
 * FE-48: Best Guess and Funniest Guess podiums.
 *
 * Every Recall answer of a game is kept here.
 * - Best Guess: each player's best answer (most
 *   points, then the fastest), top 3 players.
 * - Funniest Guess: after the game, players vote
 *   for the funniest answer that wasn't exactly
 *   right. One vote per player (they can change
 *   it), never for their own answer. Top 3 by
 *   votes.
 */

export type Guess = {
  id: string;
  sessionId: string;
  playerName: string;
  answer: string;
  word: string;
  roundIndex: number;
  points: number;
  // Time left on the round clock when answered.
  msLeft: number;
};

export type RoundAnswer = {
  sessionId: string;
  playerName: string;
  answer: string;
  points: number;
  submittedAt: number;
};

export const PODIUM_SIZE = 3;

// 4 points is an exact answer; anything less
// can be voted funniest.
const EXACT_POINTS = 4;

export class GuessAwards {
  private guesses: Guess[] = [];

  // voter sessionId -> guess id
  private votes = new Map<string, string>();

  reset() {
    this.guesses = [];
    this.votes.clear();
  }

  recordRound(
    roundIndex: number,
    word: string,
    deadline: number,
    answers: RoundAnswer[],
  ) {
    // A new game always starts at round 0.
    if (roundIndex === 0) this.reset();

    for (const entry of answers) {
      if (!entry.answer) continue;

      this.guesses.push({
        id: `${roundIndex}:${entry.sessionId}`,
        sessionId: entry.sessionId,
        playerName: entry.playerName,
        answer: entry.answer,
        word,
        roundIndex,
        points: entry.points,
        msLeft: Math.max(0, deadline - entry.submittedAt),
      });
    }
  }

  // Returns false if the vote isn't allowed.
  vote(voterId: string, guessId: string) {
    const guess = this.candidates().find(
      (candidate) => candidate.id === guessId,
    );

    if (!guess || guess.sessionId === voterId) {
      return false;
    }

    this.votes.set(voterId, guessId);
    return true;
  }

  summary() {
    const voteCounts = new Map<string, number>();

    for (const guessId of this.votes.values()) {
      voteCounts.set(
        guessId,
        (voteCounts.get(guessId) ?? 0) + 1,
      );
    }

    const candidates = this.candidates().map(
      (guess) => ({
        ...guess,
        votes: voteCounts.get(guess.id) ?? 0,
      }),
    );

    const funniest = candidates
      .filter((guess) => guess.votes > 0)
      .sort(
        (left, right) =>
          right.votes - left.votes ||
          left.roundIndex - right.roundIndex,
      )
      .slice(0, PODIUM_SIZE);

    return {
      best: this.best(),
      funniest,
      candidates,
    };
  }

  private candidates() {
    return this.guesses.filter(
      (guess) => guess.points < EXACT_POINTS,
    );
  }

  // Each player's best answer, best players first.
  private best() {
    const byPlayer = new Map<string, Guess>();

    for (const guess of this.guesses) {
      if (guess.points <= 0) continue;

      const current = byPlayer.get(guess.sessionId);

      if (
        !current ||
        guess.points > current.points ||
        (guess.points === current.points &&
          guess.msLeft > current.msLeft)
      ) {
        byPlayer.set(guess.sessionId, guess);
      }
    }

    return [...byPlayer.values()]
      .sort(
        (left, right) =>
          right.points - left.points ||
          right.msLeft - left.msLeft,
      )
      .slice(0, PODIUM_SIZE);
  }
}
