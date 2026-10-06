import { useEffect, useState, type ReactNode } from 'react'
import type { Room } from '@colyseus/sdk'

type GuessAwardsProps = {
  room: Room
}

type Guess = {
  id: string
  sessionId: string
  playerName: string
  answer: string
  word: string
  points: number
}

type VotedGuess = Guess & {
  votes: number
}

type AwardsMessage = {
  best: Guess[]
  funniest: VotedGuess[]
  candidates: VotedGuess[]
}

const MEDALS = ['🥇', '🥈', '🥉']

/*
 * FE-48: Best Guess and Funniest Guess podiums,
 * shown under the final leaderboard. Funniest
 * is voted by the players: one vote each, which
 * they can change, never for their own answer.
 */
function GuessAwards({ room }: GuessAwardsProps) {
  // null until the server sends the podiums.
  const [awards, setAwards] =
    useState<AwardsMessage | null>(null)

  const [myVote, setMyVote] =
    useState<string | null>(null)

  useEffect(() => {
    // Some rooms (e.g. test doubles) can't
    // receive messages; show the loading state.
    if (typeof room.onMessage !== 'function') return

    const removeListener = room.onMessage(
      'guessAwards',
      (message: AwardsMessage) => setAwards(message),
    )

    room.send('requestGuessAwards', {})

    return () => {
      removeListener?.()
    }
  }, [room])

  const vote = (guessId: string) => {
    setMyVote(guessId)
    room.send('voteFunniestGuess', { guessId })
  }

  const nameOf = (guess: Guess) =>
    guess.sessionId === room.sessionId
      ? `${guess.playerName} (you)`
      : guess.playerName

  if (awards === null) {
    return (
      <AwardsShell>
        <p className="text-sm text-white/50">
          Loading podiums…
        </p>
      </AwardsShell>
    )
  }

  return (
    <AwardsShell>
      <h2 className="text-xl font-bold">
        🏆 Best Guess
      </h2>

      {awards.best.length === 0 ? (
        <p className="mt-2 text-sm text-white/50">
          Nobody scored any points this game.
        </p>
      ) : (
        <Podium>
          {awards.best.map((guess, index) => (
            <PodiumSpot
              key={guess.id}
              medal={MEDALS[index]}
              name={nameOf(guess)}
              answer={guess.answer}
              word={guess.word}
              detail={`${guess.points}/4 pts`}
            />
          ))}
        </Podium>
      )}

      <h2 className="mt-8 text-xl font-bold">
        😂 Funniest Guess
      </h2>

      {awards.funniest.length === 0 ? (
        <p className="mt-2 text-sm text-white/50">
          No votes yet. Pick the answer that made you laugh!
        </p>
      ) : (
        <Podium>
          {awards.funniest.map((guess, index) => (
            <PodiumSpot
              key={guess.id}
              medal={MEDALS[index]}
              name={nameOf(guess)}
              answer={guess.answer}
              word={guess.word}
              detail={`${guess.votes} vote${guess.votes === 1 ? '' : 's'}`}
            />
          ))}
        </Podium>
      )}

      {awards.candidates.length === 0 ? (
        <p className="mt-4 text-sm text-white/50">
          Every answer was spot on, so there's nothing to vote for.
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {awards.candidates.map((guess) => {
            const mine = guess.sessionId === room.sessionId
            const voted = myVote === guess.id

            return (
              <li
                key={guess.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-[#211006] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    “{guess.answer}”
                  </p>
                  <p className="text-xs text-white/50">
                    {nameOf(guess)} · word was {guess.word}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm text-amber-300">
                    {guess.votes}
                  </span>

                  <button
                    type="button"
                    disabled={mine}
                    onClick={() => vote(guess.id)}
                    aria-label={`Vote for “${guess.answer}”`}
                    className={`rounded-lg px-3 py-1 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-30 ${
                      voted
                        ? 'bg-amber-400 text-black'
                        : 'border border-amber-400 text-amber-300 hover:bg-amber-500/10'
                    }`}
                  >
                    {voted ? 'Voted' : 'Vote'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </AwardsShell>
  )
}

function Podium({ children }: { children: ReactNode }) {
  return (
    <ol className="mt-4 grid gap-3 sm:grid-cols-3">
      {children}
    </ol>
  )
}

function PodiumSpot({
  medal,
  name,
  answer,
  word,
  detail,
}: {
  medal: string
  name: string
  answer: string
  word: string
  detail: string
}) {
  return (
    <li className="rounded-xl border border-amber-500/30 bg-[#211006] p-4 text-center">
      <p className="text-3xl">{medal}</p>
      <p className="mt-2 font-bold">{name}</p>
      <p className="mt-1 text-amber-200">“{answer}”</p>
      <p className="mt-1 text-xs text-white/50">
        word was {word} · {detail}
      </p>
    </li>
  )
}

// Matches the results screen above it.
function AwardsShell({ children }: { children: ReactNode }) {
  return (
    <section className="bg-[#0d0704] px-6 pb-8 text-white">
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/30 bg-[#160b06] p-6 text-left">
        {children}
      </div>
    </section>
  )
}

export default GuessAwards
