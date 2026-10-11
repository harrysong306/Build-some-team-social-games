import { useEffect, useRef, useState } from "react";
import type { Room } from "@colyseus/sdk";
import { useLobbyState } from "./useLobbyState";
import InstructionsScreen from "../sketch-recall/InstructionsScreen";
import SketchRecallGame from "../sketch-recall/SketchRecallGame";

type LobbyScreenProps = {
  room: Room | null;
  roomId: string | null;
};

const GAME_MODES = [
  { value: "sketchRecall", label: "Sketch Recall" },
  { value: "anonymousRecall", label: "Sketch Recall: Anonymous Swap" },
];

const DRAWING_SPEEDS = [
  { value: "easy", label: "Easy" },
  { value: "normal", label: "Normal" },
  { value: "hard", label: "Hard" },
];

// Must stay within MIN_DRAWING_COUNT and
// MAX_DRAWING_COUNT in backend LobbyRoom.ts.
const DRAWING_COUNTS = [10, 15, 20, 25, 30];

const WORD_THEMES = [
  { value: "general", label: "General" },
  { value: "animals", label: "Animals" },
  { value: "food", label: "Food" },
  { value: "sports", label: "Sports" },
  { value: "transport", label: "Transport" },
  { value: "nature", label: "Nature" },
];

