import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";

import appConfig from "../src/app.config.js";
import { GameState } from "../src/rooms/schema/GameState.js";

describe("BE-24 round result broadcast", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  // own port, see the comment in GridIndex.test.ts for why
  before(async () => (colyseus = await boot(appConfig, 2573)));
  after(async () => colyseus.shutdown());
  beforeEach(async () => await colyseus.cleanup());

  it("broadcasts the correct answer and guesses to all connected clients", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    let result1: any = null;
    let result2: any = null;
    c1.onMessage("round_result", (data: any) => (result1 = data));
    c2.onMessage("round_result", (data: any) => (result2 = data));

    const guesses = { [c1.sessionId]: "cat", [c2.sessionId]: "dog" };
    (room as any).state.game.broadcastRoundResult(3, "cat", guesses);
    await room.waitForNextPatch();

    for (const result of [result1, result2]) {
      assert.ok(result, "expected round_result broadcast to reach every client");
      assert.strictEqual(result.gridIndex, 3);
      assert.strictEqual(result.correctAnswer, "cat");
      assert.deepStrictEqual(result.guesses, guesses);
    }
  });

  it("does nothing before init() has wired up a broadcast function", async () => {
    // a bare Game instance (no room, no init()) shouldn't throw just because
    // nobody's listening yet - broadcast defaults to null and is optional-chained
    const { Game } = await import("../src/game/Game.js");
    const game = new Game();
    assert.doesNotThrow(() => game.broadcastRoundResult(0, "cat", {}));
  });
});
