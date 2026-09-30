import type { PlayerView } from '../multiplayer/useLobbyState'

type MultiplayerResultsScreenProps = {
  players: Record<string, PlayerView>
  sessionId: string
  onPlayAgain: () => void
  onExit: () => void
  // Lives left per sessionId, when the game has them.
  lives?: Record<string, number>
  // Leave the room entirely.
  onLeave?: () => void
}

type FinalStanding = {
  sessionId: string
  playerName: string
  score: number
  rank: number
}

function MultiplayerResultsScreen({
  players,
  sessionId,
  onPlayAgain,
  onExit,
  lives,
  onLeave,
}: MultiplayerResultsScreenProps) {
  /*
   * Final leaderboard ranking is based
   * only on the accumulated Recall score.
   *
   * Equal totals share the same rank.
   * Player name is used only to keep the
   * display order deterministic.
   */
  const sortedPlayers =
    Object.entries(players)
      .map(
        ([
          playerSessionId,
          player,
        ]) => ({
          sessionId:
            playerSessionId,
          playerName:
            player.name,
          score:
            player.score,
        }),
      )
      .sort(
        (left, right) =>
          right.score -
            left.score ||
          left.playerName.localeCompare(
            right.playerName,
          ),
      )

  let previousScore:
    | number
    | null = null

  let previousRank = 0

  const standings:
    FinalStanding[] =
    sortedPlayers.map(
      (player, index) => {
        const rank =
          previousScore !== null &&
          player.score ===
            previousScore
            ? previousRank
            : index + 1

        previousScore =
          player.score

        previousRank = rank

        return {
          ...player,
          rank,
        }
      },
    )

  const topScore =
    standings[0]?.score

  const winners =
    topScore === undefined
      ? []
      : standings.filter(
          (player) =>
            player.score ===
            topScore,
        )

  const myStanding =
    standings.find(
      (player) =>
        player.sessionId ===
        sessionId,
    )

  const currentPlayer =
    players[sessionId]

  const canPlayAgain =
    currentPlayer?.isHost ?? false

  const winnerTitle =
    winners.length === 1
      ? `${winners[0].playerName} wins!`
      : winners.length > 1
        ? "It's a tie!"
        : 'Game complete'

  const winnerDescription =
    winners.length === 1
      ? `${winners[0].playerName} finished first with ${winners[0].score} points.`
      : winners.length > 1
        ? `${winners
            .map(
              (winner) =>
                winner.playerName,
            )
            .join(
              ', ',
            )} share first place with ${topScore} points.`
        : 'No player scores are available.'

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#0d0704] px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <section className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10">
            <svg
              viewBox="0 0 24 24"
              className="h-10 w-10 text-amber-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M8 21h8" />
              <path d="M12 17v4" />
              <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
              <path d="M7 6H4v2a4 4 0 0 0 4 4" />
              <path d="M17 6h3v2a4 4 0 0 1-4 4" />
            </svg>
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-amber-400">
            Game Complete
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            {winnerTitle}
          </h1>

          <p className="mt-3 text-white/55">
            {winnerDescription}
          </p>

          {myStanding && (
            <div className="mx-auto mt-6 inline-flex items-center gap-3 rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-3">
              <span className="text-white/60">
                Your result
              </span>

              <strong className="text-amber-300">
                #{myStanding.rank}
              </strong>

              <span className="text-white/30">
                •
              </span>

              <strong className="text-white">
                {myStanding.score}{' '}
                pts
              </strong>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-amber-500/30 bg-[#160b06] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
                Final Results
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Final Leaderboard
              </h2>
            </div>

            <span className="text-sm text-white/40">
              {standings.length}{' '}
              {standings.length === 1
                ? 'player'
                : 'players'}
            </span>
          </div>

          {standings.length > 0 ? (
            <div
              data-testid="leaderboard"
              className="mt-6 space-y-3"
            >
              {standings.map(
                (player) => {
                  const isMe =
                    player.sessionId ===
                    sessionId

                  const isWinner =
                    player.rank === 1

                  return (
                    <div
                      key={
                        player.sessionId
                      }
                      data-testid="leaderboard-row"
                      className={`flex items-center justify-between rounded-xl border px-5 py-4 ${
                        isWinner
                          ? 'border-amber-400/50 bg-amber-400/10'
                          : 'border-white/10 bg-[#211006]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full font-black ${
                            isWinner
                              ? 'bg-amber-400 text-black'
                              : 'bg-white/10 text-white/70'
                          }`}
                        >
                          #
                          {player.rank}
                        </div>

                        <div>
                          <p className="font-bold">
                            {
                              player.playerName
                            }

                            {isMe &&
                              ' (You)'}
                          </p>

                          {lives?.[player.sessionId] !== undefined && (
                            <p className="mt-1 text-xs text-white/50">
                              {lives[player.sessionId] > 0
                                ? '❤️'.repeat(lives[player.sessionId])
                                : 'Out of lives'}
                            </p>
                          )}

                          {isWinner && (
                            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
                              {winners.length >
                              1
                                ? 'Joint winner'
                                : 'Winner'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-2xl font-black text-amber-400">
                          {
                            player.score
                          }
                        </span>

                        <span className="ml-1 text-sm text-white/45">
                          pts
                        </span>
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          ) : (
            <p className="mt-6 rounded-xl border border-white/10 bg-[#211006] p-5 text-center text-white/50">
              No player scores
              available.
            </p>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {canPlayAgain ? (
              <button
                type="button"
                onClick={onPlayAgain}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-4 font-bold text-black transition hover:brightness-110"
              >
                PLAY AGAIN
              </button>
            ) : (
              <div
                role="status"
                className="flex items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 px-6 py-4 text-center font-semibold text-amber-200"
              >
                Waiting for host to play again…
              </div>
            )}

            <button
              type="button"
              onClick={onExit}
              className="rounded-xl border border-amber-500/40 bg-[#211006] px-6 py-4 font-bold text-white transition hover:border-amber-400"
            >
              EXIT
            </button>

            {onLeave && (
              <button
                type="button"
                onClick={onLeave}
                className="rounded-xl border border-red-500/30 bg-transparent px-6 py-4 font-bold text-red-400 transition hover:border-red-400 sm:col-span-2"
              >
                LEAVE ROOM
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default MultiplayerResultsScreen