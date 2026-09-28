/// <reference types="mocha" />
import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";

// import "app.config.ts"
import appConfig from "../src/app.config.js";
import { GameState } from "../src/rooms/schema/GameState.js";

import { generateGameWords } from "../src/utils/WordGen.js";
import {
  generalWords,
  similarWordGroups,
} from "../src/utils/sketchRecallWords.js";


describe("LobbyRoom", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  before(async () => colyseus = await boot(appConfig));
  after(async () => colyseus.shutdown());

  beforeEach(async () => await colyseus.cleanup());

  it("first player to join becomes host", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });

    await room.waitForNextPatch();

    const player = client1.state.players.get(client1.sessionId);
    assert.strictEqual(player?.name, "Jordan");
    assert.strictEqual(player?.isHost, true);
    assert.strictEqual(player?.ready, false);
    assert.strictEqual(player?.score, 0);
  });

  it("second player to join is not host", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    await room.waitForNextPatch();
  
    const client2 = await colyseus.connectTo(room, { name: "Sam" });
    await room.waitForNextPatch();
  
    const p1 = client1.state.players.get(client1.sessionId);
    const p2 = client1.state.players.get(client2.sessionId);
    assert.strictEqual(p1?.isHost, true);
    assert.strictEqual(p2?.isHost, false);
  });

  it("duplicate nickname on join gets a suffixed fallback name", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    const client2 = await colyseus.connectTo(room, { name: "Jordan" });

    await room.waitForNextPatch();

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

    client2.send("markReady", { ready: true });
    await room.waitForNextPatch();

    const p1 = client1.state.players.get(client1.sessionId);
    const p2 = client1.state.players.get(client2.sessionId);

    assert.strictEqual(p1?.ready, false);
    assert.strictEqual(p2?.ready, true);
  });

  it("changeName rejects an empty name and leaves state unchanged", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });

    client1.send("changeName", { name: "   " });
    await room.waitForNextPatch();

    const player = client1.state.players.get(client1.sessionId);
    assert.strictEqual(player?.name, "Jordan");
  });

  it("changeName rejects a duplicate name (case-insensitive) and leaves state unchanged", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    const client2 = await colyseus.connectTo(room, { name: "Sam" });

    client2.send("changeName", { name: "jordan" });
    await room.waitForNextPatch();

    const p2 = client1.state.players.get(client2.sessionId);
    assert.strictEqual(p2?.name, "Sam"); // unchanged, rejected
  });

  it("changeName succeeds when the new name is unique", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    const client2 = await colyseus.connectTo(room, { name: "Sam" });

    client2.send("changeName", { name: "Sammy" });
    await room.waitForNextPatch();

    const p2 = client1.state.players.get(client2.sessionId);
    assert.strictEqual(p2?.name, "Sammy");
  });

  it("changeName truncates names longer than 20 characters", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });

    const longName = "ThisNameIsDefinitelyWayTooLongForTheLimit";
    client1.send("changeName", { name: longName });
    await room.waitForNextPatch();

    const player = client1.state.players.get(client1.sessionId);
    assert.strictEqual(player?.name.length, 20);
    assert.strictEqual(player?.name, longName.slice(0, 20));
  });

  it("host is reassigned to a remaining player when the host leaves", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" }); // host
    const client2 = await colyseus.connectTo(room, { name: "Sam" });

    await client1.leave();
    await room.waitForNextPatch();

    const remaining = client2.state.players.get(client2.sessionId);
    assert.strictEqual(remaining?.isHost, true);
  });

  it("leaving player is removed from state entirely", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    const client2 = await colyseus.connectTo(room, { name: "Sam" });

    await client2.leave();
    await room.waitForNextPatch();

    assert.strictEqual(client1.state.players.size, 1);
    assert.strictEqual(client1.state.players.get(client2.sessionId), undefined);
  });

  it("only the host can set the game mode", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" }); // host
    const client2 = await colyseus.connectTo(room, { name: "Sam" });
  
    client2.send("setGameMode", { mode: "test" }); // different from default — proves rejection
    await room.waitForNextPatch();
    assert.strictEqual(client1.state.gameMode, "sketchRecall"); // still default, rejected
  
    client1.send("setGameMode", { mode: "test" });
    await room.waitForNextPatch();
    assert.strictEqual(client1.state.gameMode, "test"); // host's change succeeded
  });

  it("startGame stores generated words in the room game state", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    const client2 = await colyseus.connectTo(room, { name: "Sam" });

    client1.send("markReady", { ready: true });
    client2.send("markReady", { ready: true });
    await room.waitForNextPatch();

    client1.send("startGame", {});
    await room.waitForNextPatch();

    assert.strictEqual(client1.state.phase, "playing");
    assert.strictEqual(client1.state.gameWords.length, 25);
    assert.strictEqual(room.state.gameWords.length, 25);
    assert.deepStrictEqual(
      [...client1.state.gameWords],
      [...room.state.gameWords],
    );
  });

  it("startGame resets all player scores to zero", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    const client2 = await colyseus.connectTo(room, { name: "Sam" });

    const player1 = room.state.players.get(client1.sessionId);
    const player2 = room.state.players.get(client2.sessionId);

    assert.ok(player1);
    assert.ok(player2);

    player1.score = 10;
    player2.score = 5;

    client1.send("markReady", { ready: true });
    client2.send("markReady", { ready: true });
    await room.waitForNextPatch();

    assert.strictEqual(
      client1.state.players.get(client1.sessionId)?.score,
      10,
    );
    assert.strictEqual(
      client1.state.players.get(client2.sessionId)?.score,
      5,
    );

    client1.send("startGame", {});
    await room.waitForNextPatch();

    assert.strictEqual(
      room.state.players.get(client1.sessionId)?.score,
      0,
    );
    assert.strictEqual(
      room.state.players.get(client2.sessionId)?.score,
      0,
    );
    assert.strictEqual(
      client1.state.players.get(client1.sessionId)?.score,
      0,
    );
    assert.strictEqual(
      client1.state.players.get(client2.sessionId)?.score,
      0,
    );
  });

  describe("Recall multiplayer scoring", () => {
    it("awards rank-based points and gives timed-out players zero", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });
      const client2 = await colyseus.connectTo(room, { name: "Sam" });
      const client3 = await colyseus.connectTo(room, { name: "Alex" });

      room.state.gameWords.clear();
      room.state.gameWords.push("apple");

      const resultPromise = new Promise<any>((resolve) => {
        client1.onMessage("recallRoundResult", resolve);
      });

      const internalRoom = room as any;

      internalRoom.recallRound = 0;
      internalRoom.recallStarted = true;
      internalRoom.recallAnswers.clear();

      internalRoom.recallAnswers.set(client1.sessionId, {
        sessionId: client1.sessionId,
        answer: "apple",
        submittedAt: 100,
      });

      internalRoom.recallAnswers.set(client2.sessionId, {
        sessionId: client2.sessionId,
        answer: "appl",
        submittedAt: 200,
      });

      // Alex does not answer, so they time out.
      internalRoom.finishRecallRound();

      const result = await resultPromise;

      assert.strictEqual(
        room.state.players.get(client1.sessionId)?.score,
        3,
      );
      assert.strictEqual(
        room.state.players.get(client2.sessionId)?.score,
        2,
      );
      assert.strictEqual(
        room.state.players.get(client3.sessionId)?.score,
        0,
      );

      const client1Result = result.results.find(
        (entry: any) => entry.sessionId === client1.sessionId,
      );
      const client2Result = result.results.find(
        (entry: any) => entry.sessionId === client2.sessionId,
      );
      const client3Result = result.results.find(
        (entry: any) => entry.sessionId === client3.sessionId,
      );

      assert.strictEqual(client1Result.rank, 1);
      assert.strictEqual(client1Result.pointsEarned, 3);
      assert.strictEqual(client1Result.totalScore, 3);

      assert.strictEqual(client2Result.rank, 2);
      assert.strictEqual(client2Result.pointsEarned, 2);
      assert.strictEqual(client2Result.totalScore, 2);

      assert.strictEqual(client3Result.rank, null);
      assert.strictEqual(client3Result.timedOut, true);
      assert.strictEqual(client3Result.pointsEarned, 0);
      assert.strictEqual(client3Result.totalScore, 0);
    });

    it("accumulates player scores across Recall rounds", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });
      const client2 = await colyseus.connectTo(room, { name: "Sam" });
      const client3 = await colyseus.connectTo(room, { name: "Alex" });

      room.state.gameWords.clear();
      room.state.gameWords.push("apple", "banana");

      const internalRoom = room as any;

      // Round 1:
      // Jordan = 1st = 3
      // Sam = 2nd = 2
      // Alex = timeout = 0
      internalRoom.recallRound = 0;
      internalRoom.recallStarted = true;
      internalRoom.recallAnswers.clear();

      internalRoom.recallAnswers.set(client1.sessionId, {
        sessionId: client1.sessionId,
        answer: "apple",
        submittedAt: 100,
      });

      internalRoom.recallAnswers.set(client2.sessionId, {
        sessionId: client2.sessionId,
        answer: "appl",
        submittedAt: 200,
      });

      internalRoom.finishRecallRound();

      assert.strictEqual(
        room.state.players.get(client1.sessionId)?.score,
        3,
      );
      assert.strictEqual(
        room.state.players.get(client2.sessionId)?.score,
        2,
      );
      assert.strictEqual(
        room.state.players.get(client3.sessionId)?.score,
        0,
      );

      // Round 2:
      // Sam = 1st = 3
      // Jordan = 2nd = 2
      // Alex = 3rd = 1
      internalRoom.recallStarted = true;
      internalRoom.recallAnswers.clear();

      internalRoom.recallAnswers.set(client1.sessionId, {
        sessionId: client1.sessionId,
        answer: "banan",
        submittedAt: 200,
      });

      internalRoom.recallAnswers.set(client2.sessionId, {
        sessionId: client2.sessionId,
        answer: "banana",
        submittedAt: 100,
      });

      internalRoom.recallAnswers.set(client3.sessionId, {
        sessionId: client3.sessionId,
        answer: "x",
        submittedAt: 300,
      });

      internalRoom.finishRecallRound();

      assert.strictEqual(
        room.state.players.get(client1.sessionId)?.score,
        5,
      );
      assert.strictEqual(
        room.state.players.get(client2.sessionId)?.score,
        5,
      );
      assert.strictEqual(
        room.state.players.get(client3.sessionId)?.score,
        1,
      );
    });
  });

  describe("generateGameWords", () => {
    it("returns 25 words from the configured word pools", () => {
      const words = generateGameWords();

      const allowedWords = new Set([
        ...generalWords,
        ...similarWordGroups.flat(),
      ]);

      assert.strictEqual(words.length, 25);
      assert.ok(words.every(word => allowedWords.has(word)));
    });

    it("includes exactly three complete similar-word groups", () => {
      const words = generateGameWords();
      const wordSet = new Set(words);

      const includedGroups = similarWordGroups.filter(group =>
        group.every(word => wordSet.has(word))
      );

      assert.strictEqual(includedGroups.length, 3);
    });
  });

  describe("drawing uploads", () => {
    it("stores submitted drawing bytes with the submitted drawing index", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });
      const bytes = new Uint8Array([1, 2, 3, 4]);

      client1.send("submit-drawing-meta", { index: 2 });
      client1.sendBytes("submit-drawing", bytes);
      await new Promise(resolve => setTimeout(resolve, 20));

      const drawings = (room as any).drawings as Map<string, Uint8Array>;
      const stored = drawings.get(`${client1.sessionId}:2`);

      assert.ok(stored);
      assert.deepStrictEqual([...stored], [...bytes]);
    });

    it("stores submitted drawing bytes with fallback index when metadata is missing", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });
      const bytes = new Uint8Array([5, 6, 7]);

      client1.sendBytes("submit-drawing", bytes);
      await new Promise(resolve => setTimeout(resolve, 20));

      const drawings = (room as any).drawings as Map<string, Uint8Array>;
      const stored = drawings.get(`${client1.sessionId}:-1`);

      assert.ok(stored);
      assert.deepStrictEqual([...stored], [...bytes]);
    });

    it("clears pending drawing metadata after a drawing is submitted", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });

      client1.send("submit-drawing-meta", { index: 3 });
      client1.sendBytes("submit-drawing", new Uint8Array([8]));
      await new Promise(resolve => setTimeout(resolve, 20));

      client1.sendBytes("submit-drawing", new Uint8Array([9]));
      await new Promise(resolve => setTimeout(resolve, 20));

      const drawings = (room as any).drawings as Map<string, Uint8Array>;

      assert.deepStrictEqual([...drawings.get(`${client1.sessionId}:3`)!], [8]);
      assert.deepStrictEqual([...drawings.get(`${client1.sessionId}:-1`)!], [9]);
    });

    it("keeps submitted drawings separate for each player", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });
      const client2 = await colyseus.connectTo(room, { name: "Sam" });

      client1.send("submit-drawing-meta", { index: 0 });
      client1.sendBytes("submit-drawing", new Uint8Array([1]));
      client2.send("submit-drawing-meta", { index: 0 });
      client2.sendBytes("submit-drawing", new Uint8Array([2]));
      await new Promise(resolve => setTimeout(resolve, 20));

      const drawings = (room as any).drawings as Map<string, Uint8Array>;

      assert.deepStrictEqual([...drawings.get(`${client1.sessionId}:0`)!], [1]);
      assert.deepStrictEqual([...drawings.get(`${client2.sessionId}:0`)!], [2]);
    });
  });

});