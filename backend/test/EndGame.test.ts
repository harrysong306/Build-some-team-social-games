import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";

import appConfig from "../src/app.config.js";
import { GameState } from "../src/rooms/schema/GameState.js";

describe("BE-26 end-of-game detection", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  before(async () => (colyseus = await boot(appConfig)));
  after(async () => colyseus.shutdown());
  beforeEach(async () => await colyseus.cleanup());

  it("ends the game with lives_exhausted once lives hit 0", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    c1.send("markReady", { ready: true });
    await room.waitForNextPatch();

    const game = (room as any).state.game;
    assert.strictEqual(game.lives, 3);

    game.loseLife();
    game.loseLife();
    assert.strictEqual(game.phase, "drawing"); // still 1 life left, game keeps going

    game.loseLife();
    await room.waitForNextPatch();

    assert.strictEqual(game.lives, 0);
    assert.strictEqual(game.phase, "end");
    assert.strictEqual(game.endReason, "lives_exhausted");
  });

  it("loseLife() past 0 doesn't go negative or re-trigger the end", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    c1.send("markReady", { ready: true });
    await room.waitForNextPatch();

    const game = (room as any).state.game;
    game.loseLife();
    game.loseLife();
    game.loseLife();
    game.loseLife(); // one extra call after already at 0/end

    assert.strictEqual(game.lives, 0);
    assert.strictEqual(game.phase, "end");
    assert.strictEqual(game.endReason, "lives_exhausted");
  });

  it("finishAllRounds() ends the game with rounds_complete", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    c1.send("markReady", { ready: true });
    await room.waitForNextPatch();

    const game = (room as any).state.game;
    game.finishAllRounds();
    await room.waitForNextPatch();

    assert.strictEqual(game.phase, "end");
    assert.strictEqual(game.endReason, "rounds_complete");
    assert.strictEqual(game.lives, 3); // survived with all lives intact
  });

  it("resets endReason when a fresh game starts (BE-27 play again)", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    c1.send("markReady", { ready: true });
    await room.waitForNextPatch();

    const game = (room as any).state.game;
    game.finishAllRounds();
    assert.strictEqual(game.endReason, "rounds_complete");

    // simulate BE-27 kicking off a new game
    game.setPhase("drawing");
    assert.strictEqual(game.endReason, "");
    assert.strictEqual(game.lives, 3);
  });
});