function LobbyScreen({ room, roomId }: LobbyScreenProps) {
  const {
    players,
    gameMode,
    drawingSpeed,
    drawingCount,
    wordTheme,
    playerQuestionsEnabled,
    phase,
    gameWords,
    assignedPlayerQuestions,
    mySessionId,
    nameError,
    toggleReady,
    setGameMode,
    setDrawingSpeed,
    setDrawingCount,
    setWordTheme,
    setPlayerQuestionsEnabled,
    startGame,
    submitPlayerQuestion,
    replacePlayerQuestions,
    returnToLobby,
    changeName,
  } = useLobbyState(room);

  const [roundStarted, setRoundStarted] = useState(false);
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [questionOptions, setQuestionOptions] = useState([
    "",
    "",
    "",
    "",
  ]);
  const [correctOption, setCorrectOption] = useState(0);

  // whether the player's own row in the list is in edit-name mode
  const [isEditingName, setIsEditingName] = useState(false);

  // draft name typed while editing, before it's submitted
  const [nameDraft, setNameDraft] = useState("");

  // briefly true right after the room code is copied, to show feedback
  const [codeCopied, setCodeCopied] = useState(false);

  // mirrors isEditingName but updates synchronously (unlike the state
  // value), so a stray blur fired by the input unmounting - which can
  // happen an unpredictable amount of time after Enter/Escape already
  // closed the field - reliably sees editing has already ended and no-ops
  // instead of racing to submit or re-submit a draft
  const isEditingRef = useRef(false);

  const playerList = Object.entries(players);
  const me = players[mySessionId];

  const isHost = me?.isHost ?? false;
  const questionCount = me?.questions?.length ?? 0;
  const questionsComplete =
  !playerQuestionsEnabled || questionCount === 2;

  const allReady =
    playerList.length > 0 &&
    playerList.every(([, player]) => player.ready);

  const submitQuestion = () => {
    const prompt = questionPrompt.trim();
    const options = questionOptions.map((option) =>
      option.trim(),
    );

    if (!prompt || options.some((option) => !option)) {
      return;
    }

    submitPlayerQuestion(
      prompt,
      options,
      correctOption,
    );
    setQuestionPrompt("");
    setQuestionOptions(["", "", "", ""]);
    setCorrectOption(0);
  };

  const startEditingName = () => {
    setNameDraft(me?.name ?? "");
    isEditingRef.current = true;
    setIsEditingName(true);
  };

  const closeEditingName = () => {
    isEditingRef.current = false;
    setIsEditingName(false);
  };

  const cancelEditingName = () => {
    closeEditingName();
  };

  const submitNameChange = () => {
    if (!isEditingRef.current) return;

    const trimmed = nameDraft.trim();
    closeEditingName();

    if (!trimmed || trimmed === me?.name) return;
    changeName(trimmed);
  };

  const copyRoomCode = async () => {
    if (!roomId) return;

    try {
      await navigator.clipboard.writeText(roomId);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      // clipboard access can be blocked (permissions, insecure context, etc.) -
      // fail quietly, the room code is still visible as plain text either way
    }
  };

  /*
   * The backend phase is authoritative.
   *
   * When the host returns the room to the lobby,
   * every connected client receives phase === "lobby".
   * Reset the local game-screen flag as well so all
   * clients leave SketchRecallGame together.
   */
  useEffect(() => {
    if (phase === "lobby") {
      setRoundStarted(false);
    }
  }, [phase]);

  if (roundStarted && phase === "playing") {
    return (
      <SketchRecallGame
        room={room}
        players={players}
        onExit={() => setRoundStarted(false)}
        gameWords={gameWords}
        playerQuestions={assignedPlayerQuestions}
        drawingSpeed={drawingSpeed}
        // the InstructionsScreen below already ran its countdown
        // before roundStarted flipped to true, so don't show it again
        skipInstructions
        onPlayAgain={returnToLobby}
        onSubmitDrawing={(bytes, index) => {
          room?.send("submit-drawing-meta", {
            index,
          });

          room?.sendBytes(
            "submit-drawing",
            bytes,
          );
        }}
      />
    );
  }

  if (phase === "playing") {
    return (
      <InstructionsScreen
        onStart={() => setRoundStarted(true)}
        onBack={() =>
          console.log("Back clicked")
        }
      />
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-12 text-white">
      <div className="mx-auto max-w-md">
        <h2 className="text-2xl font-extrabold">
          Lobby
        </h2>

        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm text-white/60">
            Room code: {roomId}
          </p>

          <button
            type="button"
            onClick={copyRoomCode}
            disabled={!roomId}
            className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300 transition hover:border-amber-400 hover:bg-amber-500/20 disabled:opacity-40"
          >
            {codeCopied ? "✅ Copied" : "📋 Copy"}
          </button>
        </div>

        <ul className="mt-6 space-y-2">
          {playerList.map(
            ([sessionId, player]) => {
              const isMe = sessionId === mySessionId;

              return (
                <li
                  key={sessionId}
                  className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-[#211006] px-4 py-3"
                >
                  {isMe && isEditingName ? (
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onBlur={submitNameChange}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitNameChange();
                        if (e.key === "Escape") cancelEditingName();
                      }}
                      maxLength={20}
                      className="mr-3 w-full rounded border border-amber-400 bg-[#160b06] px-2 py-1 text-white focus:outline-none"
                    />
                  ) : (
                    <span className="flex items-center gap-2">
                      {player.name}
                      {player.isHost && " 👑"}
                      {isMe && (
                        <button
                          type="button"
                          onClick={startEditingName}
                          aria-label="Edit your name"
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-xs transition hover:border-amber-400 hover:bg-amber-500/20"
                        >
                          ✏️
                        </button>
                      )}
                    </span>
                  )}

                  <span
                    className={
                      player.ready
                        ? "text-emerald-400"
                        : "text-white/50"
                    }
                  >
                    {player.ready
                      ? "✅ Ready"
                      : "⏳ Not ready"}
                  </span>
                </li>
              );
            },
          )}
        </ul>

        {nameError && (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {nameError}
          </p>
        )}

        {playerQuestionsEnabled &&
         questionCount === 2 &&
         !me?.ready && (
          <button
           type="button"
            onClick={replacePlayerQuestions}
            className="mt-4 w-full rounded-lg border border-amber-500/40 px-4 py-3 text-sm font-semibold text-amber-300 hover:bg-amber-500/10"
          >
            CHANGE QUESTIONS
          </button>
        )}
        {playerQuestionsEnabled &&
          !questionsComplete &&
          !me?.ready && (
          <section className="mt-6 rounded-lg border border-amber-500/30 bg-[#160b06] p-4">
            <p className="text-sm font-semibold text-amber-300">
              Personal questions ({questionCount}/2)
            </p>

            <p className="mt-2 text-xs leading-5 text-white/55">
              Write two factual questions about yourself. Each question needs four options and one correct answer. Make them recognisable and unambiguous, so players know who the question is about. Avoid questions like “What is my name?” when several players are in the room. For example: “What year was Alex born?” or “How old is Alex’s wife?”
            </p>

            <input
              value={questionPrompt}
              onChange={(event) =>
                setQuestionPrompt(event.target.value)
              }
              placeholder="Question about you"
              maxLength={120}
              className="mt-4 w-full rounded-lg border border-amber-500/30 bg-[#211006] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-amber-400 focus:outline-none"
            />

            <div className="mt-3 space-y-2">
              {questionOptions.map((option, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2"
                >
                  <input
                    type="radio"
                    name="correct-option"
                    checked={correctOption === index}
                    onChange={() => setCorrectOption(index)}
                    aria-label={`Option ${index + 1} is correct`}
                    className="accent-amber-500"
                  />

                  <input
                    value={option}
                    onChange={(event) => {
                      setQuestionOptions((current) =>
                        current.map((currentOption, optionIndex) =>
                          optionIndex === index
                            ? event.target.value
                            : currentOption,
                        ),
                      );
                    }}
                    placeholder={`Option ${index + 1}`}
                    maxLength={60}
                    className="w-full rounded-lg border border-amber-500/30 bg-[#211006] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={submitQuestion}
              disabled={
                !questionPrompt.trim() ||
                questionOptions.some((option) => !option.trim())
              }
              className="mt-4 w-full rounded-lg bg-amber-400 px-4 py-2 font-bold text-black transition hover:brightness-110 disabled:opacity-40"
            >
              SAVE QUESTION
            </button>
          </section>
        )}

        <button
          onClick={toggleReady}
          disabled={!questionsComplete}
          className="mt-6 w-full rounded-lg border border-amber-400 px-6 py-3 font-bold text-amber-300 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {me?.ready
            ? "Cancel Ready"
            : "Ready"}
        </button>

        {isHost ? (
          <div className="mt-6">
            <label className="mb-2 block text-sm text-white/60">
              Game mode
            </label>

            <select
              value={gameMode}
              onChange={(event) =>
                setGameMode(
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-amber-500/30 bg-[#211006] px-4 py-3 text-white focus:border-amber-400 focus:outline-none"
            >
              {GAME_MODES.map((mode) => (
                <option
                  key={mode.value}
                  value={mode.value}
                >
                  {mode.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mt-6 text-sm text-white/60">
            Mode: {GAME_MODES.find((mode) => mode.value === gameMode)?.label ?? gameMode}
          </p>
        )}

        {isHost ? (
          <div className="mt-4">
            <label className="mb-2 block text-sm text-white/60">
              Drawing speed
            </label>

            <select
              value={drawingSpeed}
              onChange={(event) =>
                setDrawingSpeed(event.target.value)
              }
              className="w-full rounded-lg border border-amber-500/30 bg-[#211006] px-4 py-3 text-white focus:border-amber-400 focus:outline-none"
            >
              {DRAWING_SPEEDS.map((speed) => (
                <option
                  key={speed.value}
                  value={speed.value}
                >
                  {speed.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/60">
            Drawing speed: {drawingSpeed}
          </p>
        )}

        {isHost ? (
          <div className="mt-4">
            <label
              htmlFor="drawing-count"
              className="mb-2 block text-sm text-white/60"
            >
              Number of drawings
            </label>

            <select
              id="drawing-count"
              value={drawingCount}
              onChange={(event) =>
                setDrawingCount(Number(event.target.value))
              }
              className="w-full rounded-lg border border-amber-500/30 bg-[#211006] px-4 py-3 text-white focus:border-amber-400 focus:outline-none"
            >
              {DRAWING_COUNTS.map((count) => (
                <option
                  key={count}
                  value={count}
                >
                  {count}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/60">
            Number of drawings: {drawingCount}
          </p>
        )}

        {isHost ? (
          <div className="mt-4">
            <label
              htmlFor="word-theme"
              className="mb-2 block text-sm text-white/60"
            >
              Word theme
            </label>

            <select
              id="word-theme"
              value={wordTheme}
              onChange={(event) =>
                setWordTheme(event.target.value)
              }
              className="w-full rounded-lg border border-amber-500/30 bg-[#211006] px-4 py-3 text-white focus:border-amber-400 focus:outline-none"
            >
              {WORD_THEMES.map((theme) => (
                <option
                  key={theme.value}
                  value={theme.value}
                >
                  {theme.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/60">
            Word theme: {" "}
            {WORD_THEMES.find(
              (theme) => theme.value === wordTheme,
            )?.label ?? wordTheme}
          </p>
        )}
                {isHost ? (
          <div className="mt-4">
            <label
              htmlFor="player-questions"
              className="mb-2 block text-sm text-white/60"
            >
              Player-created questions
            </label>

            <button
              id="player-questions"
              type="button"
              onClick={() =>
                setPlayerQuestionsEnabled(
                  !playerQuestionsEnabled,
                )
              }
              className="w-full rounded-lg border border-amber-500/30 bg-[#211006] px-4 py-3 text-left text-white"
            >
              {playerQuestionsEnabled
                ? "Enabled"
                : "Disabled"}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/60">
            Player-created questions:{" "}
            {playerQuestionsEnabled
              ? "Enabled"
              : "Disabled"}
          </p>
        )}

        {isHost ? (
          <button
            disabled={!allReady}
            onClick={() => {
              console.log(
                "Start Game clicked, allReady:",
                allReady,
              );

              startGame();
            }}
            className="mt-4 w-full rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-3 font-bold text-black transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
          >
            Start Game
          </button>
        ) : (
          <p className="mt-4 text-sm text-white/60">
            Waiting for host to start…
          </p>
        )}
      </div>
    </main>
  );
}

export default LobbyScreen;