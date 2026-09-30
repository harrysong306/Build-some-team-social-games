import { useEffect, useRef, useState } from 'react'
import type { Room } from '@colyseus/sdk'

/*
 * BE-20 team abilities, voted on during a Recall
 * round. Kept in its own component so the voting
 * UI (FE-39 / FE-40) can be reworked without
 * touching RecallPhase.
 *
 * Server messages:
 *   send     voteAbility      { roundIndex, ability }
 *   receive  abilityVotes     { roundIndex, counts, needed }
 *   receive  abilityActivated { roundIndex, ability, hint? | image?, seconds? }
 */

const ABILITY_OPTIONS = [
  { value: 'hint', label: '💡 Hint' },
  { value: 'reveal', label: '👀 Reveal a drawing' },
] as const

type AbilityVotes = {
  counts: Record<string, number>
  needed: number
}

type TeamAbilitiesProps = {
  room: Room
  roundIndex: number
  roundStarted: boolean
  // e.g. the player is out of lives
  disabled: boolean
  usedAbilities: readonly string[]
}

function TeamAbilities({
  room,
  roundIndex,
  roundStarted,
  disabled,
  usedAbilities,
}: TeamAbilitiesProps) {
  const [votes, setVotes] =
    useState<AbilityVotes | null>(null)

  const [myVote, setMyVote] =
    useState<string | null>(null)

  const [hint, setHint] =
    useState<string | null>(null)

  const [revealImage, setRevealImage] =
    useState<string | null>(null)

  const [revealMissing, setRevealMissing] =
    useState(false)

  const revealTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const removeVotesListener =
      room.onMessage(
        'abilityVotes',
        (message: AbilityVotes & { roundIndex: number }) => {
          if (message.roundIndex !== roundIndex) return

          setVotes({
            counts: message.counts,
            needed: message.needed,
          })
        },
      )

    const removeActivatedListener =
      room.onMessage(
        'abilityActivated',
        (message: {
          roundIndex: number
          ability: string
          hint?: string
          image?: string | null
          seconds?: number
        }) => {
          if (message.roundIndex !== roundIndex) return

          setVotes(null)

          if (message.ability === 'hint') {
            setHint(message.hint ?? null)
            return
          }

          if (!message.image) {
            setRevealMissing(true)
            return
          }

          setRevealImage(
            `data:image/png;base64,${message.image}`,
          )

          revealTimerRef.current =
            window.setTimeout(() => {
              setRevealImage(null)
              revealTimerRef.current = null
            }, (message.seconds ?? 5) * 1000)
        },
      )

    return () => {
      removeVotesListener?.()
      removeActivatedListener?.()

      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current)
      }
    }
  }, [room, roundIndex])

  const activated =
    hint !== null || revealImage !== null || revealMissing

  const vote = (ability: string) => {
    if (disabled || !roundStarted || myVote) return

    room.send('voteAbility', { roundIndex, ability })
    setMyVote(ability)
  }

  return (
    <div className="mt-5">
      {hint && (
        <p className="mb-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm font-semibold text-amber-200">
          💡 {hint}
        </p>
      )}

      {revealImage && (
        <div className="mb-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3">
          <p className="text-xs font-semibold text-amber-300">
            👀 Revealed drawing
          </p>

          <img
            src={revealImage}
            alt="Revealed drawing"
            className="mt-2 max-h-40 w-full rounded-lg bg-[#fffdf7] object-contain"
          />
        </div>
      )}

      {revealMissing && (
        <p className="mb-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          No other drawing of this word to reveal.
        </p>
      )}

      {roundStarted && !disabled && (
        <>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Team abilities
          </p>

          <div className="mt-2 grid grid-cols-2 gap-2">
            {ABILITY_OPTIONS.map((option) => {
              const used = usedAbilities.includes(option.value)
              const count = votes?.counts[option.value] ?? 0

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={used || myVote !== null || activated}
                  onClick={() => vote(option.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:opacity-40 ${
                    myVote === option.value
                      ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                      : 'border-amber-500/30 bg-[#211006] text-white hover:border-amber-400'
                  }`}
                >
                  {option.label}
                  <span className="block text-xs font-normal text-white/50">
                    {used
                      ? 'Used'
                      : votes
                        ? `${count}/${votes.needed} votes`
                        : 'Vote'}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default TeamAbilities
