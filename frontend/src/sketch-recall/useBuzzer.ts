import { useEffect, useState } from 'react'
import type { Room } from '@colyseus/sdk'

/*
 * BE-21/22 (buzzer mode): tracks who holds the
 * buzzer in the current Recall round.
 *
 * - buzzerOpen: anyone in `eligible` may buzz.
 *   After a wrong answer or a timeout it also
 *   says why and who had the last turn.
 * - buzzerLocked: one player holds the buzzer
 *   and may answer until `deadline`.
 */
export type BuzzerState = {
  roundIndex: number
  holderId: string | null
  holderName: string
  answerDeadline: number
  eligible: string[]
  lastName: string
  lastReason: 'wrong' | 'timeout' | null
}

const emptyState = (roundIndex: number): BuzzerState => ({
  roundIndex,
  holderId: null,
  holderName: '',
  answerDeadline: 0,
  eligible: [],
  lastName: '',
  lastReason: null,
})

export function useBuzzer(
  room: Room | null,
  roundIndex: number,
  enabled: boolean,
): BuzzerState {
  const [state, setState] = useState<BuzzerState>(() =>
    emptyState(roundIndex),
  )

  useEffect(() => {
    if (!enabled || typeof room?.onMessage !== 'function') return

    const removeOpen = room.onMessage(
      'buzzerOpen',
      (message: {
        roundIndex: number
        eligible: string[]
        reason?: 'wrong' | 'timeout'
        lastSessionId?: string
      }) => {
        setState((current) => {
          const base =
            current.roundIndex === message.roundIndex
              ? current
              : emptyState(message.roundIndex)

          return {
            ...base,
            holderId: null,
            answerDeadline: 0,
            eligible: message.eligible,
            lastName:
              message.lastSessionId &&
              message.lastSessionId === base.holderId
                ? base.holderName
                : '',
            lastReason: message.reason ?? null,
          }
        })
      },
    )

    const removeLocked = room.onMessage(
      'buzzerLocked',
      (message: {
        roundIndex: number
        sessionId: string
        playerName: string
        deadline: number
      }) => {
        setState((current) => ({
          ...(current.roundIndex === message.roundIndex
            ? current
            : emptyState(message.roundIndex)),
          holderId: message.sessionId,
          holderName: message.playerName,
          answerDeadline: message.deadline,
          lastReason: null,
        }))
      },
    )

    return () => {
      removeOpen?.()
      removeLocked?.()
    }
  }, [room, enabled])

  // Messages for an older round don't count.
  return state.roundIndex === roundIndex
    ? state
    : emptyState(roundIndex)
}
