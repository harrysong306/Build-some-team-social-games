import { Room, Client, CloseCode } from "colyseus";
import {
  GameState,
  Player,
  PlayerQuestion,
} from "./schema/GameState.js";
import { GuessAwards } from "./GuessAwards.js";
import { generateGameWords } from "../utils/WordGen.js";
import { wordPacks, type WordPackTheme } from "../utils/sketchRecallWords.js";

const VALID_GAME_MODES = ["sketchRecall", "anonymousRecall", "test"] as const;
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

type AssignedPlayerQuestion = {
  ownerSessionId: string;
  questionIndex: number;
  ownerName: string;
  prompt: string;
  options: string[];
};

// How many drawings/words a game can be
// configured to have. Independent of
// drawingSpeed, which only affects the
// per-drawing timer.
//
// Minimum is 10, not lower: generateGameWords
// always includes 3 complete similar-word
// groups (9 words), and asking it for fewer
// than that breaks its general-word fill-in.
const MIN_DRAWING_COUNT = 10;
const MAX_DRAWING_COUNT = 30;
const VALID_WORD_THEMES = Object.keys(wordPacks) as WordPackTheme[];

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

function scoreRecallAnswer(
  guess: string,
  target: string,
) {
  const left = normalize(guess);
  const right = normalize(target);

  if (!left && !right) return 4;
  if (!left || !right) return 0;
  if (left === right) return 4;

  let score = Math.round(
    similarity(left, right) * 4,
  );

  if (
    left.includes(right) ||
    right.includes(left)
  ) {
    score = Math.max(score, 3);
  }

  return Math.max(
    0,
    Math.min(4, score),
  );
}

/*
 * anonymousRecall mode (BE-16): same flow as
 * sketchRecall, but in Recall each player
 * guesses someone else's drawing, sent without
 * the artist's identity.
 */
const ANONYMOUS_RECALL_MODE = "anonymousRecall";

/*
 * Lives, on top of the 0-4 Recall scoring: an
 * answer worth 0 points (wrong or no answer)
 * costs a life. A player with no lives left is
 * out: they keep watching but can't answer or
 * vote.
 */
const STARTING_LIVES = 3;

/*
 * BE-20: team abilities. Players vote during
 * a Recall round; once more than half of the
 * players still in the game pick the same
 * ability, it activates for everyone. Each
 * ability can be used once per game, and at
 * most one ability per round.
 */
const ABILITIES = ["hint", "reveal"] as const;
type Ability = typeof ABILITIES[number];
const REVEAL_SECONDS = 5;

export class LobbyRoom extends Room {
  maxClients = 8;
  state = new GameState();

  // BE-20: this round's ability votes.
  private abilityVotes =
    new Map<string, Ability>();
  private abilityUsedThisRound = false;

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

  // FE-48: every answer this game, for the
  // Best / Funniest Guess podiums.
  private guessAwards = new GuessAwards();

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
      const correctOption = Number(
        message.correctOption,
      );

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
        const questionIndex = Number(
          message.questionIndex,
        );
        const answerIndex = Number(
          message.answerIndex,
        );

        if (
          !Number.isInteger(questionIndex) ||
          !Number.isInteger(answerIndex)
        ) {
          return;
        }

        const question = this.playerQuestions.get(
          message.ownerSessionId,
        )?.[questionIndex];

        if (
          !question ||
          answerIndex < 0 ||
          answerIndex >= QUESTION_OPTION_COUNT
        ) {
          return;
        }

