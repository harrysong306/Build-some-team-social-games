import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";

import appConfig from "../src/app.config.js";
import { GameState } from "../src/rooms/schema/GameState.js";

describe("BE-18 majority result", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  // own port, see the comment in GridIndex.test.ts for why
  before(async () => (colyseus = await boot(appConfig, 2575)));
  after(async () => colyseus.shutdown());
  beforeEach(async () => await colyseus.cleanup());

  it("adds score when the majority guessed correctly", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    const c3 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    const game = (room as any).state.game;
    game.setPhase("recall");

    c1.send("submit_guess", { word: "cat", guess: "cat" });
    c2.send("submit_guess", { word: "cat", guess: "Cat" }); // different case, still counts
    c3.send("submit_guess", { word: "cat", guess: "dog" });
    await room.waitForNextPatch();

    const startingScore = game.score;
    const result = game.computeMajorityResult(0, "cat");

    assert.strictEqual(result.correctCount, 2);
    assert.strictEqual(result.totalGuesses, 3);
    assert.strictEqual(result.majorityCorrect, true);
    assert.strictEqual(game.score, startingScore + 1);
    assert.strictEqual(game.lives, 3); // unchanged, majority was correct
  });

  it("loses a life when the majority guessed incorrectly", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    const c3 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    const game = (room as any).state.game;
    game.setPhase("recall");

    c1.send("submit_guess", { word: "cat", guess: "dog" });
    c2.send("submit_guess", { word: "cat", guess: "dog" });
    c3.send("submit_guess", { word: "cat", guess: "cat" });
    await room.waitForNextPatch();

    const startingScore = game.score;
    const result = game.computeMajorityResult(0, "cat");

    assert.strictEqual(result.correctCount, 1);
    assert.strictEqual(result.majorityCorrect, false);
    assert.strictEqual(game.score, startingScore); // unchanged
    assert.strictEqual(game.lives, 2); // lost one
  });

  it("a tie does not count as a majority", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    const game = (room as any).state.game;
    game.setPhase("recall");

    c1.send("submit_guess", { word: "cat", guess: "cat" });
    c2.send("submit_guess", { word: "cat", guess: "dog" });
    await room.waitForNextPatch();

    const result = game.computeMajorityResult(0, "cat");

    assert.strictEqual(result.correctCount, 1);
    assert.strictEqual(result.totalGuesses, 2);
    assert.strictEqual(result.majorityCorrect, false); // 1 of 2 is a tie, not a majority
    assert.strictEqual(game.lives, 2);
  });

  it("nobody guessing counts as a fail, not a free pass", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    await colyseus.connectTo(room);
    await room.waitForNextPatch();
    const game = (room as any).state.game;
    game.setPhase("recall");

    const result = game.computeMajorityResult(0, "cat");

    assert.strictEqual(result.totalGuesses, 0);
    assert.strictEqual(result.majorityCorrect, false);
    assert.strictEqual(game.lives, 2);
  });

  it("broadcasts the round result as part of computing it", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    const game = (room as any).state.game;
    game.setPhase("recall");

    c1.send("submit_guess", { word: "cat", guess: "cat" });
    await room.waitForNextPatch();

    let received: any = null;
    c1.onMessage("round_result", (data: any) => (received = data));

    game.computeMajorityResult(0, "cat");
    await room.waitForNextPatch();

    assert.ok(received);
    assert.strictEqual(received.gridIndex, 0);
    assert.strictEqual(received.correctAnswer, "cat");
    assert.strictEqual(received.guesses[c1.sessionId], "cat");
  });
});
