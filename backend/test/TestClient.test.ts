/// <reference types="mocha" />
import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";

// import "app.config.ts"
import appConfig from "../src/app.config.js";
import { GameState } from "../src/rooms/schema/GameState.js";
import { JoinError } from "../src/rooms/LobbyRoom.js";

import { generateGameWords } from "../src/utils/WordGen.js";
import {
  generalWords,
  similarWordGroups,
} from "../src/utils/sketchRecallWords.js";

async function submitQuestions(
  client: any,
  room: any,
) {
  for (let index = 0; index < 2; index += 1) {
    client.send("submitPlayerQuestion", {
      prompt: `Question ${index + 1}`,
      options: ["One", "Two", "Three", "Four"],
      correctOption: index,
    });
    await room.waitForNextPatch();
  }
}

describe("LobbyRoom", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  before(async () => colyseus = await boot(appConfig));
  after(async () => colyseus.shutdown());

  beforeEach(async () => await colyseus.cleanup());

  it("first player to join becomes host", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });

    await room.waitForNextPatch();

    const player = room.state.players.get(client1.sessionId);

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

    await submitQuestions(client2, room);
    client2.send("markReady", { ready: true });
    await room.waitForNextPatch();

    const p1 = room.state.players.get(client1.sessionId);
    const p2 = room.state.players.get(client2.sessionId);

    assert.strictEqual(p1?.ready, false);
    assert.strictEqual(p2?.ready, true);
  });

  it("requires two questions before a player can ready up", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client = await colyseus.connectTo(room, { name: "Jordan" });

    client.send("markReady", { ready: true });
    await room.waitForNextPatch();

    assert.strictEqual(
      client.state.players.get(client.sessionId)?.ready,
      false,
    );

    await submitQuestions(client, room);
    client.send("markReady", { ready: true });
    await room.waitForNextPatch();

    assert.strictEqual(
      client.state.players.get(client.sessionId)?.ready,
      true,
    );
  });

  it("publishes question text and options without exposing the answer", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client = await colyseus.connectTo(room, { name: "Jordan" });

    client.send("submitPlayerQuestion", {
      prompt: "What is my favourite colour?",
      options: ["Red", "Blue", "Green", "Yellow"],
      correctOption: 0,
    });
    await room.waitForNextPatch();
    assert.strictEqual(
      client.state.players.get(client.sessionId)?.questions.length,
      1,
    );

    const question = client.state.players
      .get(client.sessionId)
      ?.questions[0];

    assert.strictEqual(question?.prompt, "What is my favourite colour?");
    assert.deepStrictEqual([...question!.options], [
      "Red",
      "Blue",
      "Green",
      "Yellow",
    ]);
    assert.strictEqual(
      "correctOption" in (question ?? {}),
      false,
    );
  });

  it("checks player-question answers on the server", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client = await colyseus.connectTo(room, { name: "Jordan" });

    client.send("submitPlayerQuestion", {
      prompt: "What is my favourite colour?",
      options: ["Red", "Blue", "Green", "Yellow"],
      correctOption: 0,
    });
    await room.waitForNextPatch();

    const results = new Promise<boolean[]>((resolve) => {
      const received: boolean[] = [];

      client.onMessage("player_question_result", (message) => {
        assert.strictEqual(message.questionId, `${client.sessionId}:0`);
        received.push(message.correct);

        if (received.length === 2) {
          resolve(received);
        }
      });

      client.send("submitPlayerQuestionAnswer", {
        ownerSessionId: client.sessionId,
        questionIndex: 0,
        answerIndex: 0,
      });

      client.send("submitPlayerQuestionAnswer", {
        ownerSessionId: client.sessionId,
        questionIndex: 0,
        answerIndex: 1,
      });
    });

    assert.deepStrictEqual(await results, [true, false]);
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

    assert.strictEqual(p2?.name, "Sam");
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
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
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
    assert.strictEqual(
      client1.state.players.get(client2.sessionId),
      undefined,
    );
  });

  it("only the host can set the game mode", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    const client2 = await colyseus.connectTo(room, { name: "Sam" });

    client2.send("setGameMode", { mode: "test" });
    await room.waitForNextPatch();

    assert.strictEqual(client1.state.gameMode, "sketchRecall");

    client1.send("setGameMode", { mode: "test" });
    await room.waitForNextPatch();

    assert.strictEqual(client1.state.gameMode, "test");
  });

  it("startGame stores generated words in the room game state", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    const client2 = await colyseus.connectTo(room, { name: "Sam" });

    await submitQuestions(client1, room);
    await submitQuestions(client2, room);
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

    player1.score = 9;
player2.score = 5;

client1.send("submitPlayerQuestion", {
  prompt: "Question 1",
  options: ["A", "B", "C", "D"],
  correctOption: 0,
});

client1.send("submitPlayerQuestion", {
  prompt: "Question 2",
  options: ["A", "B", "C", "D"],
  correctOption: 1,
});

client2.send("submitPlayerQuestion", {
  prompt: "Question 1",
  options: ["A", "B", "C", "D"],
  correctOption: 0,
});

client2.send("submitPlayerQuestion", {
  prompt: "Question 2",
  options: ["A", "B", "C", "D"],
  correctOption: 1,
});

client1.send("markReady", { ready: true });
client2.send("markReady", { ready: true });

    await room.waitForNextPatch();

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
  });

  describe("joining a room (BE-3)", () => {
    it("rejects a room code that doesn't exist", async () => {
      await assert.rejects(
        colyseus.sdk.joinById("NOPE", { name: "Sam" }),
        (error: any) => error.code === 522,
      );
    });

    it("rejects joining a game that has already started", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });

      await submitQuestions(client1, room);
      client1.send("markReady", { ready: true });
      await room.waitForNextPatch();

      client1.send("startGame", {});
      await room.waitForNextPatch();

      assert.strictEqual(room.state.phase, "playing");

      await assert.rejects(
        colyseus.connectTo(room, { name: "Late" }),
        (error: any) =>
          error.code === JoinError.GAME_IN_PROGRESS &&
          error.message === "This game has already started.",
      );

      assert.strictEqual(room.state.players.size, 1);
    });

    it("rejects a 9th player once the room is full", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});

      for (let index = 0; index < 8; index += 1) {
        await colyseus.connectTo(room, { name: `Player ${index + 1}` });
      }

      assert.strictEqual(room.state.players.size, 8);

      await assert.rejects(
        colyseus.connectTo(room, { name: "Extra" }),
        (error: any) =>
          error.code === JoinError.ROOM_FULL &&
          error.message === "This room is full.",
      );

      assert.strictEqual(room.state.players.size, 8);
    });
  });

  describe("setDrawingCount (FE-99)", () => {
    it("only the host can set the drawing count", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });
      const client2 = await colyseus.connectTo(room, { name: "Sam" });

      client2.send("setDrawingCount", { count: 15 });
      await room.waitForNextPatch();

      assert.strictEqual(client1.state.drawingCount, 25);

      client1.send("setDrawingCount", { count: 15 });
      await room.waitForNextPatch();

      assert.strictEqual(client1.state.drawingCount, 15);
    });

    it("rejects a count below the minimum", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });

      client1.send("setDrawingCount", { count: 3 });

      await new Promise(resolve => setTimeout(resolve, 20));

      assert.strictEqual(client1.state.drawingCount, 25);
    });

    it("rejects a count above the maximum", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });

      client1.send("setDrawingCount", { count: 100 });

      await new Promise(resolve => setTimeout(resolve, 20));

      assert.strictEqual(client1.state.drawingCount, 25);
    });

    it("startGame uses the host-configured drawing count as the word count", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });

      client1.send("setDrawingCount", { count: 12 });
      await submitQuestions(client1, room);
      client1.send("markReady", { ready: true });

      await room.waitForNextPatch();

      client1.send("startGame", {});

      await room.waitForNextPatch();

      assert.strictEqual(client1.state.gameWords.length, 12);
    });
  });

  describe("multiplayer replay", () => {
    it("allows the host to return everyone to the lobby after Recall finishes", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const host = await colyseus.connectTo(room, { name: "Jordan" });
      const guest = await colyseus.connectTo(room, { name: "Sam" });

      await room.waitForNextPatch();

      const hostPlayer = room.state.players.get(host.sessionId);
      const guestPlayer = room.state.players.get(guest.sessionId);

      assert.ok(hostPlayer);
      assert.ok(guestPlayer);

      hostPlayer.ready = true;
      guestPlayer.ready = true;

      hostPlayer.score = 8;
      guestPlayer.score = 6;

      room.state.phase = "playing";

      room.state.gameWords.clear();
      room.state.gameWords.push("Apple", "Tree");

      const internal = room as any;

      internal.recallRound = 2;

      internal.recallReady =
        new Set([
          host.sessionId,
          guest.sessionId,
        ]);

      internal.recallAnswers =
        new Map([
          [
            host.sessionId,
            {
              sessionId: host.sessionId,
              answer: "Apple",
              submittedAt: 100,
            },
          ],
        ]);

      internal.recallDeadline =
        Date.now() + 5000;

      internal.recallStarted =
        false;

      internal.drawings.set(
        `${host.sessionId}:0`,
        new Uint8Array([1, 2, 3]),
      );

      internal.pendingDrawingIndexes.set(
        host.sessionId,
        1,
      );

      await room.waitForNextPatch();

      host.send("returnToLobby", {});

      await room.waitForNextPatch();

      assert.strictEqual(room.state.phase, "lobby");
      assert.strictEqual(host.state.phase, "lobby");
      assert.strictEqual(guest.state.phase, "lobby");

      assert.strictEqual(hostPlayer.ready, false);
      assert.strictEqual(guestPlayer.ready, false);

      assert.strictEqual(room.state.gameWords.length, 0);

      assert.strictEqual(hostPlayer.score, 8);
      assert.strictEqual(guestPlayer.score, 6);

      assert.strictEqual(internal.recallRound, 0);
      assert.strictEqual(internal.recallReady.size, 0);
      assert.strictEqual(internal.recallAnswers.size, 0);
      assert.strictEqual(internal.recallDeadline, 0);
      assert.strictEqual(internal.recallStarted, false);

      assert.strictEqual(internal.drawings.size, 0);
      assert.strictEqual(
        internal.pendingDrawingIndexes.size,
        0,
      );
    });

    it("does not allow a non-host to return the room to the lobby", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const host = await colyseus.connectTo(room, { name: "Jordan" });
      const guest = await colyseus.connectTo(room, { name: "Sam" });

      const hostPlayer = room.state.players.get(host.sessionId);
      const guestPlayer = room.state.players.get(guest.sessionId);

      assert.ok(hostPlayer);
      assert.ok(guestPlayer);

      hostPlayer.ready = true;
      guestPlayer.ready = true;

      room.state.phase = "playing";

      room.state.gameWords.clear();
      room.state.gameWords.push("Apple");

      const internal = room as any;

      internal.recallRound = 1;
      internal.recallStarted = false;

      await room.waitForNextPatch();

      guest.send("returnToLobby", {});

      await new Promise(resolve => setTimeout(resolve, 50));

      assert.strictEqual(room.state.phase, "playing");
      assert.strictEqual(hostPlayer.ready, true);
      assert.strictEqual(guestPlayer.ready, true);
      assert.strictEqual(room.state.gameWords.length, 1);
    });

    it("does not allow replay before all Recall rounds are complete", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const host = await colyseus.connectTo(room, { name: "Jordan" });

      const hostPlayer = room.state.players.get(host.sessionId);

      assert.ok(hostPlayer);

      hostPlayer.ready = true;

      room.state.phase = "playing";

      room.state.gameWords.clear();
      room.state.gameWords.push("Apple", "Tree");

      const internal = room as any;

      internal.recallRound = 1;
      internal.recallStarted = false;

      await room.waitForNextPatch();

      host.send("returnToLobby", {});

      await new Promise(resolve => setTimeout(resolve, 50));

      assert.strictEqual(room.state.phase, "playing");
      assert.strictEqual(hostPlayer.ready, true);
      assert.strictEqual(room.state.gameWords.length, 2);
      assert.strictEqual(internal.recallRound, 1);
    });

    it("does not restart a game directly while the room is already playing", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const host = await colyseus.connectTo(room, { name: "Jordan" });
      const guest = await colyseus.connectTo(room, { name: "Sam" });

      const hostPlayer = room.state.players.get(host.sessionId);
      const guestPlayer = room.state.players.get(guest.sessionId);

      assert.ok(hostPlayer);
      assert.ok(guestPlayer);

      hostPlayer.ready = true;
      guestPlayer.ready = true;

      hostPlayer.score = 8;
      guestPlayer.score = 6;

      room.state.phase = "playing";

      room.state.gameWords.clear();
      room.state.gameWords.push("Apple");

      await room.waitForNextPatch();

      host.send("startGame", {});

      await new Promise(resolve => setTimeout(resolve, 50));

      assert.strictEqual(room.state.phase, "playing");

      assert.deepStrictEqual(
        [...room.state.gameWords],
        ["Apple"],
      );

      assert.strictEqual(hostPlayer.score, 8);
      assert.strictEqual(guestPlayer.score, 6);
    });
  });

  describe("Recall multiplayer scoring", () => {
    it("awards four-mark answer scores and gives timed-out players zero", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});

      const jordan = await colyseus.connectTo(room, { name: "Jordan" });
      const sam = await colyseus.connectTo(room, { name: "Sam" });
      const alex = await colyseus.connectTo(room, { name: "Alex" });

      room.state.gameWords.clear();
      room.state.gameWords.push("Apple");

      const resultPromise =
        new Promise<any>((resolve) => {
          jordan.onMessage(
            "recallRoundResult",
            resolve,
          );
        });

      const internal = room as any;

      internal.recallRound = 0;
      internal.recallStarted = true;

      internal.recallAnswers =
        new Map([
          [
            jordan.sessionId,
            {
              sessionId: jordan.sessionId,
              answer: "Apple",
              submittedAt: 100,
            },
          ],
          [
            sam.sessionId,
            {
              sessionId: sam.sessionId,
              answer: "Aple",
              submittedAt: 200,
            },
          ],
        ]);

      internal.finishRecallRound();

      const result = await resultPromise;

      const jordanResult =
        result.results.find(
          (entry: any) =>
            entry.sessionId ===
            jordan.sessionId,
        );

      const samResult =
        result.results.find(
          (entry: any) =>
            entry.sessionId ===
            sam.sessionId,
        );

      const alexResult =
        result.results.find(
          (entry: any) =>
            entry.sessionId ===
            alex.sessionId,
        );

      assert.strictEqual(jordanResult.pointsEarned, 4);
      assert.strictEqual(jordanResult.rank, 1);
      assert.strictEqual(jordanResult.totalScore, 4);

      assert.strictEqual(samResult.pointsEarned, 3);
      assert.strictEqual(samResult.rank, 2);
      assert.strictEqual(samResult.totalScore, 3);

      assert.strictEqual(alexResult.pointsEarned, 0);
      assert.strictEqual(alexResult.rank, null);
      assert.strictEqual(alexResult.timedOut, true);
      assert.strictEqual(alexResult.totalScore, 0);
    });

    it("uses submission time to rank equal-scoring answers without changing their points", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});

      const jordan = await colyseus.connectTo(room, { name: "Jordan" });
      const sam = await colyseus.connectTo(room, { name: "Sam" });

      room.state.gameWords.clear();
      room.state.gameWords.push("Apple");

      const resultPromise =
        new Promise<any>((resolve) => {
          jordan.onMessage(
            "recallRoundResult",
            resolve,
          );
        });

      const internal = room as any;

      internal.recallRound = 0;
      internal.recallStarted = true;

      internal.recallAnswers =
        new Map([
          [
            jordan.sessionId,
            {
              sessionId: jordan.sessionId,
              answer: "Apple",
              submittedAt: 100,
            },
          ],
          [
            sam.sessionId,
            {
              sessionId: sam.sessionId,
              answer: "Apple",
              submittedAt: 200,
            },
          ],
        ]);

      internal.finishRecallRound();

      const result = await resultPromise;

      const jordanResult =
        result.results.find(
          (entry: any) =>
            entry.sessionId ===
            jordan.sessionId,
        );

      const samResult =
        result.results.find(
          (entry: any) =>
            entry.sessionId ===
            sam.sessionId,
        );

      assert.strictEqual(jordanResult.rank, 1);
      assert.strictEqual(samResult.rank, 2);

      assert.strictEqual(jordanResult.pointsEarned, 4);
      assert.strictEqual(samResult.pointsEarned, 4);

      assert.strictEqual(jordanResult.totalScore, 4);
      assert.strictEqual(samResult.totalScore, 4);
    });

    it("accumulates four-mark Recall scores across rounds", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});

      const jordan = await colyseus.connectTo(room, { name: "Jordan" });
      const sam = await colyseus.connectTo(room, { name: "Sam" });
      const alex = await colyseus.connectTo(room, { name: "Alex" });

      room.state.gameWords.clear();
      room.state.gameWords.push("Apple", "Tree");

      const messages: any[] = [];

      const twoResults =
        new Promise<void>((resolve) => {
          jordan.onMessage(
            "recallRoundResult",
            (message: any) => {
              messages.push(message);

              if (messages.length === 2) {
                resolve();
              }
            },
          );
        });

      const internal = room as any;

      internal.recallRound = 0;
      internal.recallStarted = true;

      internal.recallAnswers =
        new Map([
          [
            jordan.sessionId,
            {
              sessionId: jordan.sessionId,
              answer: "Apple",
              submittedAt: 100,
            },
          ],
          [
            sam.sessionId,
            {
              sessionId: sam.sessionId,
              answer: "Aple",
              submittedAt: 200,
            },
          ],
        ]);

      internal.finishRecallRound();

      // recallRoundResult is deliberately delayed
      // until after the next synchronized state patch.
      while (messages.length < 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      internal.recallStarted = true;

      internal.recallAnswers =
        new Map([
          [
            jordan.sessionId,
            {
              sessionId: jordan.sessionId,
              answer: "Dog",
              submittedAt: 300,
            },
          ],
          [
            sam.sessionId,
            {
              sessionId: sam.sessionId,
              answer: "Tree",
              submittedAt: 400,
            },
          ],
          [
            alex.sessionId,
            {
              sessionId: alex.sessionId,
              answer: "Car",
              submittedAt: 500,
            },
          ],
        ]);

      internal.finishRecallRound();

      await twoResults;

      const secondResult = messages[1];

      const jordanResult =
        secondResult.results.find(
          (entry: any) =>
            entry.sessionId ===
            jordan.sessionId,
        );

      const samResult =
        secondResult.results.find(
          (entry: any) =>
            entry.sessionId ===
            sam.sessionId,
        );

      const alexResult =
        secondResult.results.find(
          (entry: any) =>
            entry.sessionId ===
            alex.sessionId,
        );

      assert.strictEqual(jordanResult.pointsEarned, 0);
      assert.strictEqual(jordanResult.totalScore, 4);

      assert.strictEqual(samResult.pointsEarned, 4);
      assert.strictEqual(samResult.totalScore, 7);

      assert.strictEqual(alexResult.pointsEarned, 0);
      assert.strictEqual(alexResult.totalScore, 0);

      assert.strictEqual(
        room.state.players.get(jordan.sessionId)?.score,
        4,
      );

      assert.strictEqual(
        room.state.players.get(sam.sessionId)?.score,
        7,
      );

      assert.strictEqual(
        room.state.players.get(alex.sessionId)?.score,
        0,
      );
    });

    it("delivers the final-round result after updated scores reach the client state", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});

      const jordan = await colyseus.connectTo(room, { name: "Jordan" });
      const sam = await colyseus.connectTo(room, { name: "Sam" });

      await room.waitForNextPatch();

      const jordanPlayer =
        room.state.players.get(jordan.sessionId);

      const samPlayer =
        room.state.players.get(sam.sessionId);

      assert.ok(jordanPlayer);
      assert.ok(samPlayer);

      // Deliberate final-round case:
      // Jordan: 20 + 3 = 23
      // Sam:    19 + 4 = 23
      jordanPlayer.score = 20;
      samPlayer.score = 19;

      room.state.phase = "playing";

      room.state.gameWords.clear();
      room.state.gameWords.push("Apple");

      const internal = room as any;

      internal.recallRound = 0;
      internal.recallStarted = true;

      internal.recallAnswers =
        new Map([
          [
            jordan.sessionId,
            {
              sessionId: jordan.sessionId,
              answer: "Aple",
              submittedAt: 100,
            },
          ],
          [
            sam.sessionId,
            {
              sessionId: sam.sessionId,
              answer: "Apple",
              submittedAt: 200,
            },
          ],
        ]);

      await room.waitForNextPatch();

      assert.strictEqual(
        jordan.state.players.get(jordan.sessionId)?.score,
        20,
      );

      assert.strictEqual(
        jordan.state.players.get(sam.sessionId)?.score,
        19,
      );

      const resultPromise =
        new Promise<any>((resolve, reject) => {
          jordan.onMessage(
            "recallRoundResult",
            (message: any) => {
              try {
                assert.strictEqual(
                  jordan.state.players.get(
                    jordan.sessionId,
                  )?.score,
                  23,
                );

                assert.strictEqual(
                  jordan.state.players.get(
                    sam.sessionId,
                  )?.score,
                  23,
                );

                resolve(message);
              } catch (error) {
                reject(error);
              }
            },
          );
        });

      internal.finishRecallRound();

      const result = await resultPromise;

      const jordanResult =
        result.results.find(
          (entry: any) =>
            entry.sessionId ===
            jordan.sessionId,
        );

      const samResult =
        result.results.find(
          (entry: any) =>
            entry.sessionId ===
            sam.sessionId,
        );

      assert.ok(jordanResult);
      assert.ok(samResult);

      assert.strictEqual(jordanResult.pointsEarned, 3);
      assert.strictEqual(jordanResult.totalScore, 23);

      assert.strictEqual(samResult.pointsEarned, 4);
      assert.strictEqual(samResult.totalScore, 23);

      assert.strictEqual(
        room.state.players.get(jordan.sessionId)?.score,
        23,
      );

      assert.strictEqual(
        room.state.players.get(sam.sessionId)?.score,
        23,
      );
    });
  });

  describe("generateGameWords", () => {
    it("returns 25 words from the configured word pools", () => {
      const words = generateGameWords();

      const allowedWords =
        new Set([
          ...generalWords,
          ...similarWordGroups.flat(),
        ]);

      assert.strictEqual(words.length, 25);

      assert.ok(
        words.every(
          word =>
            allowedWords.has(word),
        ),
      );
    });

    it("includes exactly three complete similar-word groups", () => {
      const words = generateGameWords();

      const wordSet = new Set(words);

      const includedGroups =
        similarWordGroups.filter(
          group =>
            group.every(
              word =>
                wordSet.has(word),
            ),
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

      const drawings =
        (room as any).drawings as
          Map<string, Uint8Array>;

      const stored =
        drawings.get(`${client1.sessionId}:2`);

      assert.ok(stored);
      assert.deepStrictEqual([...stored], [...bytes]);
    });

    it("stores submitted drawing bytes with fallback index when metadata is missing", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });

      const bytes = new Uint8Array([5, 6, 7]);

      client1.sendBytes("submit-drawing", bytes);

      await new Promise(resolve => setTimeout(resolve, 20));

      const drawings =
        (room as any).drawings as
          Map<string, Uint8Array>;

      const stored =
        drawings.get(`${client1.sessionId}:-1`);

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

      const drawings =
        (room as any).drawings as
          Map<string, Uint8Array>;

      assert.deepStrictEqual(
        [...drawings.get(`${client1.sessionId}:3`)!],
        [8],
      );

      assert.deepStrictEqual(
        [...drawings.get(`${client1.sessionId}:-1`)!],
        [9],
      );
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

      const drawings =
        (room as any).drawings as
          Map<string, Uint8Array>;

      assert.deepStrictEqual(
        [...drawings.get(`${client1.sessionId}:0`)!],
        [1],
      );

      assert.deepStrictEqual(
        [...drawings.get(`${client2.sessionId}:0`)!],
        [2],
      );
    });
  });

  describe("final gallery (BE-33)", () => {
    it("ignores requestFinalGallery before the game is over", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });

      let manifest: any = null;

      client1.onMessage(
        "finalGallery",
        (message: any) => {
          manifest = message;
        },
      );

      client1.send("requestFinalGallery", {});

      await new Promise(resolve => setTimeout(resolve, 20));

      assert.strictEqual(manifest, null);
    });

    it("requestFinalGallery replies to just the requester once the game is over", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });

      room.state.gameWords.push("cat");
      (room as any).recallRound = 1;

      client1.send("submit-drawing-meta", { index: 0 });
      client1.sendBytes(
        "submit-drawing",
        new Uint8Array([4, 5]),
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      let manifest: any = null;

      client1.onMessage(
        "finalGallery",
        (message: any) => {
          manifest = message;
        },
      );

      client1.send("requestFinalGallery", {});

      await new Promise(resolve => setTimeout(resolve, 20));

      assert.ok(manifest);

      assert.deepStrictEqual(
        manifest.entries,
        [
          {
            sessionId: client1.sessionId,
            index: 0,
          },
        ],
      );
    });

    it("ignores requestGalleryImage before the game is over", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });

      client1.send("submit-drawing-meta", { index: 0 });
      client1.sendBytes(
        "submit-drawing",
        new Uint8Array([1, 2, 3]),
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      let received: any = null;

      client1.onMessage(
        "galleryImage",
        (message: any) => {
          received = message;
        },
      );

      client1.send(
        "requestGalleryImage",
        {
          sessionId: client1.sessionId,
          index: 0,
        },
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      assert.strictEqual(received, null);
    });

    it("returns the requested drawing as base64 once the game is over", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });

      room.state.gameWords.push("cat");
      (room as any).recallRound = 1;

      client1.send("submit-drawing-meta", { index: 0 });
      client1.sendBytes(
        "submit-drawing",
        new Uint8Array([9, 9, 9]),
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      let received: any = null;

      client1.onMessage(
        "galleryImage",
        (message: any) => {
          received = message;
        },
      );

      client1.send(
        "requestGalleryImage",
        {
          sessionId: client1.sessionId,
          index: 0,
        },
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      assert.ok(received);
      assert.strictEqual(received.sessionId, client1.sessionId);
      assert.strictEqual(received.index, 0);

      assert.deepStrictEqual(
        [...Buffer.from(received.image, "base64")],
        [9, 9, 9],
      );
    });

    it("ignores a request for a drawing that was never submitted", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });

      room.state.gameWords.push("cat");
      (room as any).recallRound = 1;

      let received: any = null;

      client1.onMessage(
        "galleryImage",
        (message: any) => {
          received = message;
        },
      );

      client1.send(
        "requestGalleryImage",
        {
          sessionId: client1.sessionId,
          index: 0,
        },
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      assert.strictEqual(received, null);
    });

    it("broadcasts a manifest of only the drawings that exist when the final recall round ends", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });
      const client2 = await colyseus.connectTo(room, { name: "Sam" });

      room.state.gameWords.push("cat", "dog");

      client1.send("submit-drawing-meta", { index: 0 });
      client1.sendBytes(
        "submit-drawing",
        new Uint8Array([1]),
      );

      client2.send("submit-drawing-meta", { index: 1 });
      client2.sendBytes(
        "submit-drawing",
        new Uint8Array([2]),
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      const internal = room as any;

      internal.recallRound = 1;
      internal.recallStarted = true;

      let manifest: any = null;

      client1.onMessage(
        "finalGallery",
        (message: any) => {
          manifest = message;
        },
      );

      internal.finishRecallRound();

      await new Promise(resolve => setTimeout(resolve, 20));

      assert.ok(manifest);

      assert.deepStrictEqual(
        new Set(
          manifest.entries.map(
            (entry: any) =>
              `${entry.sessionId}:${entry.index}`,
          ),
        ),
        new Set([
          `${client1.sessionId}:0`,
          `${client2.sessionId}:1`,
        ]),
      );
    });

    it("does not broadcast a manifest when a mid-game round finishes", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });

      room.state.gameWords.push("cat", "dog", "bird");

      const internal = room as any;

      internal.recallRound = 0;
      internal.recallStarted = true;

      let manifestReceived = false;

      client1.onMessage(
        "finalGallery",
        () => {
          manifestReceived = true;
        },
      );

      internal.finishRecallRound();

      await new Promise(resolve => setTimeout(resolve, 20));

      assert.strictEqual(manifestReceived, false);
      assert.strictEqual(internal.recallRound, 1);
    });

    it("startGame clears drawings left over from a previous game", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });

      client1.send("submit-drawing-meta", { index: 0 });
      client1.sendBytes(
        "submit-drawing",
        new Uint8Array([1]),
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      await submitQuestions(client1, room);
      client1.send("markReady", { ready: true });

      await room.waitForNextPatch();

      client1.send("startGame", {});

      await room.waitForNextPatch();

      const drawings =
        (room as any).drawings as
          Map<string, Uint8Array>;

      assert.strictEqual(drawings.size, 0);
    });
  });
});