import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";

import appConfig from "../src/app.config.js";
import { GameState } from "../src/rooms/schema/GameState.js";

describe("BE-8 / BE-10 / BE-12 / BE-13 / BE-14 with a real local room", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  before(async () => (colyseus = await boot(appConfig)));
  after(async () => colyseus.shutdown());
  beforeEach(async () => await colyseus.cleanup());

  it("starts in lobby phase with grid index 0", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    assert.strictEqual(room.state.game.phase, "lobby");
    assert.strictEqual(room.state.game.currentGridIndex, 0);
  });

  it("BE-8: auto-starts once at least half the lobby is ready", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    const c3 = await colyseus.connectTo(room);
    const c4 = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    // only 1 of 4 ready -> should still be in lobby
    c1.send("markReady", { ready: true });
    await room.waitForNextPatch();
    assert.strictEqual(room.state.game.phase, "lobby");

    // 2 of 4 ready (exactly half) -> should auto start
    c2.send("markReady", { ready: true });
    await room.waitForNextPatch();
    assert.strictEqual(room.state.game.phase, "drawing");
  });

  it("BE-12: sets roundEndTime when entering the drawing phase", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    c1.send("markReady", { ready: true });
    await room.waitForNextPatch();

    assert.ok(room.state.game.roundEndTime > Date.now());
  });

  it("BE-13/14: drawing is stored but not exposed until recall", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    c1.send("markReady", { ready: true });
    await room.waitForNextPatch();

    c1.send("submitDrawing", { imageData: "fake_base64" });
    await room.waitForNextPatch();

    // client state should NOT contain drawing data yet (it's a plain server-side
    // field, not a @type, so it should never show up in the synced state at all)
    assert.strictEqual((c1.state.game as any).submittedDrawings, undefined);

    // force the grid to finish so we transition into recall and reveal fires
    room.onMessage("reveal_drawings", () => {}); // just making sure the type exists, no-op

    let revealed: any = null;
    c1.onMessage("reveal_drawings", (data: any) => (revealed = data));

    for (let i = 0; i < 25; i++) {
      (room as any).state.game.advanceGridIndex();
    }
    await room.waitForNextPatch();

    assert.strictEqual(room.state.game.phase, "recall");
    assert.ok(revealed, "expected reveal_drawings broadcast after recall transition");
    assert.strictEqual(revealed[0].gridIndex, 0);
    assert.strictEqual(revealed[0].imageData, "fake_base64");
  });
});
