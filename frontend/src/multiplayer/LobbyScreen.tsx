import { useEffect, useRef, useState } from "react";
import type { Room } from "@colyseus/sdk";
import { useLobbyState } from "./useLobbyState";
import InstructionsScreen from "../sketch-recall/InstructionsScreen";
import SketchRecallGame from "../sketch-recall/SketchRecallGame";
import {
  readLobbyPreferences,
  saveLobbyPreferences,
} from "./localLobbyPreferences";

type LobbyScreenProps = {
  room: Room | null;
  roomId: string | null;
  applySavedSettings?: boolean;
};

const GAME_MODES = [
  { value: "sketchRecall", label: "Sketch Recall" },
  { value: "anonymousRecall", label: "Sketch Recall: Anonymous Swap" },
];

const DRAWING_SPEEDS = [
  { value: "easy", label: "Easy" },
  { value: "normal", label: "Normal" },
  { value: "hard", label: "Hard" },
  { value: "custom", label: "Custom" },
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

type DropdownOption = {
  value: string;
  label: string;
};

type ThemedDropdownProps = {
  id: string;
  label: string;
  value: string;
  options: readonly DropdownOption[];
  onChange: (value: string) => void;
};

function ThemedDropdown({
  id,
  label,
  value,
  options,
  onChange,
}: ThemedDropdownProps) {
  const [open, setOpen] = useState(false);
  const selected =
    options.find((option) => option.value === value) ??
    options[0];
  const labelId = `${id}-label`;

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget as Node | null,
          )
        ) {
          setOpen(false);
        }
      }}
    >
      <span
        id={labelId}
        className="mb-1.5 block text-sm text-white/60"
      >
        {label}
      </span>

      <button
        type="button"
        aria-labelledby={labelId}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-[#211006] px-3.5 py-2.5 text-left text-sm font-semibold text-white transition duration-200 hover:border-amber-400 hover:bg-amber-500/10 focus:border-amber-400 focus:outline-none"
      >
        <span>{selected?.label ?? value}</span>
        <span
          aria-hidden="true"
          className={`text-amber-300 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-labelledby={labelId}
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-amber-500/40 bg-[#160b06] p-1 shadow-xl shadow-black/40"
        >
          {options.map((option) => {
            const selectedOption = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selectedOption}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm transition duration-150 ${
                  selectedOption
                    ? "border border-amber-400/60 bg-amber-400/15 font-bold text-amber-200"
                    : "border border-transparent text-white/80 hover:bg-amber-500/10 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function LobbyScreen({
  room,
  roomId,
  applySavedSettings = false,
}: LobbyScreenProps) {
  const {
    players,
    gameMode,
    drawingSpeed,
    customDrawingMin,
    customDrawingMax,
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
    replacePlayerQuestion,
    returnToLobby,
    changeName,
  } = useLobbyState(room);

  const [roundStarted, setRoundStarted] = useState(false);
  const [questionPrompt, setQuestionPrompt] = useState(
    () => readLobbyPreferences().questionPrompt,
  );
  const [questionOptions, setQuestionOptions] = useState(
    () => readLobbyPreferences().questionOptions,
  );
  const [correctOption, setCorrectOption] = useState(
    () => readLobbyPreferences().correctOption,
  );

  // whether the player's own row in the list is in edit-name mode
  const [isEditingName, setIsEditingName] = useState(false);

  // draft name typed while editing, before it's submitted
  const [nameDraft, setNameDraft] = useState("");

  // briefly true right after the room code is copied, to show feedback
  const [codeCopied, setCodeCopied] = useState(false);
  const [customMinDraft, setCustomMinDraft] =
    useState(String(customDrawingMin));
  const [customMaxDraft, setCustomMaxDraft] =
    useState(String(customDrawingMax));
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [choosingQuestionToReplace, setChoosingQuestionToReplace] =
    useState(false);
  const [replacingQuestion, setReplacingQuestion] = useState(false);
  const appliedSavedSettingsRef = useRef(false);

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
  const gameModeLabel =
    GAME_MODES.find((mode) => mode.value === gameMode)?.label ??
    gameMode;
  const drawingSpeedLabel =
    DRAWING_SPEEDS.find((speed) => speed.value === drawingSpeed)?.label ??
    drawingSpeed;
  const wordThemeLabel =
    WORD_THEMES.find((theme) => theme.value === wordTheme)?.label ??
    wordTheme;
  const drawingSpeedSummary =
    drawingSpeed === "custom"
      ? `${customDrawingMin}-${customDrawingMax}s`
      : `${drawingSpeedLabel} speed`;
  const settingsSummary =
    `${gameModeLabel} · ${drawingSpeedSummary} · ${drawingCount} drawings`;
  const showQuestionForm =
    playerQuestionsEnabled &&
    !me?.ready &&
    (!questionsComplete || replacingQuestion);

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
    setReplacingQuestion(false);
    saveLobbyPreferences({
      questionPrompt: "",
      questionOptions: ["", "", "", ""],
      correctOption: 0,
    });
  };

  const updateQuestionPrompt = (prompt: string) => {
    setQuestionPrompt(prompt);
    saveLobbyPreferences({
      questionPrompt: prompt,
    });
  };

  const updateQuestionOption = (
    index: number,
    value: string,
  ) => {
    setQuestionOptions((current) => {
      const updated = current.map((currentOption, optionIndex) =>
        optionIndex === index ? value : currentOption,
      );

      saveLobbyPreferences({
        questionOptions: updated,
      });

      return updated;
    });
  };

  const updateCorrectOption = (index: number) => {
    setCorrectOption(index);
    saveLobbyPreferences({
      correctOption: index,
    });
  };

  const startReplacingQuestion = (index: number) => {
    const question = me?.questions?.[index];

    if (!question) return;

    setQuestionPrompt(question.prompt);
    setQuestionOptions([...question.options]);
    setCorrectOption(0);
    setReplacingQuestion(true);
    setChoosingQuestionToReplace(false);
    saveLobbyPreferences({
      questionPrompt: question.prompt,
      questionOptions: [...question.options],
      correctOption: 0,
    });
    replacePlayerQuestion(index);
  };

  const clampDrawingTime = (
    value: number,
    minimum: number,
    maximum: number,
  ) => Math.min(
    maximum,
    Math.max(
      minimum,
      Math.round(value),
    ),
  );

  const parseDrawingTimeDraft = (
    value: string,
  ) => {
    if (value === "") return null;

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) return null;

    return clampDrawingTime(
      parsed,
      1,
      120,
    );
  };

  const submitCustomDrawingTime = (
    nextMin: number,
    nextMax: number,
  ) => {
    saveLobbyPreferences({
      drawingSpeed: "custom",
      customDrawingMin: nextMin,
      customDrawingMax: nextMax,
    });

    setDrawingSpeed(
      "custom",
      nextMin,
      nextMax,
    );
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

  useEffect(() => {
    setCustomMinDraft(String(customDrawingMin));
    setCustomMaxDraft(String(customDrawingMax));
  }, [
    customDrawingMin,
    customDrawingMax,
  ]);

  useEffect(() => {
    if (
      appliedSavedSettingsRef.current ||
      !applySavedSettings ||
      !isHost ||
      phase !== "lobby"
    ) {
      return;
    }

    const saved = readLobbyPreferences();

    appliedSavedSettingsRef.current = true;

    setGameMode(saved.gameMode);
    setDrawingSpeed(
      saved.drawingSpeed,
      saved.customDrawingMin,
      saved.customDrawingMax,
    );
    setDrawingCount(saved.drawingCount);
    setWordTheme(saved.wordTheme);
    setPlayerQuestionsEnabled(saved.playerQuestionsEnabled);
  }, [
    isHost,
    applySavedSettings,
    phase,
    setGameMode,
    setDrawingSpeed,
    setDrawingCount,
    setWordTheme,
    setPlayerQuestionsEnabled,
  ]);

  if (roundStarted && phase === "playing") {
    return (
      <SketchRecallGame
        room={room}
        players={players}
        onExit={() => setRoundStarted(false)}
        gameWords={gameWords}
        playerQuestions={assignedPlayerQuestions}
        drawingSpeed={drawingSpeed}
        customDrawingMin={customDrawingMin}
        customDrawingMax={customDrawingMax}
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
          <section className="mt-4 rounded-lg border border-amber-500/30 bg-[#160b06] p-3">
            <button
              type="button"
              onClick={() =>
                setChoosingQuestionToReplace((current) => !current)
              }
              className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-amber-300"
            >
              <span>Change a question</span>
              <span
                aria-hidden="true"
                className={`transition-transform duration-200 ${
                  choosingQuestionToReplace ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>

            {choosingQuestionToReplace ? (
              <div className="mt-3 space-y-2">
                {me?.questions?.map((question, index) => (
                  <button
                    key={`${question.prompt}-${index}`}
                    type="button"
                    onClick={() => startReplacingQuestion(index)}
                    className="w-full rounded-lg border border-amber-500/25 bg-[#211006] px-3 py-2 text-left text-sm text-white transition duration-200 hover:border-amber-400 hover:bg-amber-500/10"
                  >
                    <span className="block text-xs font-semibold uppercase text-white/45">
                      Question {index + 1}
                    </span>
                    <span className="mt-1 block font-semibold text-white">
                      {question.prompt}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        )}
        {playerQuestionsEnabled &&
          showQuestionForm && (
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
                updateQuestionPrompt(event.target.value)
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
                    onChange={() => updateCorrectOption(index)}
                    aria-label={`Option ${index + 1} is correct`}
                    className="accent-amber-500"
                  />

                  <input
                    value={option}
                    onChange={(event) => {
                      updateQuestionOption(
                        index,
                        event.target.value,
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
          <details className="group mt-6 rounded-lg border border-amber-500/30 bg-[#160b06]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-bold text-amber-300 transition duration-200 hover:bg-amber-500/10 [&::-webkit-details-marker]:hidden">
              <span>Lobby settings</span>
              <span
                aria-hidden="true"
                className="text-lg transition-transform duration-200 group-open:rotate-180"
              >
                ▾
              </span>
            </summary>

            <div className="space-y-3 border-t border-amber-500/20 p-3">
              <div>
                <ThemedDropdown
                  id="game-mode"
                  label="Game mode"
                  value={gameMode}
                  options={GAME_MODES}
                  onChange={(value) => {
                    saveLobbyPreferences({
                      gameMode: value,
                    });
                    setGameMode(
                      value,
                    );
                  }}
                />
              </div>

              <div>
                <ThemedDropdown
                  id="drawing-speed"
                  label="Drawing speed"
                  value={drawingSpeed}
                  options={DRAWING_SPEEDS}
                  onChange={(value) => {
                    saveLobbyPreferences({
                      drawingSpeed: value,
                      customDrawingMin,
                      customDrawingMax,
                    });
                    setDrawingSpeed(
                      value,
                      customDrawingMin,
                      customDrawingMax,
                    );
                  }}
                />

                {drawingSpeed === "custom" ? (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <label className="block text-sm text-white/60">
                      Min seconds
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={customMinDraft}
                        onChange={(event) => {
                          const rawValue = event.target.value;

                          if (rawValue === "") {
                            setCustomMinDraft("");
                            return;
                          }

                          const nextMin =
                            parseDrawingTimeDraft(rawValue);

                          if (nextMin === null) return;
                          setCustomMinDraft(String(nextMin));

                          const currentMax =
                            parseDrawingTimeDraft(customMaxDraft);

                          if (
                            currentMax !== null &&
                            nextMin <= currentMax
                          ) {
                            submitCustomDrawingTime(
                              nextMin,
                              currentMax,
                            );
                          } else if (currentMax !== null) {
                            setCustomMaxDraft(String(nextMin));
                            submitCustomDrawingTime(
                              nextMin,
                              nextMin,
                            );
                          }
                        }}
                        onBlur={() => {
                          const currentMin =
                            parseDrawingTimeDraft(customMinDraft);
                          const currentMax =
                            parseDrawingTimeDraft(customMaxDraft);

                          if (
                            currentMin !== null &&
                            currentMax !== null &&
                            currentMin <= currentMax
                          ) {
                            return;
                          }

                          setCustomMinDraft(String(customDrawingMin));
                        }}
                        className="mt-1.5 min-h-11 w-full rounded-lg border border-amber-500/30 bg-[#211006] px-3.5 py-2.5 text-white transition duration-200 focus:border-amber-400 focus:outline-none"
                      />
                    </label>

                    <label className="block text-sm text-white/60">
                      Max seconds
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={customMaxDraft}
                        onChange={(event) => {
                          const rawValue = event.target.value;

                          if (rawValue === "") {
                            setCustomMaxDraft("");
                            return;
                          }

                          const nextMax =
                            parseDrawingTimeDraft(rawValue);

                          if (nextMax === null) return;
                          setCustomMaxDraft(String(nextMax));

                          const currentMin =
                            parseDrawingTimeDraft(customMinDraft);

                          if (
                            currentMin !== null &&
                            nextMax >= currentMin
                          ) {
                            submitCustomDrawingTime(
                              currentMin,
                              nextMax,
                            );
                          }
                        }}
                        onBlur={() => {
                          const currentMin =
                            parseDrawingTimeDraft(customMinDraft);
                          const currentMax =
                            parseDrawingTimeDraft(customMaxDraft);

                          if (
                            currentMin !== null &&
                            currentMax !== null &&
                            currentMax >= currentMin
                          ) {
                            return;
                          }

                          setCustomMaxDraft(String(customDrawingMax));
                        }}
                        className="mt-1.5 min-h-11 w-full rounded-lg border border-amber-500/30 bg-[#211006] px-3.5 py-2.5 text-white transition duration-200 focus:border-amber-400 focus:outline-none"
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              <div>
                <ThemedDropdown
                  id="drawing-count"
                  label="Number of drawings"
                  value={String(drawingCount)}
                  options={DRAWING_COUNTS.map((count) => ({
                    value: String(count),
                    label: String(count),
                  }))}
                  onChange={(value) => {
                    const count = Number(value);

                    saveLobbyPreferences({
                      drawingCount: count,
                    });
                    setDrawingCount(count);
                  }}
                />
              </div>

              <div>
                <ThemedDropdown
                  id="word-theme"
                  label="Word theme"
                  value={wordTheme}
                  options={WORD_THEMES}
                  onChange={(value) => {
                    saveLobbyPreferences({
                      wordTheme: value,
                    });
                    setWordTheme(value);
                  }}
                />
              </div>

              <div>
                <div className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-amber-500/30 bg-[#211006] px-3.5 py-2.5">
                  <span
                    id="player-questions-label"
                    className="text-sm text-white/60"
                  >
                    Player-created questions
                  </span>

                  <button
                    type="button"
                    role="switch"
                    aria-labelledby="player-questions-label"
                    aria-checked={playerQuestionsEnabled}
                    onClick={() => {
                      const enabled = !playerQuestionsEnabled;

                      saveLobbyPreferences({
                        playerQuestionsEnabled: enabled,
                      });

                      setPlayerQuestionsEnabled(
                        enabled,
                      );
                    }}
                    className="flex items-center gap-3 rounded-full focus:outline-none"
                  >
                    <span
                      className={`text-sm font-semibold transition duration-200 ${
                        playerQuestionsEnabled
                          ? "text-amber-300"
                          : "text-white/45"
                      }`}
                    >
                      {playerQuestionsEnabled
                        ? "Enabled"
                        : "Disabled"}
                    </span>

                    <span
                      aria-hidden="true"
                      className={`flex h-6 w-11 items-center rounded-full border p-0.5 transition duration-200 ${
                        playerQuestionsEnabled
                          ? "border-amber-400 bg-amber-400/25"
                          : "border-white/25 bg-white/10"
                      }`}
                    >
                      <span
                        className={`h-4.5 w-4.5 rounded-full transition duration-200 ${
                          playerQuestionsEnabled
                            ? "translate-x-5 bg-amber-300"
                            : "translate-x-0 bg-white/45"
                        }`}
                      />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </details>
        ) : (
          <div className="mt-6 rounded-lg border border-amber-500/30 bg-[#211006]">
            <button
              type="button"
              aria-expanded={settingsExpanded}
              onClick={() =>
                setSettingsExpanded((expanded) => !expanded)
              }
              className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left"
            >
              <span>
                <span className="block font-bold text-amber-300">
                  Game Settings
                </span>

                <span className="mt-1 block text-sm text-white/60">
                  {settingsSummary}
                </span>
              </span>

              <span
                className={`mt-1 text-lg text-amber-300 transition-transform duration-200 ${
                  settingsExpanded ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>

            <div
              className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${
                settingsExpanded
                  ? "grid-rows-[1fr]"
                  : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 border-t border-amber-500/20 px-4 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                  <dt className="text-white/50">
                    Mode
                  </dt>
                  <dd className="font-semibold text-white sm:text-right">
                    {gameModeLabel}
                  </dd>

                  <dt className="text-white/50">
                    Drawing speed
                  </dt>
                  <dd className="font-semibold text-amber-200 sm:text-right">
                    {drawingSpeed === "custom"
                      ? `Custom (${customDrawingMin}-${customDrawingMax}s)`
                      : drawingSpeedLabel}
                  </dd>

                  <dt className="text-white/50">
                    Number of drawings
                  </dt>
                  <dd className="font-semibold text-white sm:text-right">
                    {drawingCount}
                  </dd>

                  <dt className="text-white/50">
                    Word theme
                  </dt>
                  <dd className="font-semibold text-white sm:text-right">
                    {wordThemeLabel}
                  </dd>

                  <dt className="text-white/50">
                    Player-created questions
                  </dt>
                  <dd className="font-semibold text-white sm:text-right">
                    {playerQuestionsEnabled
                      ? "Enabled"
                      : "Disabled"}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
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
          <p className="mt-4 text-center text-sm text-white/60">
            Waiting for host to start…
          </p>
        )}
      </div>
    </main>
  );
}

export default LobbyScreen;
