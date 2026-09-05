export type LeaderboardPlayer = {
  id: string
  name: string
  score: number
  isCurrentPlayer?: boolean
}

type CompetitiveLeaderboardProps = {
  players: LeaderboardPlayer[]
  maxScore: number
}

function CompetitiveLeaderboard({
  players,
  maxScore,
}: CompetitiveLeaderboardProps) {
  const sortedPlayers = [...players].sort(
    (left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return left.name.localeCompare(
        right.name,
      )
    },
  )

  return (
    <aside className="rounded-2xl border border-amber-500/30 bg-[#160b06] p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-400">
            Live Leaderboard
          </p>

          <h2 className="mt-2 text-xl font-bold">
            Current Scores
          </h2>
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">
          MAX {maxScore}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {sortedPlayers.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/50">
              Waiting for player scores...
            </p>
          </div>
        ) : (
          sortedPlayers.map(
            (player, index) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
                  player.isCurrentPlayer
                    ? 'border-amber-400/50 bg-amber-500/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${
                    index === 0
                      ? 'bg-amber-400 text-black'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">
                      {player.name}
                    </p>

                    {player.isCurrentPlayer && (
                      <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                        YOU
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-white/40">
                    Rank #{index + 1}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-amber-400">
                    {player.score}
                  </p>

                  <p className="text-xs text-white/40">
                    pts
                  </p>
                </div>
              </div>
            ),
          )
        )}
      </div>

      <p className="mt-5 text-xs leading-5 text-white/35">
        Scores update during the recall
        round.
      </p>
    </aside>
  )
}

export default CompetitiveLeaderboard