import { useMemo, useState } from 'react'

type Phase = 'instructions' | 'story' | 'scoring' | 'results'

type StoryEntry = {
  text: string
  score: number | null
  speaker: 'judge' | number
}

const MIN_PLAYERS = 2
const MAX_PLAYERS = 8
const TOTAL_SENTENCES = 20

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const applyAdjectiveToNoun = (
  storyText: string,
  adjective: string,
  noun: string,
) => {
  const cleanedAdjective = adjective.trim()
  const cleanedNoun = noun.trim()

  if (!cleanedAdjective || !cleanedNoun) {
    return storyText
  }

  const nounPattern = new RegExp(
    `\\b${escapeRegExp(cleanedNoun)}\\b`,
    'gi',
  )

  return storyText.replace(
    nounPattern,
    (match) => `${cleanedAdjective} ${match}`,
  )
}

function StoryChainGame({
  onExit,
}: {
  onExit: () => void
}) {
  const [phase, setPhase] = useState<Phase>('instructions')
  const [playerCount, setPlayerCount] = useState(4)
  const [story, setStory] = useState<StoryEntry[]>([])
  const [draft, setDraft] = useState('')
  const [finalAdjective, setFinalAdjective] = useState('')
  const [finalNoun, setFinalNoun] = useState('')
  const [finalStoryText, setFinalStoryText] = useState('')

  const contestantEntries = useMemo(
    () => story.filter((entry) => entry.speaker !== 'judge'),
    [story],
  )

  const effectivePlayerCount = Math.min(
    MAX_PLAYERS,
    Math.max(MIN_PLAYERS, playerCount),
  )

  const currentTurnSpeaker =
    story.length === 0
      ? 'judge'
      : ((story.length - 1) %
            Math.max(
              1,
              effectivePlayerCount - 1,
            )) +
        1

  const totalScore = story
    .filter((entry) => entry.speaker !== 'judge')
    .reduce(
      (sum, entry) =>
        sum + (typeof entry.score === 'number' ? entry.score : 0),
      0,
    )

  const averageScore =
    contestantEntries.length > 0
      ? totalScore / contestantEntries.length
      : 0

  const startGame = () => {
    setStory([])
    setDraft('')
    setFinalAdjective('')
    setFinalNoun('')
    setFinalStoryText('')
    setPhase('story')
  }

  const saveOpeningSentence = () => {
    const cleaned = draft.trim()

    if (!cleaned) return

    setStory([
      {
        text: cleaned,
        score: null,
        speaker: 'judge',
      },
    ])
    setDraft('')
  }

  const addSentence = () => {
    const cleaned = draft.trim()

    if (!cleaned) return

    const words = cleaned.split(/\s+/).filter(Boolean)

    if (words.length > 20) {
      return
    }

    const speakerForTurn =
      story.length === 0
        ? 'judge'
        : ((story.length - 1) %
              Math.max(
                1,
                effectivePlayerCount - 1,
              )) +
          1

    const nextEntry: StoryEntry = {
      text: cleaned,
      score: null,
      speaker: speakerForTurn,
    }

    const nextStory = [...story, nextEntry]
    setStory(nextStory)
    setDraft('')

    if (nextStory.length >= TOTAL_SENTENCES) {
      setPhase('scoring')
    }
  }

  const updateScore = (
    index: number,
    score: number,
  ) => {
    setStory((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index
          ? { ...entry, score }
          : entry,
      ),
    )
  }

  const finishScoring = () => {
    setPhase('results')
  }

  const applyFinalTitle = () => {
    const combinedStory = story
      .map((entry) => entry.text)
      .join(' ')

    setFinalStoryText(
      applyAdjectiveToNoun(
        combinedStory,
        finalAdjective,
        finalNoun,
      ),
    )
  }

  const resetGame = () => {
    setStory([])
    setDraft('')
    setFinalAdjective('')
    setFinalNoun('')
    setFinalStoryText('')
    setPhase('instructions')
  }

  if (phase === 'instructions') {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-3xl border border-amber-500/30 bg-[#160b06] p-8 shadow-2xl shadow-black/40 md:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
            Story Chain
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            Build the story together.
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-7 text-white/70">
            One player is the judge. The judge opens the story,
            then the other players take turns adding one sentence at a time.
            Every sentence must be 20 words or fewer. When the story reaches
            20 sentences, the judge scores each contestant sentence from 1 to 10.
            At the very end, the judge can add a funny adjective before any noun
            that appears in the story, and the updated version is revealed to everyone.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-amber-500/20 bg-[#211006] p-5">
              <p className="text-sm font-semibold uppercase text-amber-300">
                1. Choose players
              </p>
              <p className="mt-3 text-sm text-white/65">
                Select how many players are in the round, from 2 to 8.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-[#211006] p-5">
              <p className="text-sm font-semibold uppercase text-amber-300">
                2. Turn by turn
              </p>
              <p className="mt-3 text-sm text-white/65">
                Players rotate turns until the story reaches 20 sentences.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-[#211006] p-5">
              <p className="text-sm font-semibold uppercase text-amber-300">
                3. Judge final twist
              </p>
              <p className="mt-3 text-sm text-white/65">
                Pick a noun and add a ridiculous adjective to every matching word.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-5 rounded-2xl border border-amber-500/20 bg-[#211006] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
                Number of players
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={MIN_PLAYERS}
                max={MAX_PLAYERS}
                value={effectivePlayerCount}
                onChange={(event) =>
                  setPlayerCount(
                    Number(event.target.value),
                  )
                }
                className="accent-amber-500"
              />

              <span className="min-w-[3rem] text-xl font-black text-amber-300">
                {effectivePlayerCount}
              </span>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={startGame}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-4 text-lg font-bold text-black"
            >
              START GAME
            </button>

            <button
              type="button"
              onClick={onExit}
              className="rounded-xl border border-amber-500/40 bg-[#211006] px-6 py-4 text-lg font-bold text-white"
            >
              BACK TO GAMES
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (phase === 'story') {
    const isOpeningRound = story.length === 0
    const currentTurnLabel =
      isOpeningRound
        ? 'Judge'
        : currentTurnSpeaker === 'judge'
          ? 'Judge'
          : `Player ${currentTurnSpeaker}`

    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
                Story Chain
              </p>
              <h2 className="mt-2 text-3xl font-bold">
                {isOpeningRound
                  ? 'Judge opens the story'
                  : 'Add the next sentence'}
              </h2>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-[#160b06] px-4 py-3 text-sm text-amber-200">
              {story.length} / {TOTAL_SENTENCES} sentences
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-amber-500/30 bg-[#160b06] p-4 text-sm text-white/70">
            <span className="font-semibold uppercase tracking-[0.2em] text-amber-300">
              Current turn:
            </span>{' '}
            {currentTurnLabel}
          </div>

          <section className="rounded-3xl border border-amber-500/30 bg-[#160b06] p-6 md:p-8">
            {story.length > 0 && (
              <div className="mb-6 space-y-3">
                {story.map((entry, index) => (
                  <div
                    key={`${entry.text}-${index}`}
                    className="rounded-2xl border border-amber-500/20 bg-[#211006] px-4 py-3 text-white/80"
                  >
                    <span className="mr-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                      {entry.speaker === 'judge'
                        ? 'Judge'
                        : `Player ${entry.speaker}`}
                    </span>
                    {entry.text}
                  </div>
                ))}
              </div>
            )}

            <label className="block text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">
              {isOpeningRound
                ? 'Opening sentence'
                : `Sentence ${story.length + 1}`}
            </label>

            <textarea
              value={draft}
              onChange={(event) =>
                setDraft(event.target.value)
              }
              rows={4}
              maxLength={220}
              placeholder={
                isOpeningRound
                  ? 'Type the opening sentence...'
                  : 'Write your sentence here...'
              }
              className="mt-3 w-full rounded-2xl border border-amber-500/30 bg-[#1b0d05] px-4 py-4 text-base text-white outline-none placeholder:text-white/35 focus:border-amber-400"
            />

            <div className="mt-4 flex items-center justify-between text-sm text-white/50">
              <span>
                {draft
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean).length}/20 words max
              </span>
              <span>{draft.length}/220</span>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              {isOpeningRound ? (
                <button
                  type="button"
                  disabled={!draft.trim()}
                  onClick={saveOpeningSentence}
                  className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-4 font-bold text-black disabled:opacity-40"
                >
                  SAVE OPENING SENTENCE
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={
                      !draft.trim() ||
                      draft
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean).length > 20
                    }
                    onClick={addSentence}
                    className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-4 font-bold text-black disabled:opacity-40"
                  >
                    {story.length >= TOTAL_SENTENCES - 1
                      ? 'CLOSE THE STORY'
                      : 'ADD SENTENCE'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPhase('instructions')}
                    className="rounded-xl border border-amber-500/40 bg-[#211006] px-6 py-4 font-bold text-white"
                  >
                    EXIT
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    )
  }

  if (phase === 'scoring') {
    const contestantScores = story.filter(
      (entry) => entry.speaker !== 'judge',
    )

    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
              Judge Scoreboard
            </p>
            <h2 className="mt-3 text-4xl font-black">
              Rate each contestant sentence
            </h2>
          </div>

          <div className="space-y-5">
            {contestantScores.map((entry, index) => (
              <div
                key={`${entry.text}-${index}`}
                className="rounded-2xl border border-amber-500/30 bg-[#160b06] p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                      Player {entry.speaker}
                    </p>
                    <p className="mt-2 text-lg text-white/80">
                      {entry.text}
                    </p>
                  </div>

                  <div className="min-w-[180px]">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                      Score
                    </label>

                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={entry.score ?? 5}
                      onChange={(event) =>
                        updateScore(
                          story.findIndex(
                            (item) => item === entry,
                          ),
                          Number(event.target.value),
                        )
                      }
                      className="w-full accent-amber-500"
                    />

                    <div className="mt-2 text-right text-lg font-bold text-amber-300">
                      {entry.score ?? 5}/10
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={finishScoring}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-8 py-4 text-lg font-bold text-black"
            >
              VIEW RESULTS
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl rounded-3xl border border-amber-500/30 bg-[#160b06] p-8 shadow-2xl shadow-black/40 md:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-400">
          Final score
        </p>

        <h1 className="mt-4 text-4xl font-black md:text-5xl">
          Story complete!
        </h1>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-amber-500/20 bg-[#211006] p-5">
            <p className="text-sm font-semibold uppercase text-amber-300">
              Total points
            </p>
            <p className="mt-3 text-4xl font-black text-amber-400">
              {totalScore}
            </p>
            <p className="mt-2 text-white/60">
              Across {contestantEntries.length} contestant sentences
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-[#211006] p-5">
            <p className="text-sm font-semibold uppercase text-amber-300">
              Average score
            </p>
            <p className="mt-3 text-4xl font-black text-amber-400">
              {averageScore.toFixed(1)}
            </p>
            <p className="mt-2 text-white/60">
              Out of 10 per sentence
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-amber-500/20 bg-[#211006] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            Judge final flourish
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              type="text"
              value={finalAdjective}
              onChange={(event) =>
                setFinalAdjective(event.target.value)
              }
              placeholder="Funny adjective"
              className="rounded-xl border border-amber-500/30 bg-[#1b0d05] px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-amber-400"
            />

            <input
              type="text"
              value={finalNoun}
              onChange={(event) =>
                setFinalNoun(event.target.value)
              }
              placeholder="Noun to tag"
              className="rounded-xl border border-amber-500/30 bg-[#1b0d05] px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-amber-400"
            />
          </div>

          <button
            type="button"
            onClick={applyFinalTitle}
            className="mt-5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-3 font-bold text-black"
          >
            APPLY JUDGE TWIST
          </button>

          {finalStoryText && (
            <div className="mt-6 rounded-2xl border border-amber-500/20 bg-[#160b06] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                Final story version
              </p>

              <p className="mt-3 text-lg leading-8 text-white/85">
                {finalStoryText}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-4">
          {story.map((entry, index) => (
            <div
              key={`${entry.text}-${index}`}
              className="rounded-2xl border border-amber-500/20 bg-[#211006] p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                  {entry.speaker === 'judge'
                    ? 'Judge'
                    : `Player ${entry.speaker}`}
                </span>

                {entry.speaker !== 'judge' && (
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-bold text-amber-300">
                    {entry.score ?? 0}/10
                  </span>
                )}
              </div>

              <p className="mt-3 text-white/80">
                {entry.text}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <button
            type="button"
            onClick={resetGame}
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-4 text-lg font-bold text-black"
          >
            PLAY AGAIN
          </button>

          <button
            type="button"
            onClick={onExit}
            className="rounded-xl border border-amber-500/40 bg-[#211006] px-6 py-4 text-lg font-bold text-white"
          >
            BACK TO GAMES
          </button>
        </div>
      </div>
    </main>
  )
}

export default StoryChainGame
