import { Room, Client, CloseCode } from "colyseus";
import {
  GameState,
  Player,
  PlayerQuestion,
} from "./schema/GameState.js";
import { generateGameWords } from "../utils/WordGen.js";

const VALID_GAME_MODES = ["sketchRecall", "test"] as const;
type GameMode = typeof VALID_GAME_MODES[number];

const VALID_DRAWING_SPEEDS = [
  "easy",
  "normal",
  "hard",
] as const;
type DrawingSpeed = typeof VALID_DRAWING_SPEEDS[number];

const REQUIRED_PLAYER_QUESTIONS = 2;
const QUESTION_OPTION_COUNT = 4;

type ServerPlayerQuestion = {
  prompt: string;
  options: string[];
  correctOption: number;
};

type RecallAnswer = {
  sessionId: string;
  answer: string;
  submittedAt: number;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

function similarity(
  guess: string,
  target: string,
) {
  const left = normalize(guess);
  const right = normalize(target);

  if (left === right) return 1;
  if (!left || !right) return 0;

  const row = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );

  for (let i = 1; i <= left.length; i++) {
    let previous = row[0];
    row[0] = i;

    for (let j = 1; j <= right.length; j++) {
      const current = row[j];

      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous +
          (left[i - 1] === right[j - 1]
            ? 0
            : 1),
      );

      previous = current;
    }
  }

  const distance = row[right.length];

  return (
    1 -
    distance /
      Math.max(left.length, right.length)
  );
}

export class LobbyRoom extends Room {
  maxClients = 8;
  state = new GameState();

  // Drawings don't need to be constantly synced.
  private drawings =
    new Map<string, Uint8Array>();

  // Pairs the next binary drawing message
  // with its drawing index.
  private pendingDrawingIndexes =
    new Map<string, number>();

  // Competitive Recall state.
  private recallRound = 0;
  private recallReady = new Set<string>();
  private recallAnswers =
    new Map<string, RecallAnswer>();
  private recallDeadline = 0;
  private recallStarted = false;

  // Correct options stay private on the server; only prompts and options are
  // synchronized to the lobby through the Player schema.
  private playerQuestions = new Map<string, ServerPlayerQuestion[]>();

  messages = {
    yourMessageType: (
      client: Client,
      message: any,
    ) => {
      console.log(
        client.sessionId,
        "sent a message:",
        message,
      );
    },

    markReady: (
      client: Client,
      message: { ready: boolean },
    ) => {
      const player =
        this.state.players.get(
          client.sessionId,
        );

      if (player) {
        if (
          message.ready &&
          (this.playerQuestions.get(client.sessionId)?.length ?? 0) !==
            REQUIRED_PLAYER_QUESTIONS
        ) {
          client.send("questions_required", {
            reason: `Submit ${REQUIRED_PLAYER_QUESTIONS} questions before readying up.`,
          });
          return;
        }

        console.log(
          player.name,
          "changed ready to",
          message.ready,
        );

        player.ready = message.ready;
      }
    },

    submitPlayerQuestion: (
      client: Client,
      message: {
        prompt: string;
        options: string[];
        correctOption: number;
      },
    ) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.ready) return;

      const prompt = message.prompt?.trim().slice(0, 120);
      const options = Array.isArray(message.options)
        ? message.options.map((option) => option?.trim().slice(0, 60))
        : [];
      const correctOption = message.correctOption;

      if (
        !prompt ||
        options.length !== QUESTION_OPTION_COUNT ||
        options.some((option) => !option) ||
        !Number.isInteger(correctOption) ||
        correctOption < 0 ||
        correctOption >= QUESTION_OPTION_COUNT
      ) {
        client.send("question_error", {
          reason: "Each question needs a prompt, four options, and one correct option.",
        });
        return;
      }

      const questions = this.playerQuestions.get(client.sessionId) ?? [];
      if (questions.length >= REQUIRED_PLAYER_QUESTIONS) return;

      questions.push({ prompt, options, correctOption });
      this.playerQuestions.set(client.sessionId, questions);

