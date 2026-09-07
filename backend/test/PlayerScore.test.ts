import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";

import appConfig from "../src/app.config.js";
import { GameState } from "../src/rooms/schema/GameState.js";

describe("BE-23 per-player score", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  // own port, see the comment in GridIndex.test.ts for why
  before(async () => (colyseus = await boot(appConfig, 2572)));
  after(async () => colyseus.shutdown());
  beforeEach(async () => await colyseus.cleanup());

  it("awardPoints() bumps only the target player's score", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room, { name: "Jordan" });
    const c2 = await colyseus.connectTo(room, { name: "Sam" });
    await room.waitForNextPatch();

    const p1 = room.state.players.get(c1.sessionId)!;
    const p2 = room.state.players.get(c2.sessionId)!;
    assert.strictEqual(p1.points, 0);
    assert.strictEqual(p2.points, 0);

    p1.awardPoints(10);
    await room.waitForNextPatch();

    assert.strictEqual(p1.points, 10);
    assert.strictEqual(p2.points, 0); // untouched
  });

  it("accumulates across multiple scoring events", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room, { name: "Jordan" });
    await room.waitForNextPatch();

    const p1 = room.state.players.get(c1.sessionId)!;
    p1.awardPoints(5);
    p1.awardPoints(3);
    p1.awardPoints(2);

    assert.strictEqual(p1.points, 10);
  });

  it("points reset to 0 for everyone when a fresh game starts (BE-25's checkAutoStart reset)", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room, { name: "Jordan" });
    await room.waitForNextPatch();

    const p1 = room.state.players.get(c1.sessionId)!;
    p1.awardPoints(7);
    assert.strictEqual(p1.points, 7);

    c1.send("markReady", { ready: true }); // solo lobby, this triggers auto-start
    await room.waitForNextPatch();

    assert.strictEqual(p1.points, 0);
  });
});
