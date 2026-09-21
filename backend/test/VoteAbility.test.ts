import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";

import appConfig from "../src/app.config.js";
import { GameState } from "../src/rooms/schema/GameState.js";

// same lesson as TestClient.test.ts's waitUntil: don't trust a fixed number of
// waitForNextPatch() calls to mean "the server has definitely finished
// processing X" - poll the actual server-side condition instead
async function waitUntil(check: () => boolean, timeoutMs = 2000, intervalMs = 10) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start >= timeoutMs) {
      throw new Error(`waitUntil: condition not met within ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

describe("BE-19 vote_ability", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  // own port, see the comment in GridIndex.test.ts for why
  before(async () => (colyseus = await boot(appConfig, 2576)));
  after(async () => colyseus.shutdown());
  beforeEach(async () => await colyseus.cleanup());

  it("does not pass until more than half of players have voted", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    const c3 = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    let received: any = null;
    c1.onMessage("ability_vote_result", (data: any) => (received = data));

    c1.send("vote_ability", { abilityId: "reveal_hint" }); // only 1 of 3
    await room.waitForNextPatch();

    assert.strictEqual(received.votes, 1);
    assert.strictEqual(received.totalPlayers, 3);
    assert.strictEqual(received.passed, false);
  });

  it("passes once more than half the current players vote yes", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    const c3 = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    let received: any = null;
    c1.onMessage("ability_vote_result", (data: any) => (received = data));

    c1.send("vote_ability", { abilityId: "reveal_hint" });
    await room.waitForNextPatch();
    c2.send("vote_ability", { abilityId: "reveal_hint" }); // 2 of 3 - majority
    await room.waitForNextPatch();

    assert.ok(received);
    assert.strictEqual(received.abilityId, "reveal_hint");
    assert.strictEqual(received.votes, 2);
    assert.strictEqual(received.totalPlayers, 3);
    assert.strictEqual(received.passed, true);
  });

  it("the same player voting twice only counts once", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    const c3 = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    let received: any = null;
    c1.onMessage("ability_vote_result", (data: any) => (received = data));

    c1.send("vote_ability", { abilityId: "reveal_hint" });
    c1.send("vote_ability", { abilityId: "reveal_hint" }); // same player again
    await room.waitForNextPatch();

    assert.strictEqual(received.votes, 1); // still just 1, not 2
    assert.strictEqual(received.passed, false); // 1 of 3 is not a majority
  });

  it("resets after passing so the same ability can be voted on again later", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    const c3 = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    let received: any = null;
    c1.onMessage("ability_vote_result", (data: any) => (received = data));

    c1.send("vote_ability", { abilityId: "reveal_hint" });
    c2.send("vote_ability", { abilityId: "reveal_hint" }); // passes (2 of 3)
    await room.waitForNextPatch();
    assert.strictEqual(received.passed, true);

    // vote again later - should start fresh from 0, not still show 2/3
    c3.send("vote_ability", { abilityId: "reveal_hint" });
    await room.waitForNextPatch();

    assert.strictEqual(received.votes, 1); // fresh tally, just c3 this time
    assert.strictEqual(received.passed, false); // 1 of 3 isn't a majority on its own
  });

  it("a departed player's vote no longer counts toward the threshold", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    const c3 = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    // listen via c2, not c1 - c1 is about to leave and can't hear anything after that
    let received: any = null;
    c2.onMessage("ability_vote_result", (data: any) => (received = data));

    c1.send("vote_ability", { abilityId: "reveal_hint" }); // 1 of 3
    await room.waitForNextPatch();

    await c1.leave(); // the voter themself leaves
    // room.state here is the SERVER's own state (this IS the server room object),
    // so this is authoritative - not a client mirror waiting on network delivery.
    // still needs a poll though, since onLeave runs async relative to leave()
    await waitUntil(() => (room as any).state.players.size === 2);

    // c2 votes next - if c1's vote had lingered as a phantom, the tally would
    // wrongly show 2 votes (c1 + c2) against 2 total players and incorrectly pass
    c2.send("vote_ability", { abilityId: "reveal_hint" });
    await room.waitForNextPatch();

    assert.strictEqual(received.votes, 1); // only c2's real vote - c1's was purged
    assert.strictEqual(received.totalPlayers, 2); // c1 no longer counted either
    assert.strictEqual(received.passed, false); // 1 of 2 remaining players isn't a majority
  });

  it("clears pending votes when a fresh game starts", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    const c3 = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    const game = (room as any).state.game;
    c1.send("vote_ability", { abilityId: "reveal_hint" });
    await room.waitForNextPatch();
    assert.strictEqual(game.abilityVotes.get("reveal_hint")?.size, 1);

    // simulate BE-27 play again
    game.setPhase("drawing");

    assert.strictEqual(game.abilityVotes.get("reveal_hint"), undefined);
  });
});
