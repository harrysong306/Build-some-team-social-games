import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";

// import "app.config.ts"
import appConfig from "../src/app.config.js";
import { GameState } from "../src/rooms/schema/GameState.js";

// room.waitForNextPatch() only confirms the SERVER sent a patch - it doesn't
// guarantee any particular client has received/decoded it yet, and a fixed
// delay after it is just a guess that can still lose the race under load.
// this polls the actual condition we care about until it's true (or times out),
// which is the reliable way to wait for state that syncs over the network.
async function waitUntil(check: () => boolean, timeoutMs = 2000, intervalMs = 10) {
  const start = Date.now();
  while (true) {
    // state (e.g. client.state.players) might not even exist yet right after
    // connecting - treat a throw from check() as "not ready", not a real failure
    try {
      if (check()) return;
    } catch {
      // ignore, keep polling
    }
    if (Date.now() - start >= timeoutMs) {
      throw new Error(`waitUntil: condition not met within ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

describe("LobbyRoom", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  // own port, see the comment in GridIndex.test.ts for why
  before(async () => colyseus = await boot(appConfig, 2570));
  after(async () => colyseus.shutdown());

  beforeEach(async () => await colyseus.cleanup());

  it("first player to join becomes host", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });

    await waitUntil(() => client1.state.players.has(client1.sessionId));

    const player = client1.state.players.get(client1.sessionId);
    assert.strictEqual(player?.name, "Jordan");
    assert.strictEqual(player?.isHost, true);
    assert.strictEqual(player?.ready, false);
  });

  it("second player to join is not host", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    const client2 = await colyseus.connectTo(room, { name: "Sam" });

    await waitUntil(() => client1.state.players.has(client2.sessionId));

    const p1 = client1.state.players.get(client1.sessionId);
    const p2 = client1.state.players.get(client2.sessionId);
    assert.strictEqual(p1?.isHost, true);
    assert.strictEqual(p2?.isHost, false);
  });

  it("duplicate nickname on join gets a suffixed fallback name", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    const client2 = await colyseus.connectTo(room, { name: "Jordan" });

    await waitUntil(() => client1.state.players.size === 2);

    const p1 = client1.state.players.get(client1.sessionId);
    const p2 = client1.state.players.get(client2.sessionId);

    assert.strictEqual(p1?.name, "Jordan");
    assert.notStrictEqual(p2?.name, "Jordan");
    assert.ok(p2?.name.startsWith("Jordan"));
  });

  it("markReady updates only the sending player's ready status", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    const client2 = await colyseus.connectTo(room, { name: "Sam" });
    await waitUntil(() => client1.state.players.has(client2.sessionId));

    client2.send("markReady", { ready: true });
    await waitUntil(() => client1.state.players.get(client2.sessionId)?.ready === true);

    const p1 = client1.state.players.get(client1.sessionId);
    const p2 = client1.state.players.get(client2.sessionId);

    assert.strictEqual(p1?.ready, false);
    assert.strictEqual(p2?.ready, true);
  });

  it("changeName rejects an empty name and leaves state unchanged", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    await waitUntil(() => client1.state.players.has(client1.sessionId));

    client1.send("changeName", { name: "   " });
    await room.waitForNextPatch(); // rejected, state never changes - nothing to poll for

    const player = client1.state.players.get(client1.sessionId);
    assert.strictEqual(player?.name, "Jordan");
  });

  it("changeName rejects a duplicate name (case-insensitive) and leaves state unchanged", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    const client2 = await colyseus.connectTo(room, { name: "Sam" });
    await waitUntil(() => client1.state.players.has(client2.sessionId));

    client2.send("changeName", { name: "jordan" });
    await room.waitForNextPatch(); // rejected, state never changes - nothing to poll for

    const p2 = client1.state.players.get(client2.sessionId);
    assert.strictEqual(p2?.name, "Sam"); // unchanged, rejected
  });

  it("changeName succeeds when the new name is unique", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    const client2 = await colyseus.connectTo(room, { name: "Sam" });
    await waitUntil(() => client1.state.players.has(client2.sessionId));

    client2.send("changeName", { name: "Sammy" });
    await waitUntil(() => client1.state.players.get(client2.sessionId)?.name === "Sammy");

    const p2 = client1.state.players.get(client2.sessionId);
    assert.strictEqual(p2?.name, "Sammy");
  });

  it("changeName truncates names longer than 20 characters", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    await waitUntil(() => client1.state.players.has(client1.sessionId));

    const longName = "ThisNameIsDefinitelyWayTooLongForTheLimit";
    const expected = longName.slice(0, 20);
    client1.send("changeName", { name: longName });
    await waitUntil(() => client1.state.players.get(client1.sessionId)?.name === expected);

    const player = client1.state.players.get(client1.sessionId);
    assert.strictEqual(player?.name.length, 20);
    assert.strictEqual(player?.name, expected);
  });

  it("host is reassigned to a remaining player when the host leaves", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" }); // host
    const client2 = await colyseus.connectTo(room, { name: "Sam" });
    await waitUntil(() => client2.state.players.has(client1.sessionId));

    await client1.leave();
    await waitUntil(() => client2.state.players.get(client2.sessionId)?.isHost === true);

    const remaining = client2.state.players.get(client2.sessionId);
    assert.strictEqual(remaining?.isHost, true);
  });

  it("leaving player is removed from state entirely", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    const client2 = await colyseus.connectTo(room, { name: "Sam" });
    await waitUntil(() => client1.state.players.has(client2.sessionId));

    await client2.leave();
    await waitUntil(() => client1.state.players.size === 1);

    assert.strictEqual(client1.state.players.size, 1);
    assert.strictEqual(client1.state.players.get(client2.sessionId), undefined);
  });

  it("only the host can set the game mode", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" }); // host
    const client2 = await colyseus.connectTo(room, { name: "Sam" });
    await waitUntil(() => client1.state.players.has(client2.sessionId));

    client2.send("setGameMode", { mode: "test" }); // different from default — proves rejection
    await room.waitForNextPatch(); // rejected, state never changes - nothing to poll for
    assert.strictEqual(client1.state.gameMode, "sketchRecall"); // still default, rejected

    client1.send("setGameMode", { mode: "test" });
    await waitUntil(() => client1.state.gameMode === "test");
    assert.strictEqual(client1.state.gameMode, "test"); // host's change succeeded
  });
});
