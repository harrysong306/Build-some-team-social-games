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
  wordPacks,
} from "../src/utils/sketchRecallWords.js";
import { distractionQuestions } from "../src/utils/distractionQuestions.js";

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
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });
    const client2 = await colyseus.connectTo(room, { name: "Sam" });

    // submitQuestions marks option `index` correct for question `index`.
    await submitQuestions(client1, room);
    await submitQuestions(client2, room);

    // With two players, each one gets both of the other's questions.
    const assigned = client2.waitForMessage("assigned_player_questions");

    client1.send("markReady", { ready: true });
    client2.send("markReady", { ready: true });
    await room.waitForNextPatch();

    client1.send("startGame", {});

    const questions = await assigned;
    assert.deepStrictEqual(
      questions.map((question: any) => question.ownerSessionId),
      [client1.sessionId, client1.sessionId],
    );

    const answer = async (
      client: any,
      ownerSessionId: string,
      questionIndex: any,
      answerIndex: any,
    ) => {
      const result = client.waitForMessage("player_question_result");
      client.send("submitPlayerQuestionAnswer", {
        ownerSessionId,
        questionIndex,
        answerIndex,
      });
      return result;
    };

    const right = await answer(client2, client1.sessionId, 1, 1);
    assert.strictEqual(right.questionId, `${client1.sessionId}:1`);
    assert.strictEqual(right.correct, true);

    const wrong = await answer(client2, client1.sessionId, 0, 3);
    assert.strictEqual(wrong.questionId, `${client1.sessionId}:0`);
    assert.strictEqual(wrong.correct, false);
  });

  describe("player questions are non-blocking (BE-32)", () => {
    async function startTwoPlayerGame() {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });
      const client2 = await colyseus.connectTo(room, { name: "Sam" });

      await submitQuestions(client1, room);
      await submitQuestions(client2, room);

      const assigned = client2.waitForMessage("assigned_player_questions");

      client1.send("markReady", { ready: true });
      client2.send("markReady", { ready: true });
      await room.waitForNextPatch();

      client1.send("startGame", {});
      await assigned;

      return { room, client1, client2 };
    }

    const answer = (
      client: any,
      message: any,
    ) => {
      const result = client.waitForMessage("player_question_result");
      client.send("submitPlayerQuestionAnswer", message);
      return result;
    };

    it("only the assigned player can answer, not the author", async () => {
      const { client1 } = await startTwoPlayerGame();

      // Option 0 is the right answer, but client1 wrote this question.
      const result = await answer(client1, {
        ownerSessionId: client1.sessionId,
        questionIndex: 0,
        answerIndex: 0,
      });

      assert.strictEqual(result.questionId, `${client1.sessionId}:0`);
      assert.strictEqual(result.correct, false);
    });

    it("keeps the first answer, so guessing again can't find the right option", async () => {
      const { client1, client2 } = await startTwoPlayerGame();

      const message = (answerIndex: number) => ({
        ownerSessionId: client1.sessionId,
        questionIndex: 0,
        answerIndex,
      });

      assert.strictEqual((await answer(client2, message(2))).correct, false);
      assert.strictEqual((await answer(client2, message(0))).correct, false);
    });

    it("still replies to invalid answers so the client never hangs", async () => {
      const { client1, client2 } = await startTwoPlayerGame();

      const outOfRange = await answer(client2, {
        ownerSessionId: client1.sessionId,
        questionIndex: 0,
        answerIndex: 9,
      });

      assert.strictEqual(outOfRange.questionId, `${client1.sessionId}:0`);
      assert.strictEqual(outOfRange.correct, false);

      const unknown = await answer(client2, {
        ownerSessionId: "nobody",
        questionIndex: "x",
        answerIndex: 0,
      });

      assert.strictEqual(unknown.questionId, "nobody:x");
      assert.strictEqual(unknown.correct, false);
    });

    it("rejects answers outside a game", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client = await colyseus.connectTo(room, { name: "Jordan" });
      await submitQuestions(client, room);

      assert.strictEqual(
        (await answer(client, {
          ownerSessionId: client.sessionId,
          questionIndex: 0,
          answerIndex: 0,
        })).correct,
        false,
      );
    });
  });

  it("changeName rejects an empty name and leaves state unchanged", async () => {
    const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
    const client1 = await colyseus.connectTo(room, { name: "Jordan" });

    client1.send("changeName", { name: "   " });
    await room.waitForNextPatch();

    const player = client1.state.players.get(client1.sessionId);

    assert.strictEqual(player?.name, "Jordan");
  });

  describe("distraction questions on the server (BE-15)", () => {
    async function startSoloGame() {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client = await colyseus.connectTo(room, { name: "Jordan" });

      await submitQuestions(client, room);
      client.send("markReady", { ready: true });
      await room.waitForNextPatch();

      client.send("startGame", {});
      await room.waitForNextPatch();

      return { room, client };
    }

    const nextQuestion = (client: any) => {
      const question = client.waitForMessage("distractionQuestion");
      client.send("requestDistractionQuestion", {});
      return question;
    };

    const submit = (client: any, questionId: any, answer: string) => {
      const result = client.waitForMessage("distractionResult");
      client.send("submitDistractionAnswer", { questionId, answer });
      return result;
    };

    it("serves bank questions without their answers", async () => {
      const { client } = await startSoloGame();

      const question = await nextQuestion(client);
      const bankQuestion = distractionQuestions[question.questionId];

      assert.strictEqual(question.question, bankQuestion.question);
      assert.deepStrictEqual(
        [...question.options].sort(),
        [...bankQuestion.options].sort(),
      );
      assert.strictEqual("answer" in question, false);
    });

    it("resends the same question until it is answered", async () => {
      const { client } = await startSoloGame();

      const first = await nextQuestion(client);
      const again = await nextQuestion(client);

      assert.strictEqual(again.questionId, first.questionId);
    });

    it("needs 5 answers with 3 correct before the phase is complete", async () => {
      const { client } = await startSoloGame();
      let progress: any;

      // 2 wrong (one of them a timeout), then 3 right.
      for (const answerRight of [false, false, true, true, true]) {
        const question = await nextQuestion(client);
        const bankQuestion = distractionQuestions[question.questionId];
        const answer = answerRight
          ? bankQuestion.answer
          : progress === undefined
            ? ""
            : bankQuestion.options.find(
                (option) => option !== bankQuestion.answer,
              )!;

        assert.strictEqual(progress?.complete ?? false, false);

        const result = await submit(client, question.questionId, answer);
        assert.strictEqual(result.correct, answerRight);
        progress = result.progress;
      }

      assert.deepStrictEqual(progress, {
        answered: 5,
        correct: 3,
        required: 3,
        complete: true,
      });
    });

    it("keeps asking after 5 answers until 3 are correct", async () => {
      const { client } = await startSoloGame();
      let progress: any;

      for (let index = 0; index < 5; index += 1) {
        const question = await nextQuestion(client);
        progress = (await submit(client, question.questionId, "")).progress;
      }

      assert.strictEqual(progress.answered, 5);
      assert.strictEqual(progress.complete, false);

      // The bank keeps going (and reshuffles once used up).
      const question = await nextQuestion(client);
      assert.ok(distractionQuestions[question.questionId]);
    });

    it("ignores answers to a question that wasn't served", async () => {
      const { client } = await startSoloGame();

      const question = await nextQuestion(client);
      const otherId =
        (question.questionId + 1) % distractionQuestions.length;

      const result = await submit(
        client,
        otherId,
        distractionQuestions[otherId].answer,
      );

      assert.strictEqual(result.correct, false);
      assert.strictEqual(result.progress.answered, 0);
    });

    it("counts answers to player-submitted questions too", async () => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const client1 = await colyseus.connectTo(room, { name: "Jordan" });
      const client2 = await colyseus.connectTo(room, { name: "Sam" });

      await submitQuestions(client1, room);
      await submitQuestions(client2, room);

      const assigned = client2.waitForMessage("assigned_player_questions");
      client1.send("markReady", { ready: true });
      client2.send("markReady", { ready: true });
      await room.waitForNextPatch();
      client1.send("startGame", {});
      await assigned;

      const result = client2.waitForMessage("player_question_result");
      client2.send("submitPlayerQuestionAnswer", {
        ownerSessionId: client1.sessionId,
        questionIndex: 0,
        answerIndex: 0,
      });

      assert.deepStrictEqual((await result).progress, {
        answered: 1,
        correct: 1,
        required: 3,
        complete: false,
      });
    });

    it("starts every new game from zero", async () => {
      const { room, client } = await startSoloGame();

      const question = await nextQuestion(client);
      await submit(client, question.questionId, "");

      (room as any).distractionProgress.get(client.sessionId).answered = 9;
      (room as any).state.phase = "lobby";
      client.send("markReady", { ready: true });
      await room.waitForNextPatch();
      client.send("startGame", {});
      await room.waitForNextPatch();

      const next = await nextQuestion(client);
      const result = await submit(client, next.questionId, "");
      assert.strictEqual(result.progress.answered, 1);
    });
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

  describe("setWordTheme", () => {
    it("only the host can set the word theme", async () => {
      const room =
        await colyseus.createRoom<GameState>(
          "LobbyRoom",
          {},
        );

      const host =
        await colyseus.connectTo(
          room,
          { name: "Jordan" },
        );

      const guest =
        await colyseus.connectTo(
          room,
          { name: "Sam" },
        );

      assert.strictEqual(
        room.state.wordTheme,
        "general",
      );

      guest.send("setWordTheme", {
        theme: "animals",
      });

      await new Promise(resolve =>
        setTimeout(resolve, 20),
      );

      assert.strictEqual(
        room.state.wordTheme,
        "general",
      );

      host.send("setWordTheme", {
        theme: "animals",
      });

      await room.waitForNextPatch();

      assert.strictEqual(
        room.state.wordTheme,
        "animals",
      );

      assert.strictEqual(
        guest.state.wordTheme,
        "animals",
      );
    });

    it("rejects an invalid word theme", async () => {
      const room =
        await colyseus.createRoom<GameState>(
          "LobbyRoom",
          {},
        );

      const host =
        await colyseus.connectTo(
          room,
          { name: "Jordan" },
        );

      const errorPromise =
        new Promise<any>((resolve) => {
          host.onMessage(
            "word_theme_error",
            resolve,
          );
        });

      host.send("setWordTheme", {
        theme: "unknown-theme",
      });

      const error =
        await errorPromise;

      assert.strictEqual(
        room.state.wordTheme,
        "general",
      );

      assert.ok(
        error.reason.includes(
          "Invalid word theme",
        ),
      );
    });

    it("startGame generates words from the selected theme", async () => {
      const room =
        await colyseus.createRoom<GameState>(
          "LobbyRoom",
          {},
        );

      const host =
        await colyseus.connectTo(
          room,
          { name: "Jordan" },
        );

      host.send("setWordTheme", {
        theme: "animals",
      });

      host.send("setDrawingCount", {
        count: 10,
      });

      await submitQuestions(host, room);

      host.send("markReady", {
        ready: true,
      });

      await room.waitForNextPatch();

      host.send("startGame", {});

      await room.waitForNextPatch();

      const animalWords =
        new Set<string>([
          ...wordPacks.animals.generalWords,
          ...wordPacks.animals
            .similarWordGroups
            .flat(),
        ]);

      assert.strictEqual(
        room.state.gameWords.length,
        10,
      );

      assert.ok(
        [...room.state.gameWords].every(
          word =>
            animalWords.has(word),
        ),
      );
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

    it("generates words from the selected theme", () => {
      const words =
        generateGameWords(
          25,
          "animals",
        );

      const allowedWords =
        new Set<string>([
          ...wordPacks.animals.generalWords,
          ...wordPacks.animals
            .similarWordGroups
            .flat(),
        ]);

      assert.strictEqual(
        words.length,
        25,
      );

      assert.ok(
        words.every(
          word =>
            allowedWords.has(word),
        ),
      );
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

  /*
   * Lives, BE-16 (anonymous recall) and BE-20
   * (team abilities).
   *
   * These wait for the server to actually handle
   * each message instead of waiting for a patch
   * tick, so they don't depend on timing.
   */
  describe("lives, anonymous recall and team abilities", () => {
    const sendAndWait = async (room: any, client: any, type: string, message: any = {}) => {
      const handled = room.waitForMessage(type);
      client.send(type, message);
      await handled;
    };

    const player = (room: any, client: any) =>
      room.state.players.get(client.sessionId);

    // Players in a started game with full lives.
    const setupGame = async (names: string[], words: string[]) => {
      const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
      const clients = [];
      for (const name of names) {
        clients.push(await colyseus.connectTo(room, { name }));
      }

      room.state.phase = "playing";
      room.state.gameWords.push(...words);
      room.state.players.forEach((current: any) => { current.lives = 3; });

      return { room, clients };
    };

    const startRound = async (room: any, clients: any[], roundIndex = 0) => {
      for (const client of clients) {
        await sendAndWait(room, client, "readyRecallRound", { roundIndex });
      }
    };

    describe("lives", () => {
      it("gives every player 3 lives when a game starts", async () => {
        const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
        const client1 = await colyseus.connectTo(room, { name: "Jordan" });
        player(room, client1).lives = 0;

        // Set directly: readying up may have its own
        // requirements (e.g. player questions).
        room.state.players.forEach((current: any) => { current.ready = true; });
        await sendAndWait(room, client1, "startGame");

        assert.strictEqual(player(room, client1).lives, 3);
      });

      it("takes a life for a 0-point answer or no answer, not for a scoring one", async () => {
        const { room, clients: [client1, client2] } = await setupGame(["Jordan", "Sam"], ["cat", "dog"]);
        await startRound(room, [client1, client2]);

        const result = client1.waitForMessage("recallRoundResult");
        await sendAndWait(room, client1, "submitRecallAnswer", { roundIndex: 0, answer: "cat" });
        (room as any).finishRecallRound(); // Sam never answers
        const message: any = await result;

        assert.strictEqual(player(room, client1).lives, 3);
        assert.strictEqual(player(room, client2).lives, 2);

        const samResult = message.results.find((r: any) => r.sessionId === client2.sessionId);
        assert.strictEqual(samResult.lostLife, true);
        assert.strictEqual(samResult.lives, 2);
      });

      it("stops a player with no lives left from answering", async () => {
        const { room, clients: [client1, client2] } = await setupGame(["Jordan", "Sam"], ["cat", "dog"]);
        player(room, client2).lives = 0;
        await startRound(room, [client1, client2]);

        await sendAndWait(room, client2, "submitRecallAnswer", { roundIndex: 0, answer: "cat" });
        assert.strictEqual((room as any).recallAnswers.has(client2.sessionId), false);

        // Only Jordan is still in, so his answer ends the round.
        await sendAndWait(room, client1, "submitRecallAnswer", { roundIndex: 0, answer: "cat" });

        assert.strictEqual((room as any).recallRound, 1);
        assert.strictEqual(player(room, client2).lives, 0); // can't go below 0
      });

      it("ends the round straight away when everyone is out", async () => {
        const { room, clients: [client1] } = await setupGame(["Jordan"], ["cat", "dog"]);
        player(room, client1).lives = 0;

        const result = client1.waitForMessage("recallRoundResult");
        await startRound(room, [client1]);
        await result;

        assert.strictEqual((room as any).recallRound, 1);
      });
    });

    describe("anonymous recall (BE-16)", () => {
      it("sends one randomly selected drawing to all other players", async () => {
        const { room, clients } = await setupGame(
          ["Jordan", "Sam", "Alex"],
          ["cat"],
        );

        room.state.gameMode = "anonymousRecall";

        const drawings = [
          new Uint8Array([1]),
          new Uint8Array([2]),
          new Uint8Array([3]),
        ];

        clients.forEach((client, index) => {
          (room as any).drawings.set(
            `${client.sessionId}:0`,
            drawings[index],
          );
        });

        const received = clients.map((client) =>
          client.waitForMessage("recallDrawing"),
        );

        await startRound(room, clients);

        const messages: any[] = await Promise.all(received);

        // Exactly one player is the selected artist.
        const artistIndexes = messages
          .map((message, index) =>
            message.isArtist ? index : -1,
          )
          .filter((index) => index !== -1);

        assert.strictEqual(artistIndexes.length, 1);

        const artistIndex = artistIndexes[0];
        const artist = clients[artistIndex];

        // The selected artist receives no image.
        assert.strictEqual(messages[artistIndex].image, null);
        assert.strictEqual(messages[artistIndex].isArtist, true);

        // The server remembers the selected artist.
        assert.strictEqual(
          (room as any).selectedRecallArtistSessionId,
          artist.sessionId,
        );

        const expectedImage = Buffer.from(
          drawings[artistIndex],
        ).toString("base64");

        // All other players receive the same drawing.
        messages.forEach((message, index) => {
          assert.strictEqual(message.roundIndex, 0);

          if (index !== artistIndex) {
            assert.strictEqual(message.isArtist, false);
            assert.strictEqual(message.image, expectedImage);
          }

          // The artist's identity is not sent to other players.
          assert.deepStrictEqual(
            Object.keys(message).sort(),
            ["image", "isArtist", "roundIndex"],
          );
        });
      });

      it("does not send the artist their own drawing in a single-player room", async () => {
        const { room, clients: [client1] } = await setupGame(
          ["Jordan"],
          ["cat"],
        );

        room.state.gameMode = "anonymousRecall";

        (room as any).drawings.set(
          `${client1.sessionId}:0`,
          new Uint8Array([7]),
        );

        const received = client1.waitForMessage("recallDrawing");
        const roundResult = client1.waitForMessage("recallRoundResult");

        await startRound(room, [client1]);

        const message: any = await received;
        await roundResult;

        // The only player is the artist.
        assert.strictEqual(message.roundIndex, 0);
        assert.strictEqual(message.isArtist, true);
        assert.strictEqual(message.image, null);

        // No guessing players, so the round ends immediately.
        assert.strictEqual((room as any).recallRound, 1);
      });

      it("prevents the selected artist from submitting an answer", async () => {
        const { room, clients } = await setupGame(
          ["Jordan", "Sam", "Alex"],
          ["cat"],
        );

        room.state.gameMode = "anonymousRecall";

        clients.forEach((client, index) => {
          (room as any).drawings.set(
            `${client.sessionId}:0`,
            new Uint8Array([index + 1]),
          );
        });

        await startRound(room, clients);

        const artistSessionId =
          (room as any).selectedRecallArtistSessionId;

        const artist = clients.find(
          (client) => client.sessionId === artistSessionId,
        );

        assert.ok(artist);

        await sendAndWait(room, artist, "submitRecallAnswer", {
          roundIndex: 0,
          answer: "cat",
        });

        // The artist's answer must be rejected.
        assert.strictEqual(
          (room as any).recallAnswers.has(artistSessionId),
          false,
        );
      });

      it("does not send drawings in the normal sketchRecall mode", async () => {
        const { room, clients: [client1] } = await setupGame(["Jordan"], ["cat"]);
        (room as any).drawings.set(`${client1.sessionId}:0`, new Uint8Array([7]));

        let receivedDrawing = false;
        client1.onMessage("recallDrawing", () => { receivedDrawing = true; });

        const started = client1.waitForMessage("recallRoundStarted");
        await startRound(room, [client1]);
        await started;

        assert.strictEqual(receivedDrawing, false);
      });
    });

    describe("team abilities (BE-20)", () => {
      it("activates a hint once more than half the players vote for it", async () => {
        const { room, clients: [client1, client2] } = await setupGame(["Jordan", "Sam"], ["Pine Tree", "dog"]);
        await startRound(room, [client1, client2]);

        await sendAndWait(room, client1, "voteAbility", { roundIndex: 0, ability: "hint" });
        assert.strictEqual(room.state.usedAbilities.length, 0); // 1 of 2 isn't a majority

        const activated = client2.waitForMessage("abilityActivated");
        await sendAndWait(room, client2, "voteAbility", { roundIndex: 0, ability: "hint" });
        const message: any = await activated;

        assert.deepStrictEqual([...room.state.usedAbilities], ["hint"]);
        assert.strictEqual(message.hint, 'Starts with "P", 8 letters (2 words)');
      });

      it("only allows each ability once per game and one ability per round", async () => {
        const { room, clients: [client1, client2] } = await setupGame(["Jordan", "Sam"], ["cat", "dog"]);
        await startRound(room, [client1, client2]);

        await sendAndWait(room, client1, "voteAbility", { roundIndex: 0, ability: "hint" });
        await sendAndWait(room, client2, "voteAbility", { roundIndex: 0, ability: "hint" });

        // Another ability in the same round is ignored.
        await sendAndWait(room, client1, "voteAbility", { roundIndex: 0, ability: "reveal" });
        await sendAndWait(room, client2, "voteAbility", { roundIndex: 0, ability: "reveal" });
        assert.deepStrictEqual([...room.state.usedAbilities], ["hint"]);

        // Next round: hint is already spent.
        (room as any).finishRecallRound();
        await startRound(room, [client1, client2], 1);
        await sendAndWait(room, client1, "voteAbility", { roundIndex: 1, ability: "hint" });
        await sendAndWait(room, client2, "voteAbility", { roundIndex: 1, ability: "hint" });

        assert.deepStrictEqual([...room.state.usedAbilities], ["hint"]);
      });

      it("reveal sends another player's drawing without the artist's identity", async () => {
        const { room, clients: [client1, client2] } = await setupGame(["Jordan", "Sam"], ["cat"]);
        (room as any).drawings.set(`${client1.sessionId}:0`, new Uint8Array([1]));
        (room as any).drawings.set(`${client2.sessionId}:0`, new Uint8Array([2]));
        await startRound(room, [client1, client2]);

        const received1 = client1.waitForMessage("abilityActivated");
        const received2 = client2.waitForMessage("abilityActivated");
        await sendAndWait(room, client1, "voteAbility", { roundIndex: 0, ability: "reveal" });
        await sendAndWait(room, client2, "voteAbility", { roundIndex: 0, ability: "reveal" });
        const [message1, message2]: any[] = await Promise.all([received1, received2]);

        assert.deepStrictEqual([...Buffer.from(message1.image, "base64")], [2]);
        assert.deepStrictEqual([...Buffer.from(message2.image, "base64")], [1]);
        assert.deepStrictEqual(Object.keys(message1).sort(), ["ability", "image", "roundIndex", "seconds"]);
      });

      it("ignores votes from players who are out of lives", async () => {
        const { room, clients: [client1, client2] } = await setupGame(["Jordan", "Sam"], ["cat"]);
        player(room, client2).lives = 0;
        await startRound(room, [client1, client2]);

        await sendAndWait(room, client2, "voteAbility", { roundIndex: 0, ability: "hint" });
        assert.strictEqual((room as any).abilityVotes.size, 0);

        // Jordan is the only one left, so his vote alone is a majority.
        await sendAndWait(room, client1, "voteAbility", { roundIndex: 0, ability: "hint" });
        assert.deepStrictEqual([...room.state.usedAbilities], ["hint"]);
      });

      it("clears used abilities when a new game starts", async () => {
        const room = await colyseus.createRoom<GameState>("LobbyRoom", {});
        const client1 = await colyseus.connectTo(room, { name: "Jordan" });
        room.state.usedAbilities.push("hint");

        room.state.players.forEach((current: any) => { current.ready = true; });
        await sendAndWait(room, client1, "startGame");

        assert.strictEqual(room.state.usedAbilities.length, 0);
      });
    });
  });
});