        client.send("player_question_result", {
          questionId: `${message.ownerSessionId}:${message.questionIndex}`,
          correct:
          answerIndex === Number(question.correctOption),
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

      this.state.drawingSpeed =
        message.speed;
    },

    setDrawingCount: (
      client: Client,
      message: { count: number },
    ) => {
      const player =
        this.state.players.get(
          client.sessionId,
        );

      // Only the host can change the drawing count.
      if (!player?.isHost) return;

      const count = Math.round(
        message.count,
      );

      if (
        !Number.isFinite(count) ||
        count < MIN_DRAWING_COUNT ||
        count > MAX_DRAWING_COUNT
      ) {
        client.send("drawing_count_error", {
          reason: `Number of drawings must be between ${MIN_DRAWING_COUNT} and ${MAX_DRAWING_COUNT}.`,
        });

        return;
      }

      console.log(
        this.state.drawingCount,
        "Changed to:",
        count,
      );

      this.state.drawingCount =
        count;
    },

    setWordTheme: (
      client: Client,
      message: { theme: string },
    ) => {
      const player =
        this.state.players.get(
          client.sessionId,
        );

      // Only the host can change the word theme.
      if (!player?.isHost) return;

      if (
        !VALID_WORD_THEMES.includes(
          message.theme as WordPackTheme,
        )
      ) {
        client.send("word_theme_error", {
          reason: `Invalid word theme: ${message.theme}`,
        });

        return;
      }

      this.state.wordTheme = message.theme;
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

      // Games can only be started from the shared lobby.
      if (this.state.phase !== "lobby") return;

      const allReady = [
        ...this.state.players.values(),
      ].every(
        (currentPlayer) =>
          currentPlayer.ready,
      );

      if (!allReady) return;

      const wordCount =
        this.state.drawingCount;

      this.state.gameWords.clear();
      this.state.gameWords.push(
        ...generateGameWords(wordCount, this.state.wordTheme as WordPackTheme),
      );

      // Assign each personal question to one random player other than its
      // author. The author never receives their own question.
      const players = [...this.state.players.entries()];
      const assignedQuestions = new Map<string, AssignedPlayerQuestion[]>();

      for (const [ownerSessionId, owner] of players) {
        const eligiblePlayers = players.filter(
          ([sessionId]) => sessionId !== ownerSessionId,
        );

        for (const [questionIndex, question] of (
          this.playerQuestions.get(ownerSessionId) ?? []
        ).entries()) {
          if (eligiblePlayers.length === 0) continue;

          const [recipientSessionId] = eligiblePlayers[
            Math.floor(Math.random() * eligiblePlayers.length)
          ];

          const recipientQuestions =
            assignedQuestions.get(recipientSessionId) ?? [];

          recipientQuestions.push({
            ownerSessionId,
            questionIndex,
            ownerName: owner.name,
            prompt: question.prompt,
            options: question.options,
          });
          assignedQuestions.set(
            recipientSessionId,
            recipientQuestions,
          );
        }
      }

      for (const [recipientSessionId, questions] of assignedQuestions) {
        this.clients
          .find((connectedClient) =>
            connectedClient.sessionId === recipientSessionId,
          )
          ?.send("assigned_player_questions", questions);
          }
      // Start each new game with a clean scoreboard.
      for (
        const currentPlayer of
        this.state.players.values()
      ) {
        currentPlayer.score = 0;
        currentPlayer.lives = STARTING_LIVES;

      }

      this.state.usedAbilities.clear();

      this.state.phase = "playing";

      // Reset Recall multiplayer state.
      this.recallRound = 0;
      this.recallReady.clear();
      this.recallAnswers.clear();
      this.recallDeadline = 0;
      this.recallStarted = false;

      // Never reuse drawings or pending
      // drawing metadata from a previous game.
      this.drawings.clear();
      this.pendingDrawingIndexes.clear();

      this.abilityVotes.clear();
      this.abilityUsedThisRound = false;
    },

    /*
     * Return every player to the shared lobby after
     * the final Recall round.
     *
     * Only the host can trigger a replay, and only
     * once all Recall rounds have actually finished.
     *
     * Final scores remain intact while players are
     * returned to the lobby. startGame resets them
     * when the next game begins.
     */
    returnToLobby: (
      client: Client,
      _message: any,
    ) => {
      const player =
        this.state.players.get(
          client.sessionId,
        );

      if (!player?.isHost) return;

      const recallComplete =
        !this.recallStarted &&
        this.recallRound >=
          this.state.gameWords.length;

      if (
        this.state.phase !== "playing" ||
        !recallComplete
      ) {
        return;
      }

      for (
        const currentPlayer of
        this.state.players.values()
      ) {
        currentPlayer.ready = false;
      }

      this.state.phase = "lobby";
      this.state.gameWords.clear();

      this.recallRound = 0;
      this.recallReady.clear();
      this.recallAnswers.clear();
      this.recallDeadline = 0;
      this.recallStarted = false;

      this.drawings.clear();
      this.pendingDrawingIndexes.clear();

      this.abilityVotes.clear();
      this.abilityUsedThisRound = false;
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

      const roundIndex =
        this.recallRound;

      this.broadcast(
        "recallRoundStarted",
        {
          roundIndex,
          deadline:
            this.recallDeadline,
        },
      );

      if (
        this.state.gameMode ===
        ANONYMOUS_RECALL_MODE
      ) {
        this.sendAnonymousDrawings();
      }

      // Everyone is out of lives: nobody can
      // answer, so don't make them wait 10s.
      if (this.alivePlayerIds().length === 0) {
        this.finishRecallRound();
        return;
      }

      this.clock.setTimeout(() => {
        if (
          this.recallStarted &&
          this.recallRound ===
            roundIndex
        ) {
          this.finishRecallRound();
        }
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
        ) ||
        !this.isAlive(client.sessionId)
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
        this.recallAnswers.size >=
        this.alivePlayerIds().length
      ) {
        this.finishRecallRound();
      }
    },

    /*
     * BE-20: vote for a team ability during
     * the current Recall round.
     */
    voteAbility: (
      client: Client,
      message: {
        roundIndex: number;
        ability: string;
      },
    ) => {
      const ability =
        message.ability as Ability;

      if (
        !this.recallStarted ||
        message.roundIndex !==
          this.recallRound ||
        !ABILITIES.includes(ability) ||
        this.state.usedAbilities.includes(
          ability,
        ) ||
        this.abilityUsedThisRound ||
        !this.isAlive(client.sessionId)
      ) {
        return;
      }

      this.abilityVotes.set(
        client.sessionId,
        ability,
      );

      // Only count votes from players still in
      // the game (someone may have left since).
      const alive = this.alivePlayerIds();
      const needed =
        Math.floor(alive.length / 2) + 1;

      const counts = Object.fromEntries(
        ABILITIES.map((name) => [
          name,
          alive.filter(
            (sessionId) =>
              this.abilityVotes.get(sessionId) ===
              name,
          ).length,
        ]),
      ) as Record<Ability, number>;

      this.broadcast("abilityVotes", {
        roundIndex: this.recallRound,
        counts,
        needed,
      });

      if (counts[ability] >= needed) {
        this.activateAbility(ability);
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

    /*
     * The manifest is also broadcast once
     * automatically (see finishRecallRound),
     * but a client that reaches the results
     * screen after that already happened
     * (the normal case: everyone still has to
     * read the last round result and press
     * Finish first) would otherwise never see
     * it. So it's also available on request.
     */
    requestFinalGallery: (
      client: Client,
      _message: any,
    ) => {
      if (!this.isGameOver()) return;

      client.send("finalGallery", {
        entries:
          this.buildGalleryManifest(),
      });
    },

    /*
     * Final gallery images are pulled one at
     * a time instead of broadcast all at once,
     * since dozens of PNGs in a single message
     * can blow past the websocket maxPayload
     * (see host-drawing-mode's size-limit bug).
     *
     * Only answered once the game has actually
     * finished, so drawings can't leak early.
     */
    requestGalleryImage: (
      client: Client,
      message: {
        sessionId: string;
        index: number;
      },
    ) => {
      if (!this.isGameOver()) return;

      const drawing =
        this.drawings.get(
          `${message.sessionId}:${message.index}`,
        );

      if (!drawing) return;

      client.send("galleryImage", {
        sessionId:
          message.sessionId,
        index:
          message.index,
        image:
          Buffer.from(
            drawing,
          ).toString("base64"),
      });
    },

    /*
     * FE-48: the Best / Funniest Guess podiums,
     * only once the game has finished (like the
     * final gallery).
     */
    requestGuessAwards: (
      client: Client,
      _message: any,
    ) => {
      if (!this.isGameOver()) return;

      client.send(
        "guessAwards",
        this.guessAwards.summary(),
      );
    },

    // FE-48: vote for the funniest answer.
    voteFunniestGuess: (
      client: Client,
      message: {
        guessId: string;
      },
    ) => {
      if (
        !this.isGameOver() ||
        !this.state.players.has(client.sessionId) ||
        !this.guessAwards.vote(
          client.sessionId,
          String(message?.guessId),
        )
      ) {
        return;
      }

      this.broadcast(
        "guessAwards",
        this.guessAwards.summary(),
      );
    },
  };

  private finishRecallRound() {
    if (!this.recallStarted) return;

    const roundIndex =
      this.recallRound;

    const correctWord =
      this.state.gameWords[
        roundIndex
      ] ?? "";

    /*
     * Each answer keeps the original
     * Sketch Recall 0-4 grading.
     *
     * Higher scores rank first.
     * Equal scores are ordered by the
     * earlier server submission time.
     */
    const ranked = [
      ...this.recallAnswers.values(),
    ]
      .map((entry) => ({
        ...entry,
        pointsEarned:
          scoreRecallAnswer(
            entry.answer,
            correctWord,
          ),
      }))
      .sort(
        (left, right) =>
          right.pointsEarned -
            left.pointsEarned ||
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

        const pointsEarned =
          entry?.pointsEarned ?? 0;

        player.score +=
          pointsEarned;

        // A 0-point answer costs a life, but
        // only for players who were still in.
        const lostLife =
          pointsEarned === 0 &&
          player.lives > 0;

        if (lostLife) {
          player.lives -= 1;
        }

        return {
          sessionId,
          playerName:
            player.name,
          answer:
            entry?.answer ?? "",
          rank:
            entry
              ? resultIndex + 1
              : null,
          timedOut:
            !entry,
          pointsEarned,
          totalScore:
            player.score,
          lostLife,
          lives: player.lives,
        };
      },
    );

    // FE-48: keep this round's answers for the
    // end-of-game podiums.
    this.guessAwards.recordRound(
      roundIndex,
      correctWord,
      this.recallDeadline,
      ranked.map((entry) => ({
        sessionId: entry.sessionId,
        playerName:
          this.state.players.get(entry.sessionId)
            ?.name ?? "",
        answer: entry.answer,
        points: entry.pointsEarned,
        submittedAt: entry.submittedAt,
      })),
    );

    /*
     * Deliver the round result only after the score
     * mutations above have reached every client.
     *
     * This matters on the final round because the
     * result message can transition the UI to the
     * final leaderboard.
     */
    this.broadcast(
      "recallRoundResult",
      {
        roundIndex,
        correctWord,
        results,
      },
      {
        afterNextPatch: true,
      },
    );

    // Prepare for the next drawing.
    this.recallRound += 1;
    this.recallReady.clear();
    this.recallAnswers.clear();
    this.recallDeadline = 0;
    this.recallStarted = false;
    this.abilityVotes.clear();
    this.abilityUsedThisRound = false;

    if (this.isGameOver()) {
      // Manifest only: no image bytes here.
      // Clients fetch each drawing they want
      // to show via requestGalleryImage.
      this.broadcast(
        "finalGallery",
        {
          entries:
            this.buildGalleryManifest(),
        },
      );
    }
  }

  private isAlive(sessionId: string) {
    return (
      (this.state.players.get(sessionId)
        ?.lives ?? 0) > 0
    );
  }

  private alivePlayerIds() {
    return [
      ...this.state.players.keys(),
    ].filter((sessionId) =>
      this.isAlive(sessionId),
    );
  }

  // Picks someone else's drawing of this
  // round's word for each client. offset
  // shifts the pick, so two calls in the same
  // round can hand out different drawings.
  private sendOtherDrawings(
    offset: number,
    buildMessage: (image: string | null) => object,
    type: string,
    allowOwnDrawing: boolean,
  ) {
    const roundIndex = this.recallRound;

    const artists = [
      ...this.state.players.keys(),
    ].filter((sessionId) =>
      this.drawings.has(
        `${sessionId}:${roundIndex}`,
      ),
    );

    this.clients.forEach((client, position) => {
      const others = artists.filter(
        (sessionId) =>
          sessionId !== client.sessionId,
      );

      const artist =
        others.length > 0
          ? others[
              (position + roundIndex + offset) %
                others.length
            ]
          : allowOwnDrawing &&
              artists.includes(client.sessionId)
            ? client.sessionId
            : undefined;

      const drawing =
        artist !== undefined
          ? this.drawings.get(
              `${artist}:${roundIndex}`,
            )
          : undefined;

      // Only the image is sent - never the
      // artist's sessionId or name.
      client.send(
        type,
        buildMessage(
          drawing
            ? Buffer.from(drawing).toString(
                "base64",
              )
            : null,
        ),
      );
    });
  }

  /*
   * BE-16: each player gets someone else's
   * drawing of this round's word, without the
   * artist's identity. Falls back to their own
   * drawing when nobody else drew it (e.g. a
   * one-player room).
   */
  private sendAnonymousDrawings() {
    const roundIndex = this.recallRound;

    this.sendOtherDrawings(
      0,
      (image) => ({ roundIndex, image }),
      "recallDrawing",
      true,
    );
  }

  /*
   * BE-20: apply an ability for everyone.
   *   hint:   first letter and length of
   *           this round's word
   *   reveal: another drawing of this word,
   *           shown for a few seconds
   */
  private activateAbility(ability: Ability) {
    const roundIndex = this.recallRound;

    this.state.usedAbilities.push(ability);
    this.abilityUsedThisRound = true;
    this.abilityVotes.clear();

    if (ability === "hint") {
      const word =
        this.state.gameWords[roundIndex] ?? "";
      const letters =
        word.replace(/\s+/g, "").length;
      const words =
        word.trim().split(/\s+/).length;

      this.broadcast("abilityActivated", {
        roundIndex,
        ability,
        hint:
          `Starts with "${word.charAt(0).toUpperCase()}", ` +
          `${letters} letters` +
          (words > 1 ? ` (${words} words)` : ""),
      });

      return;
    }

    // Offset by one from the anonymous Recall
    // pick, so it's usually a different
    // drawing from the one already on screen.
    this.sendOtherDrawings(
      1,
      (image) => ({
        roundIndex,
        ability,
        seconds: REVEAL_SECONDS,
        image,
      }),
      "abilityActivated",
      false,
    );
  }

  private isGameOver() {
    return (
      this.state.gameWords.length >
        0 &&
      this.recallRound >=
        this.state.gameWords.length
    );
  }

  private buildGalleryManifest() {
    const entries: {
      sessionId: string;
      index: number;
    }[] = [];

    for (
      const sessionId of
      this.state.players.keys()
    ) {
      for (
        let index = 0;
        index <
        this.state.gameWords.length;
        index++
      ) {
        if (
          this.drawings.has(
            `${sessionId}:${index}`,
          )
        ) {
          entries.push({
            sessionId,
            index,
          });
        }
      }
    }

    return entries;
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

    const player =
      new Player();

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