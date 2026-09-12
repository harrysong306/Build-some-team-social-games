import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";

import appConfig from "../src/app.config.js";
import { GameState } from "../src/rooms/schema/GameState.js";

describe("BE-17 submit_guess", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  // own port, see the comment in GridIndex.test.ts for why
  before(async () => (colyseus = await boot(appConfig, 2574)));
  after(async () => colyseus.shutdown());
  beforeEach(async () => await colyseus.cleanup());

  it("stores a guess server-side during recall, without broadcasting it", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    // fast-forward straight to recall for this test
    (room as any).state.game.setPhase("recall");

    let broadcastReceived = false;
    c1.onMessage("submit_guess", () => (broadcastReceived = true)); // shouldn't fire

    c1.send("submit_guess", { word: "cat", guess: "dog" });
    await room.waitForNextPatch();

    assert.strictEqual(broadcastReceived, false);

    const stored = (room as any).state.game.getGuessesForRound(0);
    assert.strictEqual(stored.get(c1.sessionId)?.word, "cat");
    assert.strictEqual(stored.get(c1.sessionId)?.guess, "dog");
  });

  it("keeps each player's guess separate for the same round", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    (room as any).state.game.setPhase("recall");

    c1.send("submit_guess", { word: "cat", guess: "kitten" });
    c2.send("submit_guess", { word: "cat", guess: "puppy" });
    await room.waitForNextPatch();

    const stored = (room as any).state.game.getGuessesForRound(0);
    assert.strictEqual(stored.size, 2);
    assert.strictEqual(stored.get(c1.sessionId)?.guess, "kitten");
    assert.strictEqual(stored.get(c2.sessionId)?.guess, "puppy");
  });

  it("ignores a guess sent outside the recall phase", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    // still in "drawing" (or "lobby") here, not "recall"

    c1.send("submit_guess", { word: "cat", guess: "dog" });
    await room.waitForNextPatch();

    const stored = (room as any).state.game.getGuessesForRound(0);
    assert.strictEqual(stored.size, 0);
  });

  it("a later guess from the same player overwrites their earlier one", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    (room as any).state.game.setPhase("recall");

    c1.send("submit_guess", { word: "cat", guess: "dog" });
    await room.waitForNextPatch();
    c1.send("submit_guess", { word: "cat", guess: "kitten" });
    await room.waitForNextPatch();

    const stored = (room as any).state.game.getGuessesForRound(0);
    assert.strictEqual(stored.size, 1);
    assert.strictEqual(stored.get(c1.sessionId)?.guess, "kitten");
  });

  it("getGuessesForRound() returns empty for a round nobody has guessed on", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    await colyseus.connectTo(room);
    await room.waitForNextPatch();
    (room as any).state.game.setPhase("recall");

    const stored = (room as any).state.game.getGuessesForRound(0);
    assert.strictEqual(stored.size, 0);
  });

  it("clears old guesses when a fresh game starts", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    (room as any).state.game.setPhase("recall");

    c1.send("submit_guess", { word: "cat", guess: "dog" });
    await room.waitForNextPatch();
    assert.strictEqual((room as any).state.game.getGuessesForRound(0).size, 1);

    // simulate BE-27 play again
    (room as any).state.game.setPhase("drawing");

    assert.strictEqual((room as any).state.game.getGuessesForRound(0).size, 0);
  });
});