      const publicQuestion = new PlayerQuestion();
      publicQuestion.prompt = prompt;
      publicQuestion.options.push(...options);
      player.questions.push(publicQuestion);
    },

      // Validate distraction answers on the server without revealing the
      // correct option in the synchronized lobby state.
      submitPlayerQuestionAnswer: (
        client: Client,
        message: {
          ownerSessionId: string;
          questionIndex: number;
          answerIndex: number;
        },
      ) => {
        if (
          !Number.isInteger(message.questionIndex) ||
          !Number.isInteger(message.answerIndex)
        ) {
          return;
        }

        const question = this.playerQuestions.get(
          message.ownerSessionId,
        )?.[message.questionIndex];

        if (
          !question ||
          message.answerIndex < 0 ||
          message.answerIndex >= QUESTION_OPTION_COUNT
        ) {
          return;
        }

        client.send("player_question_result", {
          questionId: `${message.ownerSessionId}:${message.questionIndex}`,
          correct:
            message.answerIndex === question.correctOption,
        });
      },

    changeName: (
      client: Client,
      message: { name: string },
    ) => {
      const player =
        this.state.players.get(
          client.sessionId,
        );

      if (!player) return;

      const trimmed = message.name
        ?.trim()
        .slice(0, 20);

      if (!trimmed) {
        client.send("name_error", {
          reason: "Name cannot be empty.",
        });

        return;
      }

      const nameTaken = [
        ...this.state.players.entries(),
      ].some(
        ([sessionId, otherPlayer]) =>
          sessionId !== client.sessionId &&
          otherPlayer.name.toLowerCase() ===
            trimmed.toLowerCase(),
      );

      if (nameTaken) {
        client.send("name_error", {
          reason:
            "That name is already taken.",
        });

        return;
      }

      console.log(
        player.name,
        "change to:",
        trimmed,
      );

      player.name = trimmed;
    },

    setGameMode: (
      client: Client,
      message: { mode: string },
    ) => {
      const player =
        this.state.players.get(
          client.sessionId,
        );

      if (!player?.isHost) return;

      if (
        !VALID_GAME_MODES.includes(
          message.mode as GameMode,
        )
      ) {
        client.send("mode_error", {
          reason: `Invalid game mode: ${message.mode}`,
        });

        return;
      }

      console.log(
        this.state.gameMode,
        "Changed to:",
        message.mode,
      );

      this.state.gameMode = message.mode;
    },

    setDrawingSpeed: (
      client: Client,
      message: { speed: string },
    ) => {
      const player =
        this.state.players.get(
          client.sessionId,
        );

      // Only the host can change the drawing speed.
      if (!player?.isHost) return;

      if (
        !VALID_DRAWING_SPEEDS.includes(
          message.speed as DrawingSpeed,
        )
      ) {
        client.send("drawing_speed_error", {
          reason: `Invalid drawing speed: ${message.speed}`,
        });

        return;
      }

      console.log(
        this.state.drawingSpeed,
        "Changed to:",
        message.speed,
      );

      this.state.drawingSpeed = message.speed;
    },

    startGame: (
      client: Client,
      _message: any,
    ) => {
      const player =
        this.state.players.get(
          client.sessionId,
        );

      if (!player?.isHost) return;

      const allReady = [
        ...this.state.players.values(),
      ].every(
        (currentPlayer) =>
          currentPlayer.ready,
      );

      if (!allReady) return;

      const wordCount = this.state.drawingSpeed === "easy" ? 20 : 25

      this.state.gameWords.clear();
      this.state.gameWords.push(
        ...generateGameWords(wordCount),
      );

      this.state.phase = "playing";

      // Reset Recall multiplayer state.
      this.recallRound = 0;
      this.recallReady.clear();
      this.recallAnswers.clear();
      this.recallDeadline = 0;
      this.recallStarted = false;
    },

    /*
     * Each player tells the server when
     * they have reached the same Recall round.
     *
     * The 10 second timer only starts once
     * everybody is ready.
     */
    readyRecallRound: (
      client: Client,
      message: {
        roundIndex: number;
      },
    ) => {
      if (
        this.state.phase !== "playing" ||
        message.roundIndex !==
          this.recallRound ||
        this.recallStarted
      ) {
        return;
      }

      this.recallReady.add(
        client.sessionId,
      );

      if (
        this.recallReady.size !==
        this.state.players.size
      ) {
        return;
      }

      this.recallStarted = true;
      this.recallDeadline =
        Date.now() + 10_000;

      this.broadcast(
        "recallRoundStarted",
        {
          roundIndex:
            this.recallRound,
          deadline:
            this.recallDeadline,
        },
      );

      this.clock.setTimeout(() => {
        this.finishRecallRound();
      }, 10_000);
    },

    /*
     * One answer per player.
     * submittedAt is created by the server,
     * not supplied by the browser.
     */
    submitRecallAnswer: (
      client: Client,
      message: {
        roundIndex: number;
        answer: string;
      },
    ) => {
      if (
        !this.recallStarted ||
        message.roundIndex !==
          this.recallRound ||
        Date.now() >
          this.recallDeadline ||
        this.recallAnswers.has(
          client.sessionId,
        )
      ) {
        return;
      }

      const answer = message.answer
        ?.trim()
        .slice(0, 100);

      if (!answer) return;

      this.recallAnswers.set(
        client.sessionId,
        {
          sessionId:
            client.sessionId,
          answer,
          submittedAt: Date.now(),
        },
      );

      // No need to wait for the remaining
      // timer if everybody answered.
      if (
        this.recallAnswers.size ===
        this.state.players.size
      ) {
        this.finishRecallRound();
      }
    },

    "submit-drawing-meta": (
      client: Client,
      message: {
        index: number;
      },
    ) => {
      this.pendingDrawingIndexes.set(
        client.sessionId,
        message.index,
      );
    },
  };

  private finishRecallRound() {
    if (!this.recallStarted) return;

    const correctWord =
      this.state.gameWords[
        this.recallRound
      ] ?? "";

    /*
     * Closest answer ranks first.
     *
     * If two answers are equally close,
     * the earlier server submission time wins.
     */
    const ranked = [
      ...this.recallAnswers.values(),
    ]
      .map((entry) => ({
        ...entry,
        similarity: similarity(
          entry.answer,
          correctWord,
        ),
      }))
      .sort(
        (left, right) =>
          right.similarity -
            left.similarity ||
          left.submittedAt -
            right.submittedAt,
      );

    const results = [
      ...this.state.players.entries(),
    ].map(
      ([sessionId, player]) => {
        const resultIndex =
          ranked.findIndex(
            (entry) =>
              entry.sessionId ===
              sessionId,
          );

        const entry =
          resultIndex >= 0
            ? ranked[resultIndex]
            : undefined;

        return {
          sessionId,
          playerName: player.name,
          answer:
            entry?.answer ?? "",
          rank: entry
            ? resultIndex + 1
            : null,
          timedOut: !entry,
        };
      },
    );

    this.broadcast(
      "recallRoundResult",
      {
        roundIndex:
          this.recallRound,
        correctWord,
        results,
      },
    );

    // Prepare for the next drawing.
    this.recallRound += 1;
    this.recallReady.clear();
    this.recallAnswers.clear();
    this.recallDeadline = 0;
    this.recallStarted = false;
  }

  onCreate(_options: any) {
    this.onMessageBytes(
      "submit-drawing",
      (client, bytes) => {
        const index =
          this.pendingDrawingIndexes.get(
            client.sessionId,
          ) ?? -1;

        this.pendingDrawingIndexes.delete(
          client.sessionId,
        );

        const drawingId =
          `${client.sessionId}:${index}`;

        this.drawings.set(
          drawingId,
          bytes,
        );

        console.log(
          client.sessionId,
          "submitted drawing",
          drawingId,
          bytes.length,
          "bytes",
        );
      },
    );
  }

  onJoin(
    client: Client,
    options: any,
  ) {
    let name =
      options.name
        ?.trim()
        .slice(0, 20) ||
      "Player";

    const nameTaken = [
      ...this.state.players.values(),
    ].some(
      (player) =>
        player.name.toLowerCase() ===
        name.toLowerCase(),
    );

    if (nameTaken) {
      name =
        `${name}${Math.floor(
          Math.random() * 1000,
        )}`;
    }

    const player = new Player();

    player.name = name;
    player.isHost =
      this.state.players.size === 0;

    this.state.players.set(
      client.sessionId,
      player,
    );
    this.playerQuestions.set(client.sessionId, []);

    console.log(
      client.sessionId,
      "joined as",
      player.name,
    );
  }

  onLeave(
    client: Client,
    code: CloseCode,
  ) {
    const wasHost =
      this.state.players.get(
        client.sessionId,
      )?.isHost;

    this.state.players.delete(
      client.sessionId,
    );
    this.playerQuestions.delete(client.sessionId);

    this.recallReady.delete(
      client.sessionId,
    );

    this.recallAnswers.delete(
      client.sessionId,
    );

    if (
      wasHost &&
      this.state.players.size > 0
    ) {
      const nextHost = [
        ...this.state.players.values(),
      ][0];

      nextHost.isHost = true;
    }

    console.log(
      client.sessionId,
      "left!",
      code,
    );
  }

  onDispose() {
    console.log(
      "room",
      this.roomId,
      "disposing...",
    );
  }
}