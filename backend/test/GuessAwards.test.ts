import assert from "assert";
import { GuessAwards } from "../src/rooms/GuessAwards.js";

// FE-48: pure logic, no room needed.
describe("GuessAwards (FE-48)", () => {
  const answer = (
    sessionId: string,
    text: string,
    points: number,
    submittedAt = 0,
  ) => ({
    sessionId,
    playerName: sessionId.toUpperCase(),
    answer: text,
    points,
    submittedAt,
  });

  it("picks each player's best answer, most points then fastest", () => {
    const awards = new GuessAwards();
    awards.recordRound(0, "cat", 10_000, [
      answer("a", "cat", 4, 9_000),
      answer("b", "cap", 3, 2_000),
      answer("c", "dog", 0, 1_000),
    ]);
    awards.recordRound(1, "dog", 10_000, [
      answer("a", "dog", 4, 2_000),
      answer("b", "dog", 4, 5_000),
    ]);

    const { best } = awards.summary();

    // a's round-1 answer was faster than b's.
    assert.deepStrictEqual(
      best.map((guess) => [guess.sessionId, guess.answer, guess.roundIndex]),
      [["a", "dog", 1], ["b", "dog", 1]],
    );
  });

  it("only lists answers that weren't exactly right as funniest candidates", () => {
    const awards = new GuessAwards();
    awards.recordRound(0, "cat", 10_000, [
      answer("a", "cat", 4),
      answer("b", "a fluffy cloud", 0),
      answer("c", "cap", 3),
    ]);

    assert.deepStrictEqual(
      awards.summary().candidates.map((guess) => guess.answer),
      ["a fluffy cloud", "cap"],
    );
  });

  it("counts one vote per player, lets them change it, and blocks their own answer", () => {
    const awards = new GuessAwards();
    awards.recordRound(0, "cat", 10_000, [
      answer("a", "cloud", 0),
      answer("b", "potato", 0),
      answer("c", "cap", 3),
    ]);

    assert.strictEqual(awards.vote("a", "0:a"), false); // own answer
    assert.strictEqual(awards.vote("a", "nope"), false); // not a candidate
    assert.strictEqual(awards.vote("a", "0:b"), true);
    assert.strictEqual(awards.vote("c", "0:a"), true);
    assert.strictEqual(awards.vote("c", "0:b"), true); // changed mind

    const { funniest } = awards.summary();
    assert.deepStrictEqual(
      funniest.map((guess) => [guess.answer, guess.votes]),
      [["potato", 2]],
    );
  });

  it("keeps at most 3 on each podium", () => {
    const awards = new GuessAwards();
    const players = ["a", "b", "c", "d", "e"];
    awards.recordRound(0, "cat", 10_000, players.map((p) => answer(p, `${p}?`, 1)));

    players.forEach((voter, index) => {
      awards.vote(voter, `0:${players[(index + 1) % players.length]}`);
    });

    const summary = awards.summary();
    assert.strictEqual(summary.best.length, 3);
    assert.strictEqual(summary.funniest.length, 3);
  });

  it("starts over when a new game reaches round 0", () => {
    const awards = new GuessAwards();
    awards.recordRound(0, "cat", 10_000, [answer("a", "cloud", 0), answer("b", "cap", 3)]);
    awards.vote("b", "0:a");

    awards.recordRound(0, "dog", 10_000, [answer("a", "dot", 2)]);

    const summary = awards.summary();
    assert.deepStrictEqual(summary.candidates.map((guess) => guess.answer), ["dot"]);
    assert.strictEqual(summary.funniest.length, 0);
  });
});
